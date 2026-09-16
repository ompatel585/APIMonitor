'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas/auth/forgot-password.schema';
import { useRequestPasswordResetMutation } from '@/api/auth.api';
import { ForgotPasswordFields } from '@/sections/auth/ForgotPasswordFields';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';

export function ForgotPasswordView(): React.JSX.Element {
  const [requestReset, { isLoading, isSuccess, isError, error }] = useRequestPasswordResetMutation();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    requestReset(values);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>We&apos;ll email you a link to reset it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordFields
          form={form}
          onSubmit={onSubmit}
          isPending={isLoading}
          isSuccess={isSuccess}
          error={isError ? error : undefined}
        />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
