'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LocateFixed,
  MapPin,
  Mic,
  Navigation,
  RotateCcw,
  Send,
  Sparkles,
  Type,
  Waves,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DemoMap } from '@/components/demo-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDemo } from '@/features/demo/demo-context';
import { reportTranscript } from '@/features/demo/data/seed';

type Stage = 'report' | 'recording' | 'processing' | 'failed' | 'review' | 'submitted';

const processSteps = ['Transcribing voice report', 'Structuring incident details', 'Matching Mams Mall landmark'];

export default function CitizenReportPage() {
  const { incident, submitReport } = useDemo();
  const [stage, setStage] = useState<Stage>('report');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [text, setText] = useState(reportTranscript);
  const [location, setLocation] = useState(incident.location.label);
  const [casualties, setCasualties] = useState(incident.casualties);

  const startVoice = () => {
    setStage('recording');
    window.setTimeout(() => {
      setStage('processing');
      window.setTimeout(() => setStage('review'), 1400);
    }, 1100);
  };

  const processText = () => {
    setStage('processing');
    window.setTimeout(() => setStage('review'), 1400);
  };

  const sendReport = () => {
    submitReport({ transcript: text, locationLabel: location, casualties });
    setStage('submitted');
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Citizen emergency reporter</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {stage === 'submitted' ? 'Help is being coordinated.' : 'Tell us what happened.'}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Speak naturally. RapidLink will organise your report and ask you to confirm it before sending.
            </p>
          </div>
          <Badge tone="green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Secure</Badge>
        </div>

        {(stage === 'report' || stage === 'recording') && (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1.5">
              <button
                className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold ${mode === 'voice' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setMode('voice')}
              >
                <Mic className="h-4 w-4" /> Voice report
              </button>
              <button
                className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold ${mode === 'text' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                onClick={() => setMode('text')}
              >
                <Type className="h-4 w-4" /> Type report
              </button>
            </div>

            <CardContent className="p-6 sm:p-8">
              {mode === 'voice' ? (
                <div className="text-center">
                  <button
                    aria-label={stage === 'recording' ? 'Recording emergency report' : 'Record voice report'}
                    onClick={startVoice}
                    disabled={stage === 'recording'}
                    className={`mx-auto grid h-36 w-36 place-items-center rounded-full text-white transition-all ${stage === 'recording' ? 'animate-pulse bg-red-500 shadow-[0_0_0_18px_rgba(239,63,52,.12)]' : 'bg-[#ef3f34] shadow-[0_12px_40px_rgba(239,63,52,.28)] hover:scale-105'}`}
                  >
                    {stage === 'recording' ? <Waves className="h-11 w-11" /> : <Mic className="h-11 w-11" />}
                  </button>
                  <h2 className="mt-7 text-xl font-bold text-slate-950">
                    {stage === 'recording' ? 'Listening…' : 'Hold to describe the emergency'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Mention what happened, where you are, how many people may be affected, and any visible dangers.
                  </p>
                  <button onClick={() => setStage('failed')} className="mt-5 text-xs font-semibold text-slate-400 underline-offset-4 hover:underline">
                    Demo transcription fallback
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor="report" className="text-sm font-bold text-slate-900">Emergency description</label>
                  <textarea
                    id="report"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    className="mt-3 min-h-40 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                  />
                  <Button className="mt-4 w-full" size="lg" variant="emergency" onClick={processText} disabled={!text.trim()}>
                    Analyse report <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>

            <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2">
              <button className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><LocateFixed className="h-4 w-4" /></span>
                <span><span className="block text-xs font-bold text-slate-900">Share current location</span><span className="text-[11px] text-slate-500">GPS available</span></span>
              </button>
              <button className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700"><MapPin className="h-4 w-4" /></span>
                <span><span className="block text-xs font-bold text-slate-900">Describe a landmark</span><span className="text-[11px] text-slate-500">No street address needed</span></span>
              </button>
            </div>
          </Card>
        )}

        {stage === 'processing' && (
          <Card className="p-8 text-center sm:p-12">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-[#ef3f34]"><Sparkles className="h-7 w-7 animate-pulse" /></span>
            <h2 className="mt-5 text-xl font-bold">Understanding your report</h2>
            <p className="mt-2 text-sm text-slate-500">This usually takes only a few seconds.</p>
            <div className="mx-auto mt-8 max-w-md space-y-3 text-left">
              {processSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${index < 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {index < 2 ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5 animate-spin" />}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </Card>
        )}

        {stage === 'failed' && (
          <Card className="border-amber-200 p-7 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle className="h-6 w-6" /></span>
            <h2 className="mt-5 text-xl font-bold">We couldn&apos;t transcribe that recording</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Your recording was not submitted. Type the same details or try recording again.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setStage('report')}><Mic className="h-4 w-4" /> Try again</Button>
              <Button onClick={() => { setMode('text'); setStage('report'); }}><Type className="h-4 w-4" /> Type instead</Button>
            </div>
          </Card>
        )}

        {stage === 'review' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div><p className="eyebrow">What we understood</p><h2 className="mt-1 text-xl font-bold">Please confirm these details</h2></div>
                <Badge tone="blue"><Sparkles className="h-3 w-3" /> AI assisted</Badge>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm italic leading-6 text-slate-600">“{text}”</div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Incident', 'Road traffic collision', 'Inferred · 96%'],
                    ['People hurt', `Approximately ${casualties}`, 'Reported · 86%'],
                    ['Entrapment', 'Possible', 'Reported · 82%'],
                    ['Smoke / fire risk', 'Possible', 'Inferred · 79%'],
                  ].map(([label, value, source]) => (
                    <div key={label} className="rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-1 font-bold text-slate-900">{value}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{source}</p>
                    </div>
                  ))}
                </div>
                <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <span><span className="block text-sm font-bold text-blue-950">Correct the casualty estimate</span><span className="mt-1 block text-xs text-blue-700">Enter the best number you can see or were told.</span></span>
                  <input aria-label="Casualty estimate" type="number" min={0} value={casualties} onChange={(event) => setCasualties(Number(event.target.value))} className="h-11 w-20 rounded-lg border border-blue-200 bg-white text-center text-lg font-black outline-none focus:ring-4 focus:ring-blue-100" />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div><p className="eyebrow">Location match</p><h2 className="mt-1 text-lg font-bold">{location}</h2></div>
                <Badge tone="green">91% match</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <DemoMap compact publicView />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="flex-1">
                    <span className="sr-only">Confirmed location</span>
                    <input value={location} onChange={(event) => setLocation(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50" />
                  </label>
                  <Button variant="outline" onClick={() => setLocation('Mams Mall main entrance, Mamelodi')}><Navigation className="h-4 w-4" /> Move pin</Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStage('report')}><ArrowLeft className="h-4 w-4" /> Edit report</Button>
              <Button size="lg" variant="emergency" onClick={sendReport}>Confirm and send <Send className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {stage === 'submitted' && (
          <Card className="overflow-hidden text-center">
            <div className="bg-emerald-600 px-6 py-10 text-white">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/15"><CheckCircle2 className="h-8 w-8" /></span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-emerald-100">Report received</p>
              <h2 className="mt-2 text-3xl font-black">{incident.reference}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-emerald-50">A dispatcher is reviewing your report and confirmed location now.</p>
            </div>
            <CardContent className="p-6 sm:p-8">
              <div className="rounded-xl bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
                <strong>Stay safe:</strong> Keep away from the road and smoke. Do not approach the damaged vehicle.
              </div>
              <Button asChild size="lg" className="mt-6 w-full">
                <Link href={`/citizen/incidents/${incident.reference}`}>Track emergency response <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
