'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization-id';
import { useCreateProjectMutation } from '@/api/projects.api';
import { projectFormSchema, type ProjectFormValues } from '@/schemas/projects/project-form.schema';
import { ProjectFields } from '@/sections/projects/ProjectFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Spinner } from '@/components/spinner';

export function ProjectCreateView(): React.JSX.Element {
  const router = useRouter();
  const organizationId = useCurrentOrganizationId();
  const [createProject, { isLoading, isError, error }] = useCreateProjectMutation();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (!organizationId) return;
    createProject({ organizationId, body: values })
      .unwrap()
      .then((result) => router.push(`/projects/${result.id}`))
      .catch(() => undefined);
  });

  if (!organizationId) {
    return <Spinner className="h-6 w-6" />;
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>New project</CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectFields form={form} onSubmit={onSubmit} isPending={isLoading} isEditing={false} error={isError ? error : undefined} />
      </CardContent>
    </Card>
  );
}
