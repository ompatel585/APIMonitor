export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  myMemberships: () => [...userKeys.all, 'me', 'memberships'] as const,
};
