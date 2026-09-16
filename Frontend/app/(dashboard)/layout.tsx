'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useLogoutMutation } from '@/api/auth.api';
import { Button } from '@/components/button';
import { FullPageSpinner } from '@/components/full-page-spinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthSession();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = (): void => {
    logout()
      .unwrap()
      .then(() => router.push('/login'))
      .catch(() => undefined);
  };

  if (isLoading || !isAuthenticated) {
    return <FullPageSpinner />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-sm font-semibold">APIMonitor</span>
        <div className="flex items-center gap-4">
          {user ? <span className="text-sm text-muted-foreground">{user.email}</span> : null}
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
            Log out
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
