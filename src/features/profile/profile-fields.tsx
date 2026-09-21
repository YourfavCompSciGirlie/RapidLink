import type { ChangeEvent } from 'react';

import type { ProfileInput } from './profile-service';
import type { ProfileErrors } from './validation';

const fieldClass = 'mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-[#003172] focus:ring-4 focus:ring-blue-100';

export const emptyProfileInput: ProfileInput = {
  name: '', surname: '', email: '', southAfricanId: '', phone: '', nextOfKin: { name: '', phone: '' },
};

export function ProfileFields({ value, errors, onChange }: { value: ProfileInput; errors: ProfileErrors; onChange: (value: ProfileInput) => void }) {
  const text = (key: keyof Omit<ProfileInput, 'nextOfKin'>) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = key === 'southAfricanId' ? event.target.value.replace(/\D/g, '').slice(0, 13) : event.target.value;
    onChange({ ...value, [key]: next });
  };
  const kin = (key: 'name' | 'phone') => (event: ChangeEvent<HTMLInputElement>) => onChange({ ...value, nextOfKin: { ...value.nextOfKin, [key]: event.target.value } });
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block font-bold text-slate-800">Name<input className={fieldClass} value={value.name} onChange={text('name')} autoComplete="given-name" aria-invalid={Boolean(errors.name)} />{errors.name && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.name}</span>}</label>
      <label className="block font-bold text-slate-800">Surname<input className={fieldClass} value={value.surname} onChange={text('surname')} autoComplete="family-name" aria-invalid={Boolean(errors.surname)} />{errors.surname && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.surname}</span>}</label>
      <label className="block font-bold text-slate-800 sm:col-span-2">Email address<input className={fieldClass} type="email" value={value.email} onChange={text('email')} autoComplete="email" aria-invalid={Boolean(errors.email)} />{errors.email && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.email}</span>}</label>
      <label className="block font-bold text-slate-800">South African ID number<input className={fieldClass} value={value.southAfricanId} onChange={text('southAfricanId')} inputMode="numeric" pattern="[0-9]*" maxLength={13} autoComplete="off" aria-invalid={Boolean(errors.southAfricanId)} />{errors.southAfricanId && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.southAfricanId}</span>}</label>
      <label className="block font-bold text-slate-800">Client mobile number<input className={fieldClass} type="tel" value={value.phone} onChange={text('phone')} autoComplete="tel" placeholder="072 123 4567" aria-invalid={Boolean(errors.phone)} />{errors.phone && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.phone}</span>}</label>
      <label className="block font-bold text-slate-800">Next-of-kin name<input className={fieldClass} value={value.nextOfKin.name} onChange={kin('name')} autoComplete="name" aria-invalid={Boolean(errors.nextOfKin)} />{errors.nextOfKin?.includes('name') && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.nextOfKin}</span>}</label>
      <label className="block font-bold text-slate-800">Next-of-kin mobile number<input className={fieldClass} type="tel" value={value.nextOfKin.phone} onChange={kin('phone')} autoComplete="tel" placeholder="073 123 4567" aria-invalid={Boolean(errors.nextOfKin)} />{errors.nextOfKin && !errors.nextOfKin.includes('name') && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.nextOfKin}</span>}</label>
    </div>
  );
}

export const pinFieldClass = fieldClass;
