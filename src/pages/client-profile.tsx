import { ArrowLeft, KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useEmergency } from '@/features/emergency/emergency-context';
import { pinFieldClass, ProfileFields } from '@/features/profile/profile-fields';
import { changeCancellationPin, updateProfile } from '@/features/profile/profile-service';
import { normalizePhone, validatePin, validateProfile, type ProfileErrors } from '@/features/profile/validation';

export default function ClientProfilePage() {
  const { state, refresh } = useEmergency();
  const current = state.profile!;
  const [profile, setProfile] = useState({ name: current.name, surname: current.surname, email: current.email, southAfricanId: current.southAfricanId, phone: current.phone, nextOfKin: { ...current.nextOfKin } });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  const saveDetails = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProfile(profile);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setMessage('Correct the marked fields.'); return; }
    setSaving(true);
    updateProfile({ ...profile, phone: normalizePhone(profile.phone), nextOfKin: { ...profile.nextOfKin, phone: normalizePhone(profile.nextOfKin.phone) } });
    refresh();
    setSaving(false);
    setMessage('Profile details saved.');
  };

  const changePin = async (event: FormEvent) => {
    event.preventDefault();
    const pinErrors = validatePin(nextPin, confirmPin);
    const nextErrors: ProfileErrors = { ...pinErrors };
    if (!/^\d{6}$/.test(currentPin)) nextErrors.currentPin = 'Enter your current six-digit PIN.';
    setErrors((existing) => ({ ...existing, ...nextErrors }));
    if (Object.keys(nextErrors).length) return;
    setPinMessage('Checking your current PIN…');
    const result = await changeCancellationPin(currentPin, nextPin);
    refresh();
    if (!result.ok) {
      setPinMessage(result.lockedForSeconds ? `PIN attempts are locked for ${result.lockedForSeconds} seconds.` : `Current PIN is incorrect. ${result.attemptsRemaining ?? 0} attempts remain.`);
      return;
    }
    setCurrentPin(''); setNextPin(''); setConfirmPin('');
    setPinMessage('Cancellation PIN changed.');
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white"><div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link to="/client" className="inline-flex min-h-11 items-center gap-2 font-bold text-[#003172] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><ArrowLeft className="h-5 w-5" /> Emergency page</Link>
      <h1 className="mt-5 text-3xl font-extrabold text-[#003172]">Edit profile</h1>
      <p className="mt-2 text-base text-slate-700">Update contact details without exposing your cancellation PIN.</p>
      <form className="mt-7" onSubmit={saveDetails} noValidate><ProfileFields value={profile} errors={errors} onChange={setProfile} /><div className="mt-4 min-h-6 text-sm font-semibold" aria-live="polite">{message}</div><Button className="mt-3 min-h-12" disabled={saving}>{saving ? 'Saving…' : 'Save profile details'}</Button></form>
      <section className="mt-10 border-t border-slate-200 pt-7"><div className="flex items-center gap-3"><KeyRound className="h-6 w-6 text-[#003172]" /><h2 className="text-2xl font-extrabold text-[#003172]">Change cancellation PIN</h2></div>
        <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={(event) => void changePin(event)} noValidate>
          <label className="font-bold sm:col-span-2">Current PIN<input className={pinFieldClass} type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))} />{errors.currentPin && <span className="mt-1 block text-sm text-red-700">{errors.currentPin}</span>}</label>
          <label className="font-bold">New six-digit PIN<input className={pinFieldClass} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={nextPin} onChange={(event) => setNextPin(event.target.value.replace(/\D/g, '').slice(0, 6))} />{errors.pin && <span className="mt-1 block text-sm text-red-700">{errors.pin}</span>}</label>
          <label className="font-bold">Confirm new PIN<input className={pinFieldClass} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))} />{errors.confirmPin && <span className="mt-1 block text-sm text-red-700">{errors.confirmPin}</span>}</label>
          <div className="sm:col-span-2"><div className="min-h-6 text-sm font-semibold" aria-live="polite">{pinMessage}</div><Button className="mt-3 min-h-12">Change PIN</Button></div>
        </form>
      </section>
    </div></main>
  );
}
