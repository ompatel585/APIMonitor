'use client';

import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { ResetPasswordFormValues } from '@/schemas/auth/reset-password.schema';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { ErrorMessage } from '@/components/error-message';

type ResetPasswordFieldsProps = {
  form: UseFormReturn<ResetPasswordFormValues>;
  onSubmit: () => void;
  isPending: boolean;
  error?: unknown;
};

export function ResetPasswordFields({ form, onSubmit, isPending, error }: ResetPasswordFieldsProps): React.JSX.Element {
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <ErrorMessage error={error} /> : null}
        <FormField name="newPassword" label="New password" type="password" autoComplete="new-password" />
        <FormField name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </FormProvider>
  );
}
