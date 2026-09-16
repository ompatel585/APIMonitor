'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/use-auth-session';
import { FullPageSpinner } from '@/components/full-page-spinner';

export default function HomePage(): React.JSX.Element {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthSession();

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isLoading, isAuthenticated, router]);

  return <FullPageSpinner />;
}
