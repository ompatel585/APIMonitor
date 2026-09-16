'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCurrentOrganizationId } from '@/features/users';
import { useProject } from '@/features/projects';
import { MonitorList } from '@/features/monitors';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { ErrorMessage } from '@/shared/components/error/error-message';

export default function ProjectDetailPage(): React.JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const organizationId = useCurrentOrganizationId();
  const { data: project, isLoading, isError, error } = useProject(organizationId, projectId);

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
      <MonitorList organizationId={organizationId} projectId={projectId} />
    </div>
  );
}
