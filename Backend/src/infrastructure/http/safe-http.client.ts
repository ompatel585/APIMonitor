import type { LookupFunction } from 'node:net';
import { Injectable } from '@nestjs/common';
import { Agent, fetch as undiciFetch, type Response as UndiciResponse } from 'undici';
import { assertUrlAllowed, SsrfViolationError, type ResolvedTarget } from './ssrf-guard';

export type SafeHttpRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs: number;
  maxRedirects?: number;
  maxResponseBytes?: number;
};

export type SafeHttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  latencyMs: number;
};

const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MiB

function asUint8Array(value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new SsrfViolationError('Received a non-binary chunk while streaming the response body');
  }
  return value;
}

function createPinnedLookup(resolved: ResolvedTarget): LookupFunction {
  return (_hostname, _options, callback) => {
    callback(null, resolved.address, resolved.family);
  };
}

function createPinnedAgent(resolved: ResolvedTarget): Agent {
  return new Agent({
    connect: {
      lookup: createPinnedLookup(resolved),
    },
  });
}

@Injectable()
export class SafeHttpClient {
  async request(rawUrl: string, options: SafeHttpRequestOptions): Promise<SafeHttpResponse> {
    const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

    let currentUrl = rawUrl;
    const startedAt = Date.now();

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const { url, resolved } = await assertUrlAllowed(currentUrl);
      const agent = createPinnedAgent(resolved);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

      try {
        const response = await undiciFetch(url, {
          method: options.method ?? 'GET',
          headers: options.headers,
          body: options.body,
          redirect: 'manual',
          signal: controller.signal,
          dispatcher: agent,
        });

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (!location) {
            throw new SsrfViolationError('Redirect response missing Location header');
          }

          currentUrl = new URL(location, url).toString();
          continue;
        }

        const body = await this.readBodyWithCap(response, maxResponseBytes, controller);

        return {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body,
          latencyMs: Date.now() - startedAt,
        };
      } finally {
        clearTimeout(timeout);
        await agent.close();
      }
    }

    throw new SsrfViolationError(`Exceeded maximum redirects (${maxRedirects})`);
  }

  private async readBodyWithCap(
    response: UndiciResponse,
    maxBytes: number,
    controller: AbortController,
  ): Promise<string> {
    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    for (let step = await reader.read(); !step.done; step = await reader.read()) {
      const value = asUint8Array(step.value);
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        controller.abort();
        throw new SsrfViolationError(`Response exceeded maximum size (${maxBytes} bytes)`);
      }

      chunks.push(value);
    }

    return Buffer.concat(chunks).toString('utf-8');
  }
}
