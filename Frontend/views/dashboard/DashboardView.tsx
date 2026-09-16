'use client';

import Link from 'next/link';
import { useGetCurrentUserQuery } from '@/api/users.api';
import { Button } from '@/components/button';

export function DashboardView(): React.JSX.Element {
  const { data: user } = useGetCurrentUserQuery();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome{user ? `, ${user.displayName}` : ''}</h1>
      <p className="mt-2 text-muted-foreground">Manage the projects and monitors your organization tracks.</p>
      <Button asChild className="mt-4">
        <Link href="/projects">View projects</Link>
      </Button>
    </div>
  );
}
