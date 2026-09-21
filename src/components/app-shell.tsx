import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { BrandMark } from '@/components/brand-mark';
import { InstallPrompt } from '@/components/install-prompt';
import { useEmergency } from '@/features/emergency/emergency-context';

export function AppShell({ children }: { children: ReactNode }) {
  const { sessionCode, syncStatus } = useEmergency();
  const status = syncStatus === 'offline' ? 'Offline' : syncStatus === 'saved' ? 'Saved locally' : syncStatus === 'syncing' ? 'Synchronizing' : 'Synchronized';
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-[0_3px_16px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="RapidLink session" className="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><BrandMark /></Link>
          <div className="ml-auto text-right text-xs font-bold">
            {sessionCode && <p className="text-slate-700">Room {sessionCode}</p>}
            <p className={syncStatus === 'offline' ? 'text-amber-800' : syncStatus === 'synced' ? 'text-emerald-700' : 'text-[#003172]'}>{status}</p>
          </div>
        </div>
      </header>
      {children}
      <InstallPrompt />
    </div>
  );
}
