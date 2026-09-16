'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services/projects-client';
import { projectKeys } from '@/features/projects/api/keys';
import type { components } from '@/types/api/generated';

type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];

export function useCreateProject(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectDto) => projectsService.create(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(organizationId) });
    },
  });
}

export function useUpdateProject(organizationId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectDto) => projectsService.update(organizationId, id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(organizationId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(organizationId, id) });
    },
  });
}

export function useDeleteProject(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsService.remove(organizationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(organizationId) });
    },
  });
}
