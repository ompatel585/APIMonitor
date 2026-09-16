'use client';

import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { RegisterFormValues } from '@/schemas/auth/register.schema';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { ErrorMessage } from '@/components/error-message';

type RegisterFieldsProps = {
  form: UseFormReturn<RegisterFormValues>;
  onSubmit: () => void;
  isPending: boolean;
  error?: unknown;
};

export function RegisterFields({ form, onSubmit, isPending, error }: RegisterFieldsProps): React.JSX.Element {
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <ErrorMessage error={error} /> : null}
        <FormField name="displayName" label="Your name" autoComplete="name" />
        <FormField name="organizationName" label="Organization name" autoComplete="organization" />
        <FormField name="email" label="Email" type="email" autoComplete="email" />
        <FormField name="password" label="Password" type="password" autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </FormProvider>
  );
}
