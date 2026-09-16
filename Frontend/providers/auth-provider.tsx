'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { useCurrentUser } from '@/features/users/api/queries';
import type { CurrentUser } from '@/features/users/types';

type AuthContextValue = {
  user: CurrentUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  markLoggedOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [loggedOut, setLoggedOut] = useState(false);
  const { data: user, isLoading } = useCurrentUser();

  const markLoggedOut = useCallback(() => {
    setLoggedOut(true);
  }, []);

  // A fresh successful fetch of the current user means we are logged in
  // again (register/login) — clear the sticky flag so it doesn't linger.
  if (loggedOut && user) {
    setLoggedOut(false);
  }

  const value: AuthContextValue = {
    user: loggedOut ? undefined : user,
    isLoading: loggedOut ? false : isLoading,
    isAuthenticated: loggedOut ? false : Boolean(user),
    markLoggedOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
