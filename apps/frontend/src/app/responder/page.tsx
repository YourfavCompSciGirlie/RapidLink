'use client';

import { ArrowRight, CheckCircle2, Clock3, MapPin, Radio, Signal, SignalZero, Siren } from 'lucide-react';
import Link from 'next/link';

import { AssignmentStatusBadge, PriorityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDemo } from '@/features/demo/demo-context';

export default function ResponderAssignmentsPage() {
  const { incident, assignments, resources, isOnline, queuedUpdates } = useDemo();
  const activeAssignments = assignments.filter(({ status }) => status !== 'completed');

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div><p className="eyebrow">Field responder</p><h1 className="mt-2 text-3xl font-black tracking-tight">My assignments</h1><p className="mt-2 text-sm text-slate-500">Thabo M. · EMS response unit</p></div>
        <Badge tone={isOnline ? 'green' : 'amber'}>{isOnline ? <Signal className="h-3 w-3" /> : <SignalZero className="h-3 w-3" />}{isOnline ? 'Online' : `${queuedUpdates} queued`}</Badge>
      </div>

      {activeAssignments.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="bg-slate-950 px-6 py-10 text-center text-white">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10"><Radio className="h-7 w-7" /></span>
            <h2 className="mt-5 text-xl font-bold">Awaiting dispatch</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">When the dispatcher confirms the response package, your assignment will appear here automatically.</p>
          </div>
          <CardContent>
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4"><Clock3 className="mt-0.5 h-5 w-5 text-amber-700" /><div><p className="text-sm font-bold text-amber-950">Incoming incident being verified</p><p className="mt-1 text-xs leading-5 text-amber-800">{incident.reference} · {incident.type} near {incident.location.label}</p></div></div>
            <Button asChild variant="outline" className="mt-4 w-full"><Link href={`/dispatcher?incident=${incident.id}`}>Open dispatcher demo <ArrowRight className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="eyebrow">Active now</p>
          {activeAssignments.map((assignment, index) => {
            const resource = resources.find(({ id }) => id === assignment.resourceId)!;
            return (
              <Link key={assignment.id} href={`/responder/incidents/${incident.id}?unit=${resource.id}`} className="group block">
                <Card className={`overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lg ${index === 0 ? 'border-red-200 ring-4 ring-red-50' : ''}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-2"><Siren className="h-4 w-4 text-[#ef3f34]" /><span className="text-xs font-black">{resource.callSign} · {resource.agency}</span></div><AssignmentStatusBadge status={assignment.status} /></div>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4"><div><PriorityBadge priority={incident.priority} /><h2 className="mt-3 text-xl font-black">{incident.type}</h2><p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {incident.location.label}</p></div><div className="text-right"><p className="text-3xl font-black text-slate-950">{assignment.etaMinutes}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">min ETA</p></div></div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">~{incident.casualties}</p><p className="text-[10px] font-bold text-slate-400">CASUALTIES</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-red-600">YES</p><p className="text-[10px] font-bold text-slate-400">FIRE RISK</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-amber-600">POSSIBLE</p><p className="text-[10px] font-bold text-slate-400">TRAPPED</p></div></div>
                    <span className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white">Open field view <ArrowRight className="h-4 w-4" /></span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {assignments.every(({ status }) => status === 'completed') && <div className="rounded-xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />All assignments completed</div>}
        </div>
      )}
    </main>
  );
}
