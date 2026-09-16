'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/schemas/reset-password.schema';
import { useConfirmPasswordReset } from '@/features/auth/api/mutations';
import { FormField } from '@/shared/ui/form-field';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/components/error/error-message';

export function ResetPasswordForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const confirmReset = useConfirmPasswordReset();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    confirmReset.mutate(
      { token: values.token, newPassword: values.newPassword },
      { onSuccess: () => router.push('/login?reset=1') },
    );
  });

  if (!token) {
    return <ErrorMessage error={new Error('This password reset link is invalid or has expired.')} />;
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {confirmReset.isError ? <ErrorMessage error={confirmReset.error} /> : null}
        <FormField name="newPassword" label="New password" type="password" autoComplete="new-password" />
        <FormField name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={confirmReset.isPending}>
          {confirmReset.isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </FormProvider>
  );
}
