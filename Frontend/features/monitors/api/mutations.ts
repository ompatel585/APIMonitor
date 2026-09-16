'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monitorsService } from '@/services/monitors-client';
import { monitorKeys } from '@/features/monitors/api/keys';
import type { Monitor } from '@/features/monitors/types';
import type { components } from '@/types/api/generated';

type CreateMonitorDto = components['schemas']['CreateMonitorDto'];
type UpdateMonitorDto = components['schemas']['UpdateMonitorDto'];

export function useCreateMonitor(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMonitorDto) => monitorsService.create(organizationId, projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitorKeys.list(organizationId, projectId) });
    },
  });
}

export function useUpdateMonitor(organizationId: string, projectId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMonitorDto) => monitorsService.update(organizationId, projectId, id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitorKeys.list(organizationId, projectId) });
      queryClient.invalidateQueries({ queryKey: monitorKeys.detail(organizationId, projectId, id) });
    },
  });
}

export function useDeleteMonitor(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => monitorsService.remove(organizationId, projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitorKeys.list(organizationId, projectId) });
    },
  });
}

function useToggleMonitor(
  organizationId: string,
  projectId: string,
  action: (id: string) => Promise<Monitor>,
  optimisticStatus: Monitor['status'],
  optimisticIsActive: boolean,
) {
  const queryClient = useQueryClient();
  const listKey = monitorKeys.list(organizationId, projectId);

  return useMutation({
    mutationFn: (id: string) => action(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Monitor[]>(listKey);

      queryClient.setQueryData<Monitor[]>(listKey, (current) =>
        current?.map((monitor) =>
          monitor.id === id
            ? { ...monitor, status: optimisticStatus, isActive: optimisticIsActive }
            : monitor,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function usePauseMonitor(organizationId: string, projectId: string) {
  return useToggleMonitor(
    organizationId,
    projectId,
    (id) => monitorsService.pause(organizationId, projectId, id),
    'PAUSED',
    false,
  );
}

export function useResumeMonitor(organizationId: string, projectId: string) {
  return useToggleMonitor(
    organizationId,
    projectId,
    (id) => monitorsService.resume(organizationId, projectId, id),
    'PENDING',
    true,
  );
}
