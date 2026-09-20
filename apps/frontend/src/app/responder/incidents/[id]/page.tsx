'use client';

import type { AssignmentStatus } from '@rapidlink/shared';
import {
  AlertOctagon,
  Ambulance,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  MapPin,
  Mic,
  Navigation,
  Radio,
  RefreshCw,
  ShieldAlert,
  Signal,
  SignalZero,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AssignmentStatusBadge, PriorityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDemo } from '@/features/demo/demo-context';
import { cn } from '@/lib/utils';

const statuses: { value: AssignmentStatus; label: string }[] = [
  { value: 'en_route', label: 'En route' },
  { value: 'nearby', label: 'Nearby' },
  { value: 'on_scene', label: 'On scene' },
];

export default function ResponderFieldPage() {
  const searchParams = useSearchParams();
  const {
    incident,
    assignments,
    resources,
    isOnline,
    queuedUpdates,
    updateAssignment,
    addObservation,
    requestSupport,
    setOnline,
    resolveIncident,
  } = useDemo();
  const requestedUnit = searchParams.get('unit');
  const assignment = assignments.find(({ resourceId }) => resourceId === requestedUnit) ?? assignments[0];
  const resource = resources.find(({ id }) => id === assignment?.resourceId);
  const [sceneUpdated, setSceneUpdated] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [casualties, setCasualties] = useState(8);

  if (!assignment || !resource) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Radio className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-black">No assignment yet</h1><p className="mt-2 text-sm text-slate-500">The command centre must dispatch a response package first.</p>
        <Button asChild className="mt-6"><Link href="/responder">Back to assignments</Link></Button>
      </main>
    );
  }

  const submitObservation = () => {
    addObservation({ casualties, fuelLeak: true, entrapment: true });
    setSceneUpdated(true);
  };

  const submitSupport = () => {
    requestSupport('Additional ambulance', `Casualty count increased to ${casualties}; additional patient transport required.`);
    setSupportOpen(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6 lg:py-10">
      {!isOnline && <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><SignalZero className="h-5 w-5" /><div className="flex-1"><strong>Working offline</strong><p className="text-xs">{queuedUpdates} updates queued safely on this device.</p></div><Button size="sm" variant="outline" onClick={() => setOnline(true)}>Reconnect</Button></div>}
      {isOnline && queuedUpdates === 0 && <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><span className="flex items-center gap-2"><Signal className="h-4 w-4" /> Connected to command</span><button onClick={() => setOnline(false)} className="font-semibold text-emerald-700 underline-offset-4 hover:underline">Simulate network loss</button></div>}

      <Card className="overflow-hidden">
        <div className="bg-slate-950 p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-400">{incident.reference} · {resource.callSign}</p><h1 className="mt-2 text-2xl font-black">{incident.type}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300"><MapPin className="h-4 w-4" /> {incident.location.label}</p></div><PriorityBadge priority={incident.priority} /></div>
          <div className="mt-6 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-white/10 p-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Road ETA</p><p className="mt-1 text-2xl font-black">{assignment.etaMinutes} min <span className="text-sm font-medium text-slate-400">· {resource.distanceKm} km</span></p></div><Button variant="emergency"><Navigation className="h-4 w-4" /> Navigate</Button></div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-4">
          {statuses.map((status) => {
            const active = assignment.status === status.value;
            return <button key={status.value} disabled={assignment.status === 'completed'} onClick={() => updateAssignment(resource.id, status.value)} className={cn('rounded-xl border px-2 py-3 text-xs font-bold transition', active ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400')}><span className={cn('mx-auto mb-2 grid h-5 w-5 place-items-center rounded-full border', active && 'border-white bg-white text-slate-950')}>{active && <Check className="h-3 w-3" />}</span>{status.label}</button>;
          })}
        </div>

        <CardContent className="space-y-5">
          <div><div className="flex items-center justify-between"><p className="eyebrow">Known hazards</p><AssignmentStatusBadge status={assignment.status} /></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="flex items-center gap-3 rounded-xl bg-red-50 p-3 text-red-900"><Users className="h-5 w-5" /><div><p className="text-sm font-black">~{incident.casualties}</p><p className="text-[10px] font-bold">CASUALTIES</p></div></div><div className="flex items-center gap-3 rounded-xl bg-orange-50 p-3 text-orange-900"><Flame className="h-5 w-5" /><div><p className="text-sm font-black">Possible</p><p className="text-[10px] font-bold">SMOKE / FIRE</p></div></div><div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-amber-900"><AlertOctagon className="h-5 w-5" /><div><p className="text-sm font-black">Possible</p><p className="text-[10px] font-bold">ENTRAPMENT</p></div></div></div></div>
          <div className="rounded-xl border border-slate-200 p-4"><p className="eyebrow">Your task</p><p className="mt-2 text-sm font-bold">Establish casualty triage and provide advanced life support.</p><p className="mt-2 text-xs leading-5 text-slate-500">Coordinate with R03 for extrication and report any increase in casualties immediately.</p></div>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><p className="eyebrow">Scene assessment</p><h2 className="mt-1 font-bold">Update what you find</h2></div>{sceneUpdated && <Badge tone="green">Updated</Badge>}</CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-bold"><span className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-600" /> Fuel leak confirmed</span><input type="checkbox" defaultChecked className="h-4 w-4 accent-red-500" /></label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-bold"><span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600" /> Passenger trapped</span><input type="checkbox" defaultChecked className="h-4 w-4 accent-red-500" /></label>
            <label className="block rounded-xl border border-slate-200 p-3"><span className="text-xs font-bold text-slate-500">Casualties identified</span><input type="number" min={0} value={casualties} onChange={(event) => setCasualties(Number(event.target.value))} className="mt-1 block w-full text-xl font-black outline-none" /></label>
            <Button className="w-full" onClick={submitObservation}><RefreshCw className="h-4 w-4" /> Update command centre</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><p className="eyebrow">Operational actions</p><h2 className="mt-1 font-bold">Support and resolution</h2></div></CardHeader>
          <CardContent className="space-y-3">
            {!supportOpen ? <button onClick={() => setSupportOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500 text-white"><Ambulance className="h-5 w-5" /></span><span className="flex-1"><span className="block text-sm font-black text-amber-950">Request additional resources</span><span className="text-xs text-amber-800">Notify command immediately</span></span><ChevronRight className="h-4 w-4 text-amber-700" /></button> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-black text-amber-950">Additional ambulance</p><p className="mt-1 text-xs leading-5 text-amber-800">More casualties identified. ALS transport support required.</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={submitSupport}>Send request</Button><Button size="sm" variant="ghost" onClick={() => setSupportOpen(false)}>Cancel</Button></div></div>}
            {!resolutionOpen ? <button onClick={() => setResolutionOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span><span className="flex-1"><span className="block text-sm font-black text-emerald-950">Resolve incident</span><span className="text-xs text-emerald-800">Complete the field report</span></span><ChevronRight className="h-4 w-4 text-emerald-700" /></button> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-black text-emerald-950">Resolution report</p><textarea defaultValue="Scene safe. Eight casualties transported and roadway reopened." className="mt-3 min-h-20 w-full rounded-lg border border-emerald-200 bg-white p-3 text-xs outline-none" /><Button className="mt-3 w-full" variant="success" onClick={() => resolveIncident('Scene safe. Eight casualties transported and roadway reopened.')}><Mic className="h-4 w-4" /> Submit and close incident</Button></div>}
          </CardContent>
        </Card>
      </div>

      {incident.status === 'resolved' && <div className="mt-5 rounded-2xl bg-emerald-600 p-6 text-center text-white"><CheckCircle2 className="mx-auto h-8 w-8" /><h2 className="mt-3 text-xl font-black">Incident closed</h2><p className="mt-1 text-sm text-emerald-100">Your unit is available for reassignment.</p><Button asChild className="mt-4" variant="outline"><Link href="/analytics">View incident analysis <ChevronRight className="h-4 w-4" /></Link></Button></div>}
    </main>
  );
}
