export const MONITOR_STATUS_PRESENTATION = {
  PENDING: { label: 'Pending', tone: 'neutral' },
  UP: { label: 'Up', tone: 'success' },
  DEGRADED: { label: 'Degraded', tone: 'warning' },
  DOWN: { label: 'Down', tone: 'danger' },
  PAUSED: { label: 'Paused', tone: 'neutral' },
} as const;

export type MonitorStatusTone = (typeof MONITOR_STATUS_PRESENTATION)[keyof typeof MONITOR_STATUS_PRESENTATION]['tone'];
