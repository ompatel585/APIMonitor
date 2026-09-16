'use client';

import { useQuery } from '@tanstack/react-query';
import { monitorsService } from '@/services/monitors-client';
import { monitorKeys } from '@/features/monitors/api/keys';

export function useMonitorList(organizationId: string | undefined, projectId: string) {
  return useQuery({
    queryKey: monitorKeys.list(organizationId ?? '', projectId),
    queryFn: () => monitorsService.list(organizationId as string, projectId),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });
}

export function useMonitor(organizationId: string | undefined, projectId: string, id: string) {
  return useQuery({
    queryKey: monitorKeys.detail(organizationId ?? '', projectId, id),
    queryFn: () => monitorsService.get(organizationId as string, projectId, id),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });
}
