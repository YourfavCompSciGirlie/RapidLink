import { ShieldAlert } from 'lucide-react';

export function ServiceNotice() {
  return (
    <div className="flex items-start gap-2 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-[0_2px_8px_rgba(120,53,15,0.08)]">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>RapidLink is not connected to public emergency call centres. If lives are at immediate risk, call 112.</p>
    </div>
  );
}
