'use client';

import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { LoginFormValues } from '@/schemas/auth/login.schema';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { ErrorMessage } from '@/components/error-message';

type LoginFieldsProps = {
  form: UseFormReturn<LoginFormValues>;
  onSubmit: () => void;
  isPending: boolean;
  error?: unknown;
};

export function LoginFields({ form, onSubmit, isPending, error }: LoginFieldsProps): React.JSX.Element {
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <ErrorMessage error={error} /> : null}
        <FormField name="email" label="Email" type="email" autoComplete="email" />
        <FormField name="password" label="Password" type="password" autoComplete="current-password" />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </FormProvider>
  );
}
