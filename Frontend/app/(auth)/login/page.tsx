import type { Metadata } from 'next';
import { LoginView } from '@/views/auth/LoginView';

export const metadata: Metadata = { title: 'Log in — APIMonitor' };

export default function LoginPage(): React.JSX.Element {
  return <LoginView />;
}
