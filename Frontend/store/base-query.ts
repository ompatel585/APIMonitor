import 'client-only';
import { Mutex } from 'async-mutex';
import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { clientEnv } from '@/lib/env/client';

export type ApiErrorPayload = {
  code: string;
  message: string | string[];
  requestId?: string;
};

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const messageOk =
    typeof candidate.message === 'string' ||
    (Array.isArray(candidate.message) && candidate.message.every((m) => typeof m === 'string'));
  return typeof candidate.code === 'string' && messageOk;
}

export function errorMessage(error: FetchBaseQueryError | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (isApiErrorPayload(error.data)) {
    return Array.isArray(error.data.message) ? error.data.message.join(', ') : error.data.message;
  }
  return 'Something went wrong. Please try again.';
}

type TokenResponse = { accessToken: string };

function isTokenResponse(value: unknown): value is TokenResponse {
  return typeof value === 'object' && value !== null && typeof (value as TokenResponse).accessToken === 'string';
}

// Access tokens live in memory only (never localStorage) — a reload always
// goes through a silent refresh via the httpOnly refresh-token cookie.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function unwrapEnvelope(body: unknown): unknown {
  return body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: clientEnv.NEXT_PUBLIC_API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('x-request-id', crypto.randomUUID());
    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }
    return headers;
  },
});

const refreshMutex = new Mutex();

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  await refreshMutex.waitForUnlock();
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === 'string' ? args : args.url;

  if (result.error?.status === 401 && url !== '/auth/refresh') {
    if (!refreshMutex.isLocked()) {
      const release = await refreshMutex.acquire();
      try {
        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST' },
          api,
          extraOptions,
        );
        const payload = unwrapEnvelope(refreshResult.data);
        if (isTokenResponse(payload)) {
          setAccessToken(payload.accessToken);
        } else {
          setAccessToken(null);
        }
      } finally {
        release();
      }
    } else {
      await refreshMutex.waitForUnlock();
    }

    if (accessToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  if (result.error) {
    return result;
  }

  const payload = unwrapEnvelope(result.data);
  if (isTokenResponse(payload)) {
    setAccessToken(payload.accessToken);
  }

  return { ...result, data: payload };
};
