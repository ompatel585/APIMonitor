import type { Metadata } from 'next';
import { AppProviders } from '@/providers/app-providers';
import { Toaster } from '@/shared/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'APIMonitor',
  description: 'API and uptime monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
