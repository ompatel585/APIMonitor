'use client';

import { useCurrentOrganizationId } from '@/features/users';
import { ProjectForm } from '@/features/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Spinner } from '@/shared/ui/spinner';

export default function NewProjectPage(): React.JSX.Element {
  const organizationId = useCurrentOrganizationId();

  if (!organizationId) {
    return <Spinner className="h-6 w-6" />;
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>New project</CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectForm organizationId={organizationId} />
      </CardContent>
    </Card>
  );
}
