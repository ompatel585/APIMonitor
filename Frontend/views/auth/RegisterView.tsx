'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth/register.schema';
import { useRegisterMutation } from '@/api/auth.api';
import { RegisterFields } from '@/sections/auth/RegisterFields';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';

export function RegisterView(): React.JSX.Element {
  const router = useRouter();
  const [registerUser, { isLoading, isError, error }] = useRegisterMutation();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', displayName: '', organizationName: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    registerUser(values)
      .unwrap()
      .then(() => router.push('/dashboard'))
      .catch(() => undefined);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start monitoring your APIs in minutes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterFields form={form} onSubmit={onSubmit} isPending={isLoading} error={isError ? error : undefined} />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
