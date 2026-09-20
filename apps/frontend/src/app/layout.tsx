import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { DemoProvider } from '@/features/demo/demo-context';

import './globals.css';

export const metadata: Metadata = {
  title: 'Tshwane RapidLink',
  description: 'Connected emergency response for the City of Tshwane',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
