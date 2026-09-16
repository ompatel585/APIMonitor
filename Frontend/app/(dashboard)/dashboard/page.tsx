'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/shared/ui/button';

export default function DashboardPage(): React.JSX.Element {
  const { user } = useAuth();

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
