import { useGetMyMembershipsQuery } from '@/api/users.api';

/**
 * Every user has exactly one organization until an org switcher exists
 * (a later phase). This hook is the single place that assumption lives.
 */
export function useCurrentOrganizationId(): string | undefined {
  const { data: memberships } = useGetMyMembershipsQuery();
  return memberships?.[0]?.organizationId;
}
