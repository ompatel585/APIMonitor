'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/use-auth-session';

export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthSession();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
