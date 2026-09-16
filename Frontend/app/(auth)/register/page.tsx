import Link from 'next/link';
import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export const metadata: Metadata = { title: 'Create account — APIMonitor' };

export default function RegisterPage(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start monitoring your APIs in minutes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
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
