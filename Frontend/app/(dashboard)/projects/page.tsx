'use client';

import Link from 'next/link';
import { useCurrentOrganizationId } from '@/features/users';
import { ProjectList } from '@/features/projects';
import { Button } from '@/shared/ui/button';

export default function ProjectsPage(): React.JSX.Element {
  const organizationId = useCurrentOrganizationId();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button asChild>
          <Link href="/projects/new">New project</Link>
        </Button>
      </div>
      <ProjectList organizationId={organizationId} />
    </div>
  );
}
