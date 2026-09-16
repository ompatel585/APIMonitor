export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (organizationId: string) => [...projectKeys.lists(), organizationId] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (organizationId: string, id: string) => [...projectKeys.details(), organizationId, id] as const,
};
