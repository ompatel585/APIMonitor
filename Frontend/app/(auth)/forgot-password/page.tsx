import Link from 'next/link';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export const metadata: Metadata = { title: 'Forgot password — APIMonitor' };

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>We&apos;ll email you a link to reset it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
