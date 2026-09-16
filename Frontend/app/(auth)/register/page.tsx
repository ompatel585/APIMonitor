import type { Metadata } from 'next';
import { RegisterView } from '@/views/auth/RegisterView';

export const metadata: Metadata = { title: 'Create account — APIMonitor' };

export default function RegisterPage(): React.JSX.Element {
  return <RegisterView />;
}
