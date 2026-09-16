'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/http-client';
import { ApiError } from '@/lib/http/api-error';
import { userKeys } from '@/features/users/api/keys';
import type { CurrentUser } from '@/features/users/types';

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
