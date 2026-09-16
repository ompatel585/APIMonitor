import type { Metadata } from 'next';
import { ForgotPasswordView } from '@/views/auth/ForgotPasswordView';

export const metadata: Metadata = { title: 'Forgot password — APIMonitor' };

export default function ForgotPasswordPage(): React.JSX.Element {
  return <ForgotPasswordView />;
}
