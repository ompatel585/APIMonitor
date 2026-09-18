export const DELIVERY_STATUSES = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  DEAD_LETTERED: 'DEAD_LETTERED',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[keyof typeof DELIVERY_STATUSES];
