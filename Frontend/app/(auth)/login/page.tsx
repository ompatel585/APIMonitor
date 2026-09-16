import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export const metadata: Metadata = { title: 'Log in — APIMonitor' };

export default function LoginPage(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
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
