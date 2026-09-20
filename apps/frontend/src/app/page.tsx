'use client';

import { ArrowRight, BarChart3, Headphones, Radio, RotateCcw, ShieldCheck, Siren, Timer } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { BrandMark } from '@/components/brand-mark';
import { IncidentStatusBadge, PriorityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDemo } from '@/features/demo/demo-context';

const roleCards = [
  {
    href: '/citizen', title: 'Report an emergency', label: 'Citizen',
    description: 'Send a voice or text report and confirm the incident location.',
    icon: Siren, tone: 'bg-red-50 text-[#ef3f34]',
  },
  {
    href: '/dispatcher?incident=incident-er-1042', title: 'Open command centre', label: 'Dispatcher',
    description: 'Verify the report, compose a response and coordinate every unit.',
    icon: Headphones, tone: 'bg-blue-50 text-blue-700',
  },
  {
    href: '/responder', title: 'View field assignment', label: 'Responder',
    description: 'Navigate, update scene status and request operational support.',
    icon: Radio, tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    href: '/analytics', title: 'Review city performance', label: 'Management',
    description: 'Measure response time, incident mix and historical demand.',
    icon: BarChart3, tone: 'bg-violet-50 text-violet-700',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { incident, scenarioStarted, startScenario, resetScenario } = useDemo();

  const begin = () => {
    startScenario();
    router.push('/citizen');
  };

  return (
    <main>
      <section className="surface-grid relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute -right-24 -top-36 h-96 w-96 rounded-full bg-red-100/60 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div className="relative">
            <Badge tone="red" className="mb-6">Live coordination prototype</Badge>
            <h1 className="max-w-3xl text-balance text-5xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Every minute saved is a life saved.
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-slate-600">
              One connected response system that turns a citizen&apos;s words into a verified, precisely located,
              multi-agency incident.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="emergency" onClick={begin}>
                Start the live scenario <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={resetScenario}>
                <RotateCcw className="h-4 w-4" /> Reset demo
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Human-confirmed dispatch</span>
              <span className="flex items-center gap-2"><Timer className="h-4 w-4 text-blue-600" /> Structured in seconds</span>
            </div>
          </div>

          <Card className="relative overflow-hidden border-slate-800 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <BrandMark className="[&_span_span]:text-white" />
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> System ready
              </span>
            </div>
            <div className="py-7">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">The connected response</p>
              <div className="mt-5 grid grid-cols-3 gap-y-6">
                {['Report', 'Verify', 'Prioritise', 'Dispatch', 'Coordinate', 'Resolve'].map((step, index) => (
                  <div key={step}>
                    <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">{index + 1}</span>
                    <span className="text-xs font-semibold text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.06] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">{incident.reference} · Taxi collision</p>
                  <p className="mt-1 text-xs text-slate-400">Mams Mall, Mamelodi</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <PriorityBadge priority={incident.priority} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Choose a role</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Follow one incident, end to end</h2>
          </div>
          {scenarioStarted && <Badge tone="green">Scenario active</Badge>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {roleCards.map(({ href, title, label, description, icon: Icon, tone }) => (
            <Link key={label} href={href} className="group">
              <Card className="h-full p-5 transition-all group-hover:-translate-y-1 group-hover:border-slate-300 group-hover:shadow-lg">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-slate-400">{label}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                  Open view <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
