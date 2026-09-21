'use client';

import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Clock3, Map, Radio, Timer, TrendingDown } from 'lucide-react';

import { DemoMap } from '@/components/demo-map';
import { IncidentStatusBadge, PriorityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDemo } from '@/features/demo/demo-context';
import { historicalIncidents } from '@/features/demo/data/seed';

const metrics = [
  { label: 'Incidents today', value: '37', delta: '+4.2%', direction: 'up', icon: Activity, tone: 'bg-blue-50 text-blue-700' },
  { label: 'Report to dispatch', value: '2m 14s', delta: '-18 sec', direction: 'down', icon: Timer, tone: 'bg-violet-50 text-violet-700' },
  { label: 'Dispatch to arrival', value: '8m 42s', delta: '-1m 06s', direction: 'down', icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
  { label: 'Resolved today', value: '29', delta: '78.4%', direction: 'up', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
];

const incidentMix = [
  { label: 'Medical', count: 16, width: 84, color: 'bg-emerald-500' },
  { label: 'Road collisions', count: 12, width: 64, color: 'bg-blue-500' },
  { label: 'Structure fires', count: 4, width: 28, color: 'bg-orange-500' },
  { label: 'Other', count: 5, width: 34, color: 'bg-slate-400' },
];

export default function AnalyticsPage() {
  const { incident, assignments, timeline } = useDemo();
  const resolved = incident.status === 'resolved';
  const firstArrival = timeline.find((event) => event.title.includes('on scene'));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-700" /><p className="eyebrow">City operational analytics</p></div><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Response performance</h1><p className="mt-2 text-sm text-slate-500">Sunday, 20 September 2026 · Tshwane metro area</p></div>
        <div className="flex gap-2"><Badge tone="green"><Radio className="h-3 w-3" /> Live data</Badge><Badge tone="slate">Last updated now</Badge></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, delta, direction, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><span className={`flex items-center gap-1 text-xs font-bold ${direction === 'down' ? 'text-emerald-600' : 'text-blue-600'}`}>{direction === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{delta}</span></div>
            <p className="mt-5 text-3xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Card>
          <CardHeader><div><p className="eyebrow">Historical incident density</p><h2 className="mt-1 text-lg font-bold">Demand across eastern Tshwane</h2></div><Badge tone="amber"><Map className="h-3 w-3" /> Historical, not predictive</Badge></CardHeader>
          <CardContent><DemoMap heatmap resources={[]} className="h-[390px] min-h-0" /><div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Higher incident density</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Moderate incident density</span></div></CardContent>
        </Card>

        <Card>
          <CardHeader><div><p className="eyebrow">Incident mix</p><h2 className="mt-1 text-lg font-bold">Today by category</h2></div><span className="text-3xl font-black">37</span></CardHeader>
          <CardContent className="space-y-5">
            {incidentMix.map((item) => (
              <div key={item.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold text-slate-700">{item.label}</span><span className="font-black text-slate-950">{item.count}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.width}%` }} /></div></div>
            ))}
            <div className="rounded-xl bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-emerald-900"><TrendingDown className="h-4 w-4" /> Arrival times improving</div><p className="mt-1 text-xs leading-5 text-emerald-800">1m 06s faster than the previous reporting period.</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <Card className={resolved ? 'border-emerald-200' : ''}>
          <CardHeader><div><p className="eyebrow">Active incident</p><h2 className="mt-1 text-lg font-bold">{incident.reference} · Mams Mall</h2></div><div className="flex gap-2"><PriorityBadge priority={incident.priority} /><IncidentStatusBadge status={incident.status} /></div></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[['Report → dispatch', incident.dispatchedAt ? '2m 04s' : 'Pending'], ['Dispatch → arrival', firstArrival ? '6m 47s' : 'Pending'], ['Total duration', resolved ? '41m 12s' : 'In progress'], ['Units deployed', assignments.length || 'Pending']].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>)}
            </div>
            {!resolved && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">Resolve the incident from the responder view to complete its final performance record.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><p className="eyebrow">Recently resolved</p><h2 className="mt-1 text-lg font-bold">Operational outcomes</h2></div><Badge tone="slate">Today</Badge></CardHeader>
          <CardContent className="overflow-x-auto p-0 pt-4">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="border-y border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Area</th><th className="px-5 py-3">Incident</th><th className="px-5 py-3">Priority</th><th className="px-5 py-3">Arrival</th><th className="px-5 py-3">Outcome</th></tr></thead>
              <tbody>{historicalIncidents.slice(0, 5).map((item, index) => <tr key={`${item.area}-${index}`} className="border-b border-slate-100 last:border-0"><td className="px-5 py-3 font-bold">{item.area}</td><td className="px-5 py-3 text-slate-500">{item.type}</td><td className="px-5 py-3"><Badge tone={item.priority === 'P1' ? 'red' : item.priority === 'P2' ? 'amber' : 'blue'}>{item.priority}</Badge></td><td className="px-5 py-3 font-bold">{item.responseMinutes} min</td><td className="px-5 py-3 text-emerald-700"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Resolved</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
