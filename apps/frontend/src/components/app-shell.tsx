'use client';

import { Activity, BarChart3, Headphones, Home, Radio, RotateCcw, Siren } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/features/demo/demo-context';
import { cn } from '@/lib/utils';

const roles = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/citizen', label: 'Citizen', icon: Siren },
  { href: '/dispatcher', label: 'Dispatch', icon: Headphones },
  { href: '/responder', label: 'Respond', icon: Radio },
  { href: '/analytics', label: 'Analyse', icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { incident, resetScenario, scenarioStarted } = useDemo();

  return (
    <div className="min-h-screen bg-[#f5f6f4]">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="RapidLink home">
            <BrandMark />
          </Link>

          <div className="ml-auto hidden items-center gap-1 rounded-xl bg-slate-100 p-1 md:flex">
            {roles.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              const resolvedHref =
                href === '/citizen' && pathname !== '/citizen' && scenarioStarted
                  ? `/citizen/incidents/${incident.reference}`
                  : href === '/dispatcher' && scenarioStarted
                    ? `/dispatcher?incident=${incident.id}`
                    : href;
              return (
                <Link
                  key={href}
                  href={resolvedHref}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors',
                    active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <Activity className="h-3 w-3" /> Demo live
            </span>
            <Button variant="ghost" size="sm" onClick={resetScenario} title="Reset demo scenario">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <nav className="grid grid-cols-5 border-t border-slate-100 md:hidden">
          {roles.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-bold',
                  active ? 'text-[#ef3f34]' : 'text-slate-400',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
