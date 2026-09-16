import type { components } from '@/types/api/generated';

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  createdAt: string;
};

export type Membership = components['schemas']['MembershipResponseDto'];
