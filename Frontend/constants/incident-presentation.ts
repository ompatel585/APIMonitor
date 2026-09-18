export const INCIDENT_STATUS_PRESENTATION = {
  OPEN: { label: 'Open', tone: 'danger' },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'warning' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
} as const;

export const INCIDENT_CAUSE_LABELS = {
  TIMEOUT: 'Timeout',
  CONNECTION_ERROR: 'Connection error',
  TLS_ERROR: 'TLS error',
  STATUS_CODE: 'Unexpected status code',
  ASSERTION_FAILED: 'Assertion failed',
  DEGRADED: 'Degraded',
} as const;

export const INCIDENT_SEVERITY_PRESENTATION = {
  MINOR: { label: 'Minor', tone: 'neutral' },
  MAJOR: { label: 'Major', tone: 'warning' },
  CRITICAL: { label: 'Critical', tone: 'danger' },
} as const;

export const INCIDENT_EVENT_LABELS = {
  OPENED: 'Incident opened',
  FAILURE_OBSERVED: 'Failure observed',
  ACKNOWLEDGED: 'Acknowledged',
  COMMENT_ADDED: 'Comment added',
  RESOLVED: 'Resolved',
  AUTO_RESOLVED: 'Automatically resolved',
} as const;

export type IncidentTone =
  (typeof INCIDENT_STATUS_PRESENTATION)[keyof typeof INCIDENT_STATUS_PRESENTATION]['tone'];
