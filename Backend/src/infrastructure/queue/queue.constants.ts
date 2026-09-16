export const QUEUE_NAMES = {
  MONITOR_CHECK: 'monitor-check',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function monitorCheckJobId(monitorId: string): string {
  return `monitor:${monitorId}`;
}
