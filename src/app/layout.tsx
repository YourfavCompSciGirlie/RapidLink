import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { EmergencyProvider } from '@/features/emergency/emergency-context';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'RapidLink', template: '%s · RapidLink' },
  description: 'One press connects a person in distress with available responders.',
  applicationName: 'RapidLink',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'RapidLink' },
};

export const viewport: Viewport = { themeColor: '#003172', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><EmergencyProvider><AppShell>{children}</AppShell></EmergencyProvider></body></html>;
}
