import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'APIMonitor',
  description: 'API and uptime monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
