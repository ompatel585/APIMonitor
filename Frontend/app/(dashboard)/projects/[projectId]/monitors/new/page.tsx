'use client';

import { useParams } from 'next/navigation';
import { useCurrentOrganizationId } from '@/features/users';
import { MonitorForm } from '@/features/monitors';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Spinner } from '@/shared/ui/spinner';

export default function NewMonitorPage(): React.JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const organizationId = useCurrentOrganizationId();

  if (!organizationId) {
    return <Spinner className="h-6 w-6" />;
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>New monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <MonitorForm organizationId={organizationId} projectId={projectId} />
      </CardContent>
    </Card>
  );
}
