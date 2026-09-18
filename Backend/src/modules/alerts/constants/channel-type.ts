export const CHANNEL_TYPES = {
  EMAIL: 'EMAIL',
  WEBHOOK: 'WEBHOOK',
} as const;

export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];

export const CHANNEL_VERIFICATION_STATUSES = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
} as const;

export type ChannelVerificationStatus =
  (typeof CHANNEL_VERIFICATION_STATUSES)[keyof typeof CHANNEL_VERIFICATION_STATUSES];
