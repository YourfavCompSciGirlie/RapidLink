'use client';

import { Bell, Check, CheckCircle2, Clock3, Info, MapPin, MessageSquarePlus, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { DemoMap } from '@/components/demo-map';
import { IncidentStatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDemo } from '@/features/demo/demo-context';

const publicSteps = [
  { status: 'received', label: 'Report received' },
  { status: 'location_confirmed', label: 'Location confirmed' },
  { status: 'dispatched', label: 'Teams dispatched' },
  { status: 'nearby', label: 'Help nearby' },
  { status: 'on_scene', label: 'On scene' },
  { status: 'resolved', label: 'Resolved' },
] as const;

export default function CitizenTrackingPage() {
  const { incident, citizenUpdates, addCitizenInformation } = useDemo();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const reached = new Set(citizenUpdates.map(({ status }) => status));
  const latest = citizenUpdates.at(-1);

  const submitInfo = () => {
    if (!message.trim()) return;
    addCitizenInformation(message.trim());
    setMessage('');
    setAdding(false);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Emergency tracking</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{incident.reference}</h1>
          <p className="mt-1 text-sm text-slate-500">{incident.type} · {incident.location.label}</p>
        </div>
        <IncidentStatusBadge status={incident.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><Bell className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Latest update</p>
                  <h2 className="mt-1 font-bold text-emerald-950">{latest?.title ?? 'Report ready to submit'}</h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">{latest?.message ?? 'Return to the reporting screen to send this emergency report.'}</p>
                </div>
              </div>
            </div>
            <CardContent>
              <p className="eyebrow">Response progress</p>
              <div className="mt-5 space-y-0">
                {publicSteps.map((step, index) => {
                  const done = reached.has(step.status) || incident.status === 'resolved';
                  return (
                    <div key={step.status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className={`grid h-7 w-7 place-items-center rounded-full ${done ? 'bg-emerald-600 text-white' : 'border-2 border-slate-200 bg-white text-slate-300'}`}>
                          {done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </span>
                        {index < publicSteps.length - 1 && <span className={`h-9 w-px ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                      </div>
                      <div className="pt-1">
                        <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div><p className="eyebrow">Public location</p><h2 className="mt-1 font-bold">Mams Mall incident area</h2></div>
              <Badge tone="slate"><MapPin className="h-3 w-3" /> Approximate</Badge>
            </CardHeader>
            <CardContent><DemoMap compact publicView /></CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div><h2 className="font-bold text-amber-950">Stay at a safe distance</h2><p className="mt-1 text-sm leading-6 text-amber-900">Do not approach the vehicle or smoke. Keep access roads clear for emergency teams.</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div><p className="eyebrow">Updates</p><h2 className="mt-1 font-bold">Messages from RapidLink</h2></div></CardHeader>
            <CardContent className="space-y-4">
              {citizenUpdates.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No updates have been sent yet.</p>
              ) : citizenUpdates.slice().reverse().map((update) => (
                <div key={update.id} className="flex gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><CheckCircle2 className="h-4 w-4" /></span>
                  <div><p className="text-sm font-bold text-slate-900">{update.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{update.message}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <h2 className="font-bold">Has the situation changed?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Add a corrected location or report a new visible hazard.</p>
                  {adding ? (
                    <div className="mt-4">
                      <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the new information…" className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" />
                      <div className="mt-3 flex gap-2"><Button size="sm" onClick={submitInfo}>Send update</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div>
                    </div>
                  ) : (
                    <Button className="mt-4" variant="outline" onClick={() => setAdding(true)}><MessageSquarePlus className="h-4 w-4" /> Add information</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 px-2 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" /> Status updates may be delayed during network interruptions.</div>
        </div>
      </div>
    </main>
  );
}
