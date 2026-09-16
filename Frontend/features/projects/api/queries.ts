'use client';

import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/services/projects-client';
import { projectKeys } from '@/features/projects/api/keys';

export function useProjectList(organizationId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.list(organizationId ?? ''),
    queryFn: () => projectsService.list(organizationId as string),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });
}

export function useProject(organizationId: string | undefined, id: string) {
  return useQuery({
    queryKey: projectKeys.detail(organizationId ?? '', id),
    queryFn: () => projectsService.get(organizationId as string, id),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });
}
