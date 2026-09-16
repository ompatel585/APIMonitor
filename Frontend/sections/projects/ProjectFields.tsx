'use client';

import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { ProjectFormValues } from '@/schemas/projects/project-form.schema';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { ErrorMessage } from '@/components/error-message';

type ProjectFieldsProps = {
  form: UseFormReturn<ProjectFormValues>;
  onSubmit: () => void;
  isPending: boolean;
  isEditing: boolean;
  error?: unknown;
};

export function ProjectFields({ form, onSubmit, isPending, isEditing, error }: ProjectFieldsProps): React.JSX.Element {
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <ErrorMessage error={error} /> : null}
        <FormField name="name" label="Project name" />
        <FormField name="description" label="Description (optional)" />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create project'}
        </Button>
      </form>
    </FormProvider>
  );
}
