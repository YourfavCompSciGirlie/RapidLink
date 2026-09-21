import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { BrandMark } from '@/components/brand-mark';
import { InstallPrompt } from '@/components/install-prompt';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-[0_3px_16px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="RapidLink" className="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><BrandMark /></Link>
        </div>
      </header>
      {children}
      <InstallPrompt />
    </div>
  );
}
