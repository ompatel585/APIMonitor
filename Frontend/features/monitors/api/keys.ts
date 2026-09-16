export const monitorKeys = {
  all: ['monitors'] as const,
  lists: () => [...monitorKeys.all, 'list'] as const,
  list: (organizationId: string, projectId: string) =>
    [...monitorKeys.lists(), organizationId, projectId] as const,
  details: () => [...monitorKeys.all, 'detail'] as const,
  detail: (organizationId: string, projectId: string, id: string) =>
    [...monitorKeys.details(), organizationId, projectId, id] as const,
};
