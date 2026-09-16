'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/http-client';
import { ApiError } from '@/lib/http/api-error';
import { userKeys } from '@/features/users/api/keys';
import type { CurrentUser, Membership } from '@/features/users/types';

export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => httpClient.get<CurrentUser>('/users/me'),
    retry: (failureCount, error) => {
      if (ApiError.isApiError(error) && error.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 60_000,
  });
}

export function useMyMemberships() {
  return useQuery({
    queryKey: userKeys.myMemberships(),
    queryFn: () => httpClient.get<Membership[]>('/users/me/memberships'),
    retry: (failureCount, error) => {
      if (ApiError.isApiError(error) && error.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Every user has exactly one organization until an org switcher exists
 * (a later phase). This hook is the single place that assumption lives.
 */
export function useCurrentOrganizationId(): string | undefined {
  const { data: memberships } = useMyMemberships();
  return memberships?.[0]?.organizationId;
}
