import type { SafeHttpResponse } from '@infrastructure/http/safe-http.client';
import { SsrfViolationError } from '@infrastructure/http/ssrf-guard';
import { INCIDENT_CAUSES, type IncidentCause } from '@modules/incidents/constants/incident-cause';

const MAX_ERROR_MESSAGE_LENGTH = 500;

export type CheckResult = {
  succeeded: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  cause: IncidentCause | null;
};

/**
 * Pure: turns a raw HTTP response (or the fact that the request itself threw)
 * into the outcome the rest of the pipeline reasons about. This is distinct
 * from `monitors/services/monitor-status-evaluator.ts`, which evaluates a
 * *history* of these outcomes into a status transition — this evaluates one.
 *
 * Failure classification happens exactly once, here — `incidents` stores the
 * `cause` it is given and never re-derives it (incidents/CLAUDE.md §3).
 */
export function evaluateResponse(response: SafeHttpResponse, expectedStatusCodes: number[]): CheckResult {
  const succeeded = expectedStatusCodes.includes(response.statusCode);
  return {
    succeeded,
    statusCode: response.statusCode,
    latencyMs: response.latencyMs,
    errorMessage: succeeded ? null : truncate(`Unexpected status code ${response.statusCode}`),
    cause: succeeded ? null : INCIDENT_CAUSES.STATUS_CODE,
  };
}

export function evaluateFailure(error: unknown, latencyMs: number): CheckResult {
  return {
    succeeded: false,
    statusCode: null,
    latencyMs,
    errorMessage: truncate(error instanceof Error ? error.message : 'Unknown error'),
    cause: classifyFailure(error),
  };
}

function classifyFailure(error: unknown): IncidentCause {
  if (error instanceof SsrfViolationError) {
    return INCIDENT_CAUSES.CONNECTION_ERROR;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError' || /timeout/i.test(error.message)) {
      return INCIDENT_CAUSES.TIMEOUT;
    }
    if (/certificate|SSL|TLS/i.test(error.message)) {
      return INCIDENT_CAUSES.TLS_ERROR;
    }
  }
  return INCIDENT_CAUSES.CONNECTION_ERROR;
}

function truncate(message: string): string {
  return message.length > MAX_ERROR_MESSAGE_LENGTH ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1)}…` : message;
}
