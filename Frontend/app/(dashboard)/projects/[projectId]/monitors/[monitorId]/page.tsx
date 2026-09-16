'use client';

import { useParams } from 'next/navigation';
import { useCurrentOrganizationId } from '@/features/users';
import { useMonitor, MonitorStatusBadge } from '@/features/monitors';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Spinner } from '@/shared/ui/spinner';
import { ErrorMessage } from '@/shared/components/error/error-message';

export default function MonitorDetailPage(): React.JSX.Element {
  const { projectId, monitorId } = useParams<{ projectId: string; monitorId: string }>();
  const organizationId = useCurrentOrganizationId();
  const { data: monitor, isLoading, isError, error } = useMonitor(organizationId, projectId, monitorId);

  if (isLoading || !organizationId) {
    return <Spinner className="h-6 w-6" />;
  }

  if (isError || !monitor) {
    return <ErrorMessage error={error} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{monitor.name}</CardTitle>
          <MonitorStatusBadge status={monitor.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">URL:</span> {monitor.method} {monitor.url}
        </p>
        <p>
          <span className="text-muted-foreground">Interval:</span> every {monitor.intervalSeconds}s
        </p>
        <p>
          <span className="text-muted-foreground">Timeout:</span> {monitor.timeoutMs}ms
        </p>
        <p>
          <span className="text-muted-foreground">Expected status codes:</span>{' '}
          {monitor.expectedStatusCodes.join(', ')}
        </p>
        <p>
          <span className="text-muted-foreground">Last check:</span>{' '}
          {monitor.lastCheckAt ? new Date(monitor.lastCheckAt).toLocaleString() : 'Never'}
        </p>
      </CardContent>
    </Card>
  );
}
