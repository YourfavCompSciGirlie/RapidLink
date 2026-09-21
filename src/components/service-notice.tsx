import { ShieldAlert } from 'lucide-react';

export function ServiceNotice() {
  return <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-950"><ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" /><p>Prototype experience · For an actual emergency, call 112.</p></div>;
}
