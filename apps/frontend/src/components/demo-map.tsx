'use client';

import type { Resource } from '@rapidlink/shared';
import { Ambulance, Flame, MapPin, Shield } from 'lucide-react';

import { cn } from '@/lib/utils';

const markerPositions: Record<string, string> = {
  'resource-a07': 'left-[29%] top-[60%]',
  'resource-r03': 'left-[68%] top-[68%]',
  'resource-f11': 'left-[76%] top-[29%]',
  'resource-t02': 'left-[42%] top-[25%]',
  'resource-a12': 'left-[16%] top-[32%]',
  'resource-a09': 'left-[83%] top-[76%]',
};

function ResourceIcon({ resource }: { resource: Resource }) {
  if (resource.agency === 'EMS') return <Ambulance className="h-3.5 w-3.5" />;
  if (resource.agency === 'Fire & Rescue') return <Flame className="h-3.5 w-3.5" />;
  return <Shield className="h-3.5 w-3.5" />;
}

export function DemoMap({
  resources = [],
  compact = false,
  publicView = false,
  heatmap = false,
  className,
}: {
  resources?: Resource[];
  compact?: boolean;
  publicView?: boolean;
  heatmap?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-label="Map of the Mams Mall incident area"
      className={cn(
        'relative isolate overflow-hidden rounded-2xl bg-[#e9ece9] text-slate-700',
        compact ? 'h-52' : 'h-full min-h-[360px]',
        className,
      )}
    >
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(31deg,transparent_46%,#fff_47%,#fff_51%,transparent_52%),linear-gradient(121deg,transparent_44%,#d1d9d4_45%,#d1d9d4_48%,transparent_49%)] [background-size:130px_100px,180px_140px]" />
      <div className="absolute -left-16 top-[42%] h-8 w-[130%] -rotate-6 bg-white shadow-[0_0_0_1px_#d9dedb]" />
      <div className="absolute left-[53%] top-[-10%] h-[125%] w-6 rotate-[17deg] bg-white shadow-[0_0_0_1px_#d9dedb]" />
      <div className="absolute left-5 top-4 rounded-lg bg-white/90 px-3 py-2 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        Mamelodi East · Live area
      </div>

      {heatmap && (
        <>
          <div className="absolute left-[49%] top-[37%] h-32 w-32 rounded-full bg-red-500/25 blur-xl" />
          <div className="absolute left-[17%] top-[58%] h-24 w-24 rounded-full bg-amber-400/30 blur-xl" />
          <div className="absolute right-[9%] top-[16%] h-20 w-20 rounded-full bg-orange-500/25 blur-xl" />
        </>
      )}

      <div className="absolute left-[51%] top-[44%] z-20 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-[#ef3f34] text-white shadow-[0_0_0_8px_rgba(239,63,52,.15)]">
          <MapPin className="h-6 w-6" fill="currentColor" />
          <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-red-500" />
        </span>
        <span className="mt-2 inline-block whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold text-white shadow">
          ER-1042 · Mams Mall
        </span>
      </div>

      {!publicView &&
        resources.map((resource) => (
          <div
            key={resource.id}
            className={cn(
              'absolute z-10 flex items-center gap-1 rounded-full border-2 border-white px-2 py-1 text-[10px] font-bold shadow-md',
              markerPositions[resource.id],
              resource.status === 'unavailable'
                ? 'bg-slate-400 text-white opacity-60'
                : resource.agency === 'EMS'
                  ? 'bg-emerald-600 text-white'
                  : resource.agency === 'Fire & Rescue'
                    ? 'bg-orange-500 text-white'
                    : 'bg-blue-600 text-white',
            )}
          >
            <ResourceIcon resource={resource} />
            {resource.callSign}
          </div>
        ))}

      {publicView && (
        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/70 bg-white/90 p-3 text-xs text-slate-600 shadow-sm backdrop-blur">
          Location shown approximately for public safety. Responder positions are private.
        </div>
      )}
    </div>
  );
}
