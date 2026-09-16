import 'client-only';
import { clientEnv } from '@/lib/env/client';
import { ApiError, type ApiErrorPayload } from '@/lib/http/api-error';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  skipAuth?: boolean;
};

type TokenResponse = { accessToken: string };

// Access tokens live in memory only (never localStorage) — a reload always
// goes through a silent refresh via the httpOnly refresh-token cookie.
let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function createRequestId(): string {
  return crypto.randomUUID();
}

function isTokenResponse(value: unknown): value is TokenResponse {
  return typeof value === 'object' && value !== null && typeof (value as TokenResponse).accessToken === 'string';
}

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-request-id': createRequestId() },
    })
      .then(async (res) => {
        if (!res.ok) {
          setAccessToken(null);
          return false;
        }
        const body: unknown = await res.json();
        const payload = body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body;
        if (isTokenResponse(payload)) {
          setAccessToken(payload.accessToken);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function parseErrorPayload(res: Response): Promise<ApiErrorPayload> {
  try {
    const body: unknown = await res.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'object'
    ) {
      return (body as { error: ApiErrorPayload }).error;
    }
  } catch {
    // fall through to generic payload
  }
  return { code: 'UNKNOWN_ERROR', message: res.statusText || 'Request failed' };
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-request-id': createRequestId(),
  };
  if (accessToken && !options.skipAuth) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    signal: options.signal,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && !isRetry && path !== '/auth/refresh') {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, options, true);
    }
  }

  if (!res.ok) {
    const payload = await parseErrorPayload(res);
    throw new ApiError(res.status, payload);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body: unknown = await res.json();
  const payload = body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body;

  if (isTokenResponse(payload)) {
    setAccessToken(payload.accessToken);
  }

  return payload as T;
}

export const httpClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PATCH', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'DELETE', signal }),
};
