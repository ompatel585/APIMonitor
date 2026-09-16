'use client';

import { useAuth } from '@/providers/auth-provider';

export default function DashboardPage(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome{user ? `, ${user.displayName}` : ''}</h1>
      <p className="mt-2 text-muted-foreground">Your projects and monitors will appear here.</p>
    </div>
  );
}
