import type { SafeHttpResponse } from '@infrastructure/http/safe-http.client';

const MAX_ERROR_MESSAGE_LENGTH = 500;

export type CheckResult = {
  succeeded: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
};

/**
 * Pure: turns a raw HTTP response (or the fact that the request itself threw)
 * into the outcome the rest of the pipeline reasons about. This is distinct
 * from `monitors/services/monitor-status-evaluator.ts`, which evaluates a
 * *history* of these outcomes into a status transition — this evaluates one.
 */
export function evaluateResponse(response: SafeHttpResponse, expectedStatusCodes: number[]): CheckResult {
  const succeeded = expectedStatusCodes.includes(response.statusCode);
  return {
    succeeded,
    statusCode: response.statusCode,
    latencyMs: response.latencyMs,
    errorMessage: succeeded ? null : truncate(`Unexpected status code ${response.statusCode}`),
  };
}

export function evaluateFailure(error: unknown, latencyMs: number): CheckResult {
  return {
    succeeded: false,
    statusCode: null,
    latencyMs,
    errorMessage: truncate(error instanceof Error ? error.message : 'Unknown error'),
  };
}

function truncate(message: string): string {
  return message.length > MAX_ERROR_MESSAGE_LENGTH ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1)}…` : message;
}
