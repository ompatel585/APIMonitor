'use client';

import Link from 'next/link';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization-id';
import { useListProjectsQuery } from '@/api/projects.api';
import { ProjectListGrid } from '@/sections/projects/ProjectListGrid';
import { ProjectEmptyState } from '@/sections/projects/ProjectEmptyState';
import { ErrorMessage } from '@/components/error-message';
import { Spinner } from '@/components/spinner';
import { Button } from '@/components/button';

export function ProjectListView(): React.JSX.Element {
  const organizationId = useCurrentOrganizationId();
  const { data: projects, isLoading, isError, error } = useListProjectsQuery(
    { organizationId: organizationId ?? '' },
    { skip: !organizationId },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button asChild>
          <Link href="/projects/new">New project</Link>
        </Button>
      </div>

      {isLoading || !organizationId ? (
        <Spinner className="h-6 w-6" />
      ) : isError ? (
        <ErrorMessage error={error} />
      ) : !projects || projects.length === 0 ? (
        <ProjectEmptyState />
      ) : (
        <ProjectListGrid projects={projects} />
      )}
    </div>
  );
}
