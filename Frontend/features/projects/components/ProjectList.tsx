'use client';

import Link from 'next/link';
import { useProjectList } from '@/features/projects/api/queries';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { ErrorMessage } from '@/shared/components/error/error-message';
import { Spinner } from '@/shared/ui/spinner';
import { Button } from '@/shared/ui/button';

export function ProjectList({ organizationId }: { organizationId: string | undefined }): React.JSX.Element {
  const { data: projects, isLoading, isError, error } = useProjectList(organizationId);

  if (isLoading) {
    return <Spinner className="h-6 w-6" />;
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="space-y-3 rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No projects yet.</p>
        <Button asChild>
          <Link href="/projects/new">Create your first project</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
