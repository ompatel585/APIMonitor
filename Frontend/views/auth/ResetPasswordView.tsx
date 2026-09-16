'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas/auth/reset-password.schema';
import { useConfirmPasswordResetMutation } from '@/api/auth.api';
import { ResetPasswordFields } from '@/sections/auth/ResetPasswordFields';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { ErrorMessage } from '@/components/error-message';

export function ResetPasswordView(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [confirmReset, { isLoading, isError, error }] = useConfirmPasswordResetMutation();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    confirmReset({ token: values.token, newPassword: values.newPassword })
      .unwrap()
      .then(() => router.push('/login?reset=1'))
      .catch(() => undefined);
  });

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorMessage error={new Error('This password reset link is invalid or has expired.')} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordFields form={form} onSubmit={onSubmit} isPending={isLoading} error={isError ? error : undefined} />
      </CardContent>
    </Card>
  );
}
