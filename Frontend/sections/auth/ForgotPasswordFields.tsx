'use client';

import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { ForgotPasswordFormValues } from '@/schemas/auth/forgot-password.schema';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { ErrorMessage } from '@/components/error-message';

type ForgotPasswordFieldsProps = {
  form: UseFormReturn<ForgotPasswordFormValues>;
  onSubmit: () => void;
  isPending: boolean;
  isSuccess: boolean;
  error?: unknown;
};

export function ForgotPasswordFields({
  form,
  onSubmit,
  isPending,
  isSuccess,
  error,
}: ForgotPasswordFieldsProps): React.JSX.Element {
  if (isSuccess) {
    return (
      <p className="text-sm text-muted-foreground">
        If an account exists for that email, we&apos;ve sent a link to reset your password.
      </p>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <ErrorMessage error={error} /> : null}
        <FormField name="email" label="Email" type="email" autoComplete="email" />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </FormProvider>
  );
}
