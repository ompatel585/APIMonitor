'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectFormSchema, type ProjectFormValues } from '@/features/projects/schemas/project-form.schema';
import { useCreateProject, useUpdateProject } from '@/features/projects/api/mutations';
import type { Project } from '@/features/projects/types';
import { FormField } from '@/shared/ui/form-field';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/components/error/error-message';

type ProjectFormProps = {
  organizationId: string;
  project?: Project;
};

export function ProjectForm({ organizationId, project }: ProjectFormProps): React.JSX.Element {
  const router = useRouter();
  const create = useCreateProject(organizationId);
  const update = useUpdateProject(organizationId, project?.id ?? '');
  const mutation = project ? update : create;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: project?.name ?? '', description: project?.description ?? '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: (result) => router.push(`/projects/${project ? project.id : result.id}`),
    });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {mutation.isError ? <ErrorMessage error={mutation.error} /> : null}
        <FormField name="name" label="Project name" />
        <FormField name="description" label="Description (optional)" />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </Button>
      </form>
    </FormProvider>
  );
}
