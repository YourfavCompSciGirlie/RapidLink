'use client';

import { Cloud, CloudOff, Menu, RadioTower, UsersRound, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { BrandMark } from '@/components/brand-mark';
import { InstallPrompt } from '@/components/install-prompt';
import { useEmergency } from '@/features/emergency/emergency-context';

const links = [{ href: '/client', label: 'Client' }, { href: '/messages', label: 'Responders' }, { href: '/supervisor', label: 'Supervisor' }];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { sessionCode, syncStatus } = useEmergency();
  const [open, setOpen] = useState(false);
  const status = syncStatus === 'offline' ? 'Offline' : syncStatus === 'saved' ? 'Saved locally' : syncStatus === 'syncing' ? 'Synchronizing' : 'Synchronized';
  const StatusIcon = syncStatus === 'offline' ? CloudOff : syncStatus === 'synced' ? Cloud : RadioTower;
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-[0_3px_16px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="RapidLink home" className="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><BrandMark /></Link>
          {sessionCode && <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold tracking-wider text-slate-700 sm:inline">ROOM {sessionCode}</span>}
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Role navigation">{links.map((item) => <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-2 text-sm font-bold ${pathname.startsWith(item.href) ? 'bg-blue-50 text-[#003172]' : 'text-slate-600 hover:bg-slate-50'}`}>{item.label}</Link>)}</nav>
          <span className={`ml-auto flex items-center gap-1.5 text-xs font-bold md:ml-2 ${syncStatus === 'offline' ? 'text-amber-800' : syncStatus === 'synced' ? 'text-emerald-700' : 'text-[#003172]'}`}><StatusIcon className="h-4 w-4" /> {status}</span>
          <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-lg text-[#003172] md:hidden" aria-label="Toggle role menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
        {open && <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden" aria-label="Mobile role navigation"><div className="mx-auto grid max-w-7xl gap-1">{sessionCode && <p className="mb-1 flex items-center gap-2 px-3 text-xs font-extrabold tracking-wider text-slate-500"><UsersRound className="h-4 w-4" /> ROOM {sessionCode}</p>}{links.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-bold text-[#003172] hover:bg-blue-50">{item.label}</Link>)}</div></nav>}
      </header>
      {children}
      <InstallPrompt />
    </div>
  );
}
