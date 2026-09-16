'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/schemas/auth/login.schema';
import { useLoginMutation } from '@/api/auth.api';
import { LoginFields } from '@/sections/auth/LoginFields';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';

export function LoginView(): React.JSX.Element {
  const router = useRouter();
  const [login, { isLoading, isError, error }] = useLoginMutation();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login(values)
      .unwrap()
      .then(() => router.push('/dashboard'))
      .catch(() => undefined);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginFields form={form} onSubmit={onSubmit} isPending={isLoading} error={isError ? error : undefined} />
        <div className="flex justify-between text-sm text-muted-foreground">
          <Link href="/register" className="hover:underline">
            Create an account
          </Link>
          <Link href="/forgot-password" className="hover:underline">
            Forgot password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
