'use client';

import { ArrowRight, Copy, Loader2, Plus, ShieldCheck, Smartphone, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { ServiceNotice } from '@/components/service-notice';
import { Button } from '@/components/ui/button';
import { createSession, generateRoomCode, getActiveSessionCode, joinSession, normalizeRoomCode } from '@/features/emergency/session-service';

const roles = [
  { id: 'client', label: 'Client', description: 'Start an emergency request and follow the response.', href: '/client', icon: Smartphone },
  { id: 'responder', label: 'Responder', description: 'Open incident offers and accept a response.', href: '/messages', icon: UsersRound },
  { id: 'supervisor', label: 'Supervisor', description: 'Manage responders, shifts and availability.', href: '/supervisor', icon: ShieldCheck },
] as const;

function Launcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  useEffect(() => { setRoom(getActiveSessionCode()); setOrigin(window.location.origin); }, []);
  useEffect(() => {
    const incoming = searchParams.get('session');
    const role = searchParams.get('role');
    if (!incoming) return;
    setBusy(true);
    joinSession(incoming).then((joined) => {
      setRoom(joined);
      const target = roles.find((item) => item.id === role)?.href;
      if (target) router.replace(target);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'The room could not be joined.')).finally(() => setBusy(false));
  }, [router, searchParams]);
  const roomLinks = useMemo(() => Object.fromEntries(roles.map((role) => [role.id, `${origin}/?session=${room}&role=${role.id}`])), [origin, room]);
  const create = async () => { setBusy(true); setError(''); try { setRoom(await createSession(generateRoomCode())); } finally { setBusy(false); } };
  const join = async () => { setBusy(true); setError(''); try { setRoom(await joinSession(code)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'The room could not be joined.'); } finally { setBusy(false); } };
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <ServiceNotice />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mx-auto max-w-3xl text-center"><p className="text-sm font-extrabold uppercase tracking-[0.18em] text-red-700">One press. Someone responds.</p><h1 className="mt-3 text-4xl font-black tracking-tight text-[#003172] sm:text-5xl">Start a RapidLink session</h1><p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">Connect the client, responder and supervisor experiences with one room code.</p></header>
        {!room ? <section className="mx-auto mt-10 grid max-w-3xl gap-5 md:grid-cols-2">
          <div className="elevated-surface rounded-2xl bg-white p-6"><span className="grid h-12 w-12 place-items-center rounded-xl bg-red-100 text-red-700"><Plus className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-extrabold text-[#003172]">Create a new room</h2><p className="mt-2 text-sm leading-6 text-slate-600">Start with fictional responders, stations and an empty incident queue.</p><Button className="mt-6 w-full" onClick={() => void create()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create room</Button></div>
          <div className="elevated-surface rounded-2xl bg-white p-6"><span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-[#003172]"><UsersRound className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-extrabold text-[#003172]">Join an existing room</h2><label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="room-code">Six-character code</label><input id="room-code" value={code} onChange={(event) => setCode(normalizeRoomCode(event.target.value))} maxLength={6} placeholder="ABC123" className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-4 text-center text-lg font-black uppercase tracking-[0.25em] outline-none focus:border-[#003172] focus:ring-4 focus:ring-blue-100" /><Button variant="outline" className="mt-4 w-full" onClick={() => void join()} disabled={busy || code.length !== 6}>Join room <ArrowRight className="h-4 w-4" /></Button></div>
        </section> : <section className="mt-10">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-[#003172] px-5 py-4 text-white"><div><p className="text-xs font-bold text-blue-200">ACTIVE ROOM</p><p className="text-2xl font-black tracking-[0.20em]">{room}</p></div><div className="flex gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(room)} className="flex min-h-11 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-bold"><Copy className="h-4 w-4" /> Copy</button><button type="button" onClick={() => setRoom(null)} className="min-h-11 rounded-lg px-3 text-sm font-bold text-blue-100 hover:bg-white/10">Change</button></div></div>
          <div className="mt-7 grid gap-5 md:grid-cols-3">{roles.map((role) => { const Icon = role.icon; return <article key={role.id} className="elevated-surface rounded-2xl bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#003172]"><Icon className="h-5 w-5" /></span><h2 className="text-lg font-extrabold text-[#003172]">{role.label}</h2></div><p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{role.description}</p><div className="mx-auto mt-4 w-fit rounded-xl border border-slate-200 bg-white p-2"><QRCodeSVG value={roomLinks[role.id] ?? ''} size={132} fgColor="#003172" /></div><Button asChild className="mt-4 w-full"><Link href={role.href}>Open {role.label} <ArrowRight className="h-4 w-4" /></Link></Button></article>; })}</div>
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-blue-100 bg-blue-50 p-5"><h2 className="font-extrabold text-[#003172]">Guided demo</h2><ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2"><li>1. Open the client.</li><li>2. Trigger an alert.</li><li>3. Scan a responder QR.</li><li>4. Accept the offer.</li><li>5. Update progress.</li><li>6. Watch the client confirmation.</li></ol></div>
        </section>}
        {error && <p className="mx-auto mt-5 max-w-xl rounded-xl bg-red-50 p-4 text-center font-bold text-red-800" role="alert">{error}</p>}
      </div>
    </main>
  );
}

export default function HomePage() { return <Suspense fallback={<main className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#003172]" /></main>}><Launcher /></Suspense>; }
