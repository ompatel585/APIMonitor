import { useGetCurrentUserQuery, type CurrentUser } from '@/api/users.api';
import { useAppSelector } from '@/store/hooks';

type AuthSession = {
  user: CurrentUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export function useAuthSession(): AuthSession {
  const loggedOut = useAppSelector((state) => state.authUi.loggedOut);
  const { data: user, isLoading } = useGetCurrentUserQuery(undefined, { skip: loggedOut });

  return {
    user: loggedOut ? undefined : user,
    isLoading: loggedOut ? false : isLoading,
    isAuthenticated: loggedOut ? false : Boolean(user),
  };
}
