export const QUEUE_NAMES = {
  MONITOR_CHECK: 'monitor-check',
  NOTIFICATION: 'notification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function monitorCheckJobId(monitorId: string): string {
  return `monitor:${monitorId}`;
}

/**
 * Deterministic id for a notification delivery job — repeated delivery of the
 * same alert/channel pair replaces rather than duplicates the queued job.
 */
export function notificationJobId(alertId: string, channelId: string): string {
  return `notification:${alertId}:${channelId}`;
}

/**
 * Deterministic id for an escalation delayed job so it is addressable for
 * cancellation on acknowledgement/resolution (alerts/CLAUDE.md §5). Keyed by
 * incident and rule — one pending escalation per rule per incident.
 */
export function escalationJobId(incidentId: string, ruleId: string): string {
  return `escalation:${incidentId}:${ruleId}`;
}
