'use client';

import { useParams } from 'next/navigation';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization-id';
import { useGetMonitorQuery } from '@/api/monitors.api';
import { MonitorStatusBadge } from '@/sections/monitors/MonitorStatusBadge';
import { MonitorDetailFacts } from '@/sections/monitors/MonitorDetailFacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Spinner } from '@/components/spinner';
import { ErrorMessage } from '@/components/error-message';

export function MonitorDetailView(): React.JSX.Element {
  const { projectId, monitorId } = useParams<{ projectId: string; monitorId: string }>();
  const organizationId = useCurrentOrganizationId();
  const { data: monitor, isLoading, isError, error } = useGetMonitorQuery(
    { organizationId: organizationId ?? '', projectId, id: monitorId },
    { skip: !organizationId },
  );

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
      <CardContent>
        <MonitorDetailFacts monitor={monitor} />
      </CardContent>
    </Card>
  );
}
