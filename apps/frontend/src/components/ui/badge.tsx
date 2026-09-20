import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const styles = {
  slate: 'bg-slate-100 text-slate-700',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  dark: 'bg-slate-900 text-white',
};

export function Badge({
  className,
  tone = 'slate',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof styles }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset ring-transparent',
        styles[tone],
        className,
      )}
      {...props}
    />
  );
}
