'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization-id';
import { useGetProjectQuery } from '@/api/projects.api';
import { useListMonitorsQuery, usePauseMonitorMutation, useResumeMonitorMutation } from '@/api/monitors.api';
import { MonitorTable } from '@/sections/monitors/MonitorTable';
import { MonitorEmptyState } from '@/sections/monitors/MonitorEmptyState';
import { Button } from '@/components/button';
import { Spinner } from '@/components/spinner';
import { ErrorMessage } from '@/components/error-message';

export function ProjectDetailView(): React.JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const organizationId = useCurrentOrganizationId();

  const { data: project, isLoading, isError, error } = useGetProjectQuery(
    { organizationId: organizationId ?? '', id: projectId },
    { skip: !organizationId },
  );

  const scope = { organizationId: organizationId ?? '', projectId };
  const { data: monitors, isLoading: monitorsLoading } = useListMonitorsQuery(scope, { skip: !organizationId });
  const [pauseMonitor, { isLoading: isPausing, originalArgs: pauseArgs }] = usePauseMonitorMutation();
  const [resumeMonitor, { isLoading: isResuming, originalArgs: resumeArgs }] = useResumeMonitorMutation();

  const busyMonitorId = isPausing ? pauseArgs?.id : isResuming ? resumeArgs?.id : undefined;

  if (isLoading || !organizationId) {
    return <Spinner className="h-6 w-6" />;
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project?.name}</h1>
          {project?.description ? <p className="text-muted-foreground">{project.description}</p> : null}
        </div>
        <Button asChild>
          <Link href={`/projects/${projectId}/monitors/new`}>New monitor</Link>
        </Button>
      </div>

      {monitorsLoading ? (
        <Spinner className="h-6 w-6" />
      ) : !monitors || monitors.length === 0 ? (
        <MonitorEmptyState projectId={projectId} />
      ) : (
        <MonitorTable
          monitors={monitors}
          projectId={projectId}
          busyMonitorId={busyMonitorId}
          onPause={(id) => pauseMonitor({ ...scope, id })}
          onResume={(id) => resumeMonitor({ ...scope, id })}
        />
      )}
    </div>
  );
}
