import { ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useEmergency } from '@/features/emergency/emergency-context';
import { emptyProfileInput, pinFieldClass, ProfileFields } from '@/features/profile/profile-fields';
import { registerProfile } from '@/features/profile/profile-service';
import { normalizePhone, validatePin, validateProfile, type ProfileErrors } from '@/features/profile/validation';
import type { RegistrationStatus } from '@/features/emergency/types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useEmergency();
  const [profile, setProfile] = useState(emptyProfileInput);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState<RegistrationStatus>('NOT_REGISTERED');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === 'SAVING') return;
    const nextErrors: ProfileErrors = { ...validateProfile(profile), ...validatePin(pin, confirmPin) };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('SAVE_FAILED');
      setMessage('Correct the marked fields. Your valid information has been kept.');
      return;
    }
    setStatus('SAVING');
    setMessage('Saving your profile…');
    try {
      await registerProfile({ ...profile, name: profile.name.trim(), surname: profile.surname.trim(), email: profile.email.trim(), phone: normalizePhone(profile.phone), nextOfKin: { name: profile.nextOfKin.name.trim(), phone: normalizePhone(profile.nextOfKin.phone) } }, pin);
      refresh();
      setStatus('REGISTERED');
      setMessage('Registration complete. Opening the emergency page.');
      navigate('/client', { replace: true });
    } catch {
      setStatus('SAVE_FAILED');
      setMessage('Your profile could not be saved. Try again.');
    }
  };

  const sameNumber = normalizePhone(profile.phone) && normalizePhone(profile.phone) === normalizePhone(profile.nextOfKin.phone);
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-[#003172]" aria-hidden="true" /><h1 className="text-3xl font-extrabold tracking-tight text-[#003172]">Register emergency details</h1></div>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">Provide the details a responder may need. Location permission is requested only when you use the emergency page.</p>
        </header>
        <form className="mt-7" onSubmit={(event) => void submit(event)} noValidate>
          <ProfileFields value={profile} errors={errors} onChange={setProfile} />
          {sameNumber && <p className="mt-4 border-l-4 border-amber-600 bg-amber-50 p-3 font-semibold text-amber-950" role="status">Your mobile number and next-of-kin number are identical. Use another contact where possible.</p>}
          <fieldset className="mt-7 border-t border-slate-200 pt-6">
            <legend className="text-xl font-extrabold text-[#003172]">Cancellation PIN</legend>
            <p className="mt-2 text-sm leading-6 text-slate-600">Choose six digits required to cancel an emergency. The PIN itself is never stored.</p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className="font-bold text-slate-800">Six-digit cancellation PIN<input className={pinFieldClass} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="new-password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-invalid={Boolean(errors.pin)} />{errors.pin && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.pin}</span>}</label>
              <label className="font-bold text-slate-800">Confirm cancellation PIN<input className={pinFieldClass} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="new-password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-invalid={Boolean(errors.confirmPin)} />{errors.confirmPin && <span className="mt-1 block text-sm font-semibold text-red-700">{errors.confirmPin}</span>}</label>
            </div>
          </fieldset>
          <div aria-live="polite" className="mt-7 min-h-6 text-sm font-semibold text-slate-700">{message}</div>
          <Button type="submit" className="mt-4 min-h-14 w-full text-base sm:w-auto sm:min-w-56" disabled={status === 'SAVING'}>{status === 'SAVING' ? 'Saving profile…' : 'Complete registration'}</Button>
        </form>
      </div>
    </main>
  );
}
