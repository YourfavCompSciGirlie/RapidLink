import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('leading-none', className)}>
      <span className="block text-[11px] font-bold text-slate-600">Tshwane</span>
      <span className="mt-0.5 block text-lg font-extrabold tracking-tight text-[#003172]">RapidLink</span>
    </div>
  );
}
