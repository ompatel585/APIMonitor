import type { Metadata } from 'next';
import { ResetPasswordView } from '@/views/auth/ResetPasswordView';

export const metadata: Metadata = { title: 'Reset password — APIMonitor' };

export default function ResetPasswordPage(): React.JSX.Element {
  return <ResetPasswordView />;
}
