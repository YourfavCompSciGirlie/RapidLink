import { Radio } from 'lucide-react';

import { cn } from '@/lib/utils';

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ef3f34] text-white shadow-sm">
        <Radio className="h-5 w-5" strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Tshwane</span>
          <span className="mt-1 block text-base font-extrabold tracking-tight text-slate-950">RapidLink</span>
        </span>
      )}
    </div>
  );
}
