import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http/api-error';

const NON_RETRYABLE_STATUSES = new Set([401, 403, 404, 422]);

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (ApiError.isApiError(error) && NON_RETRYABLE_STATUSES.has(error.status)) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
