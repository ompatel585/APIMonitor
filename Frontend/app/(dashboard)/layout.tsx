'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useLogout } from '@/features/auth';
import { Button } from '@/shared/ui/button';
import { FullPageSpinner } from '@/shared/components/loading/full-page-spinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = (): void => {
    logout.mutate(undefined, { onSuccess: () => router.push('/login') });
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
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={logout.isPending}>
            Log out
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
