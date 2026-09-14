import { isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';

export const ALLOWED_SCHEMES = ['http:', 'https:'];

export class SsrfViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfViolationError';
  }
}

function isPrivateOrReservedIPv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  const [a, b] = octets;

  if (a === undefined || b === undefined) return true;

  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 0) return true; // "this" network
  if (a >= 224) return true; // multicast/reserved

  return false;
}

function isPrivateOrReservedIPv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::1') return true; // loopback
  if (normalized.startsWith('fe80:')) return true; // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique-local
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.split(':').pop();
    if (ipv4Part && isIP(ipv4Part) === 4) {
      return isPrivateOrReservedIPv4(ipv4Part);
    }
  }

  return false;
}

export function isPrivateOrReservedAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) return isPrivateOrReservedIPv4(address);
  if (version === 6) return isPrivateOrReservedIPv6(address);

  return true;
}

export function assertAllowedScheme(url: URL): void {
  if (!ALLOWED_SCHEMES.includes(url.protocol)) {
    throw new SsrfViolationError(`Scheme not allowed: ${url.protocol}`);
  }
}

export type ResolvedTarget = {
  address: string;
  family: 4 | 6;
};

export async function resolveAndAssertAllowed(hostname: string): Promise<ResolvedTarget> {
  if (isIP(hostname)) {
    if (isPrivateOrReservedAddress(hostname)) {
      throw new SsrfViolationError(`Address is private or reserved: ${hostname}`);
    }
    return { address: hostname, family: isIP(hostname) === 6 ? 6 : 4 };
  }

  const { address, family } = await dnsLookup(hostname);

  if (isPrivateOrReservedAddress(address)) {
    throw new SsrfViolationError(`Resolved address is private or reserved: ${hostname} -> ${address}`);
  }

  return { address, family: family === 6 ? 6 : 4 };
}

export async function assertUrlAllowed(rawUrl: string): Promise<{ url: URL; resolved: ResolvedTarget }> {
  const url = new URL(rawUrl);
  assertAllowedScheme(url);
  const resolved = await resolveAndAssertAllowed(url.hostname);
  return { url, resolved };
}
