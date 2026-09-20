'use client';

import type { Priority } from '@rapidlink/shared';
import {
  AlertTriangle,
  Ambulance,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Flame,
  Headphones,
  MapPin,
  Navigation,
  Radio,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { DemoMap } from '@/components/demo-map';
import { IncidentStatusBadge, PriorityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/features/demo/demo-context';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'resources' | 'timeline';

const queue = [
  { reference: 'ER-1040', type: 'Medical emergency', location: 'Soshanguve Block L', priority: 'P2', age: '18m', status: 'active' },
  { reference: 'ER-1041', type: 'Structure fire', location: 'Atteridgeville Ext 7', priority: 'P1', age: '11m', status: 'dispatched' },
];

const agencyIcon = {
  EMS: Ambulance,
  'Fire & Rescue': Flame,
  'Metro Police': Shield,
};

export default function DispatcherPage() {
  const {
    incident,
    resources,
    recommendations,
    assignments,
    timeline,
    supportRequests,
    verifyIncident,
    overridePriority,
    toggleRecommendation,
    dispatchSelected,
    approveSupport,
    updateAssignment,
  } = useDemo();
  const [tab, setTab] = useState<Tab>('overview');
  const selectedCount = recommendations.filter(({ selected }) => selected).length;
  const pendingSupport = supportRequests.find(({ status }) => status === 'pending');

  const advanceUnits = () => {
    assignments.forEach((assignment) => {
      const next = assignment.status === 'assigned' ? 'en_route' : assignment.status === 'en_route' ? 'nearby' : 'on_scene';
      updateAssignment(assignment.resourceId, next);
    });
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#eef0ee]">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Headphones className="h-4 w-4 text-blue-700" /><p className="eyebrow">Emergency Communication Centre</p></div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Live command</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {[['Critical', '3', 'text-red-600'], ['High', '7', 'text-amber-600'], ['Units available', `${resources.filter(({ status }) => status === 'available').length}`, 'text-emerald-600']].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                <span className={`text-lg font-black ${tone}`}>{value}</span><span className="ml-2 text-xs font-semibold text-slate-500">{label}</span>
              </div>
            ))}
            <Badge tone="green"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Realtime connected</Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 sm:p-6 xl:grid-cols-[300px_minmax(420px,1fr)_440px]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between"><div><p className="eyebrow">Incident queue</p><h2 className="mt-1 font-bold">12 active incidents</h2></div><Badge tone="red">3 new</Badge></div>
            <div className="mt-4 flex rounded-lg bg-slate-100 p-1 text-[11px] font-bold text-slate-500">
              <button className="flex-1 rounded-md bg-white px-2 py-1.5 text-slate-900 shadow-sm">All</button>
              <button className="flex-1 px-2 py-1.5">Unverified</button>
              <button className="flex-1 px-2 py-1.5">P1</button>
            </div>
          </div>

          <div className="space-y-2 p-2">
            <button className="w-full rounded-xl border border-red-200 bg-red-50 p-4 text-left shadow-sm ring-2 ring-red-100">
              <div className="flex items-start justify-between"><PriorityBadge priority={incident.priority} /><span className="text-[10px] font-bold text-red-600">JUST NOW</span></div>
              <h3 className="mt-3 text-sm font-bold text-slate-950">{incident.type}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {incident.location.label}</p>
              <div className="mt-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{incident.reference}</span><ChevronRight className="h-4 w-4 text-slate-400" /></div>
            </button>
            {queue.map((item) => (
              <button key={item.reference} className="w-full rounded-xl border border-transparent p-4 text-left transition hover:border-slate-200 hover:bg-slate-50">
                <div className="flex items-center justify-between"><Badge tone={item.priority === 'P1' ? 'red' : 'amber'}>{item.priority}</Badge><span className="text-[10px] font-semibold text-slate-400">{item.age}</span></div>
                <h3 className="mt-2 text-sm font-bold">{item.type}</h3><p className="mt-1 text-xs text-slate-500">{item.location}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div><p className="eyebrow">Operational picture</p><h2 className="mt-1 text-sm font-bold">Mamelodi East · Live resources</h2></div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-600" /> EMS</span>
              <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-orange-700"><span className="h-2 w-2 rounded-full bg-orange-500" /> Fire</span>
              <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-600" /> TMPD</span>
            </div>
          </div>
          <DemoMap resources={resources} className="min-h-[480px] flex-1 rounded-none" />
          <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fastest ETA</p><p className="mt-1 text-lg font-black">6 min</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned</p><p className="mt-1 text-lg font-black">{assignments.length} units</p></div>
            {assignments.length > 0 ? <Button variant="outline" className="h-full" onClick={advanceUnits}><Navigation className="h-4 w-4" /> Advance units</Button> : <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Traffic</p><p className="mt-1 text-lg font-black text-amber-600">Moderate</p></div>}
          </div>
        </section>

        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold text-slate-400">{incident.reference}</p><h2 className="mt-1 text-xl font-black">Taxi collision</h2><p className="mt-1 text-xs text-slate-500">Mams Mall · reported 14:03</p></div>
              <div className="flex flex-col items-end gap-2"><PriorityBadge priority={incident.priority} /><IncidentStatusBadge status={incident.status} /></div>
            </div>
          </div>

          {pendingSupport && (
            <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500 text-white"><Radio className="h-4 w-4" /></span><div><Badge tone="amber">New resource request</Badge><h3 className="mt-2 text-sm font-bold">{pendingSupport.resourceType}</h3><p className="mt-1 text-xs leading-5 text-amber-900">{pendingSupport.reason}</p></div></div>
              <Button size="sm" className="mt-3 w-full" onClick={() => approveSupport(pendingSupport.id)}>Approve and dispatch A09 <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>
          )}

          <div className="grid grid-cols-3 border-b border-slate-100 px-4">
            {(['overview', 'resources', 'timeline'] as Tab[]).map((item) => (
              <button key={item} onClick={() => setTab(item)} className={cn('border-b-2 px-2 py-3 text-xs font-bold capitalize', tab === item ? 'border-[#ef3f34] text-slate-950' : 'border-transparent text-slate-400')}>{item}</button>
            ))}
          </div>

          <div className="max-h-[690px] overflow-y-auto p-4">
            {tab === 'overview' && (
              <div className="space-y-4">
                {incident.status === 'reported' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" />AI has structured this report. Human verification is required.</div>
                )}
                <div className="rounded-xl bg-slate-950 p-4 text-white">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI incident composer</span><Badge tone="green">87% confidence</Badge></div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{incident.transcript}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Casualties', value: `~${incident.casualties}`, icon: Users },
                    { label: 'Location match', value: `${incident.location.confidence}%`, icon: MapPin },
                    { label: 'Entrapment', value: incident.trappedPersons ? 'Possible' : 'Unknown', icon: CircleDot },
                    { label: 'Fire risk', value: incident.fireRisk ? 'Possible' : 'Unknown', icon: Flame },
                  ].map(({ label, value, icon: ItemIcon }) => (
                    <div key={label} className="rounded-xl border border-slate-200 p-3"><ItemIcon className="h-4 w-4 text-slate-400" /><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><div><p className="eyebrow">Suggested priority</p><p className="mt-1 text-2xl font-black text-red-600">{incident.priorityScore} / 100</p></div><PriorityBadge priority={incident.priority} /></div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-red-500" style={{ width: `${incident.priorityScore}%` }} /></div>
                  <div className="mt-4 space-y-2">
                    {incident.priorityFactors.slice(0, 5).map((factor) => <div key={factor.label} className="flex items-center justify-between text-xs"><span className="text-slate-600">{factor.label}</span><strong className="text-red-600">+{factor.score}</strong></div>)}
                  </div>
                  <div className="mt-4 flex gap-2">
                    {(['P1', 'P2', 'P3'] as Priority[]).map((priority) => <button key={priority} onClick={() => overridePriority(priority, `Dispatcher manually confirmed ${priority}`)} className={cn('flex-1 rounded-lg border py-2 text-xs font-bold', incident.priority === priority ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 text-slate-500')}>{priority}</button>)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="eyebrow">Location</p><p className="mt-1 text-sm font-bold">{incident.location.label}</p></div><Badge tone={incident.location.confirmed ? 'green' : 'amber'}>{incident.location.confirmed ? 'Confirmed' : 'Needs confirmation'}</Badge></div><p className="mt-2 text-xs text-slate-500">Landmark match · {incident.location.confidence}% confidence</p></div>
                {incident.status === 'reported' && <Button variant="emergency" className="w-full" onClick={verifyIncident}><CheckCircle2 className="h-4 w-4" /> Confirm incident and priority</Button>}
                {incident.status !== 'reported' && <Button className="w-full" onClick={() => setTab('resources')}>Review response package <ArrowRight className="h-4 w-4" /></Button>}
              </div>
            )}

            {tab === 'resources' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900"><Sparkles className="mr-2 inline h-4 w-4" />Recommended by capability, availability, workload and road ETA—not distance alone.</div>
                {recommendations.map((recommendation) => {
                  const resource = resources.find(({ id }) => id === recommendation.resourceId)!;
                  const Icon = agencyIcon[resource.agency];
                  const unavailable = resource.status === 'unavailable';
                  return (
                    <button key={resource.id} disabled={unavailable || assignments.length > 0} onClick={() => toggleRecommendation(resource.id)} className={cn('w-full rounded-xl border p-3 text-left transition', recommendation.selected ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200', unavailable && 'cursor-not-allowed bg-slate-50 opacity-60')}>
                      <div className="flex items-start gap-3"><span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', resource.agency === 'EMS' ? 'bg-emerald-100 text-emerald-700' : resource.agency === 'Fire & Rescue' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-sm font-black">{resource.callSign}</p><span className="text-xs font-bold">ETA {resource.etaMinutes} min</span></div><p className="mt-0.5 truncate text-xs text-slate-500">{resource.type}</p><p className="mt-2 text-[11px] leading-4 text-slate-600">{recommendation.reason}</p></div><span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border', recommendation.selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>{recommendation.selected && <Check className="h-3 w-3" />}</span></div>
                      {unavailable && <p className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Unavailable · transporting patient</p>}
                    </button>
                  );
                })}
                {assignments.length === 0 ? <Button className="w-full" size="lg" onClick={dispatchSelected} disabled={incident.status === 'reported' || selectedCount === 0}><Radio className="h-4 w-4" /> Dispatch {selectedCount} selected units</Button> : <div className="rounded-xl bg-emerald-50 p-4 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" /><p className="mt-2 text-sm font-bold text-emerald-900">Response package dispatched</p><p className="mt-1 text-xs text-emerald-700">{assignments.length} units coordinating on one incident.</p></div>}
              </div>
            )}

            {tab === 'timeline' && (
              <div className="space-y-0">
                {timeline.length === 0 ? <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Timeline begins when the citizen submits the report.</div> : timeline.slice().reverse().map((event, index) => (
                  <div key={event.id} className="flex gap-3"><div className="flex flex-col items-center"><span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-white"><Clock3 className="h-3.5 w-3.5" /></span>{index < timeline.length - 1 && <span className="h-12 w-px bg-slate-200" />}</div><div className="pb-5"><p className="text-xs font-black">{event.title}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{event.detail}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
