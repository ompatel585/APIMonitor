'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas/forgot-password.schema';
import { useRequestPasswordReset } from '@/features/auth/api/mutations';
import { FormField } from '@/shared/ui/form-field';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/components/error/error-message';

export function ForgotPasswordForm(): React.JSX.Element {
  const requestReset = useRequestPasswordReset();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    requestReset.mutate(values);
  });

  if (requestReset.isSuccess) {
    return (
      <p className="text-sm text-muted-foreground">
        If an account exists for that email, we&apos;ve sent a link to reset your password.
      </p>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {requestReset.isError ? <ErrorMessage error={requestReset.error} /> : null}
        <FormField name="email" label="Email" type="email" autoComplete="email" />
        <Button type="submit" className="w-full" disabled={requestReset.isPending}>
          {requestReset.isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </FormProvider>
  );
}
