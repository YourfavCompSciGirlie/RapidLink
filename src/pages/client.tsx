import { AlertTriangle, Building2, CheckCircle2, Clock3, Contact, Info, MapPin, Settings, UserRound, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AccessibleModal } from '@/components/accessible-modal';
import { Button } from '@/components/ui/button';
import { ActiveIncidentPanel } from '@/features/emergency/components/active-incident-panel';
import { AdditionalInfoForm } from '@/features/emergency/components/additional-info-form';
import { EmergencyButton } from '@/features/emergency/components/emergency-button';
import { getBrowserLocation, LocationStatus } from '@/features/emergency/components/location-status';
import { SosButton } from '@/features/emergency/components/sos-button';
import { EMERGENCY_SERVICES, serviceLabel } from '@/features/emergency/config';
import { useEmergency } from '@/features/emergency/emergency-context';
import { deleteDraft, loadDraft, saveDraft } from '@/features/emergency/media-store';
import { sessionService } from '@/features/emergency/session-service';
import { verifyCancellationPin } from '@/features/profile/profile-service';
import type { CapturedLocation, IncidentAttachment, IncidentDraft, ServiceType } from '@/features/emergency/types';

type ClientModal = 'prompt' | 'information' | 'status' | 'accepted' | 'cancellation' | 'cancellation-result' | 'escalation' | 'confirm-help' | null;

const emptyDraft: IncidentDraft = { happened: '', landmark: '', photo: null, audio: null, dirty: false };
const LOCATION_KEY = 'rapidlink-last-location-v1';

export default function ClientPage() {
  const { state, online, ready, refresh } = useEmergency();
  const profile = state.profile;
  const activeIncident = profile ? state.incidents.find(
    (incident) => incident.clientId === profile.id && !['completed', 'cancelled'].includes(incident.progress),
  ) : undefined;
  const lastClosedIncident = profile && !activeIncident ? state.incidents.filter((incident) => incident.clientId === profile.id && ['completed', 'cancelled'].includes(incident.progress)).at(-1) : undefined;
  const completedIncident = lastClosedIncident?.progress === 'completed' ? lastClosedIncident : undefined;
  const cancelledIncident = lastClosedIncident?.progress === 'cancelled' ? lastClosedIncident : undefined;
  const responder = state.employees.find((item) => item.id === activeIncident?.assignedEmployeeId);
  const station = state.stations.find((item) => item.id === (responder?.stationId ?? activeIncident?.stationId));
  const notifiedStations = state.stations.filter((item) => activeIncident?.notifiedStationIds.includes(item.id));
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [modal, setModal] = useState<ClientModal>(null);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<IncidentDraft>(emptyDraft);
  const [sendingInfo, setSendingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [acceptedQueued, setAcceptedQueued] = useState(false);
  const [escalationQueued, setEscalationQueued] = useState(false);
  const [completionQueued, setCompletionQueued] = useState(false);
  const [cancellationPin, setCancellationPin] = useState('');
  const [cancellationError, setCancellationError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [cancellationResult, setCancellationResult] = useState<'cancelled' | 'requested' | null>(null);
  const [searchCountdownSeconds, setSearchCountdownSeconds] = useState(0);
  const activationGuard = useRef(false);
  const initializedAssignment = useRef(false);
  const previousAssignment = useRef<string | undefined>();
  const seenEscalationStage = useRef(1);
  const seenCompletionRequest = useRef<string | undefined>();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCATION_KEY);
      if (stored) setLocation(JSON.parse(stored) as CapturedLocation);
    } catch {
      // Location persistence is optional.
    }
  }, []);

  const activeIncidentId = activeIncident?.id;

  useEffect(() => {
    if (ready && !activeIncident) activationGuard.current = false;
  }, [activeIncident, ready]);

  useEffect(() => {
    if (!activeIncidentId) return;
    void loadDraft(activeIncidentId).then((stored) => { if (stored) setDraft(stored); }).catch(() => undefined);
  }, [activeIncidentId]);

  useEffect(() => {
    if (!activeIncident || !draft.dirty) return;
    void saveDraft(activeIncident.id, draft).catch(() => undefined);
  }, [activeIncident, draft]);

  useEffect(() => {
    if (!ready) return;
    const current = activeIncident?.assignedEmployeeId;
    if (!initializedAssignment.current) {
      previousAssignment.current = current;
      initializedAssignment.current = true;
      return;
    }
    if (current && !previousAssignment.current) {
      if (modal === 'information') setAcceptedQueued(true);
      else setModal('accepted');
    }
    previousAssignment.current = current;
  }, [activeIncident?.assignedEmployeeId, modal, ready]);

  useEffect(() => {
    if (!activeIncidentId) return;
    setEscalationQueued(false);
    setCompletionQueued(false);
    seenCompletionRequest.current = undefined;
    const saved = Number(window.localStorage.getItem(`rapidlink-escalation-seen-${activeIncidentId}`) ?? '1');
    seenEscalationStage.current = Number.isFinite(saved) ? saved : 1;
  }, [activeIncidentId]);

  useEffect(() => {
    if (modal !== 'prompt' || !activeIncident?.nextEscalationAt) {
      setSearchCountdownSeconds(0);
      return;
    }
    const updateCountdown = () => {
      setSearchCountdownSeconds(Math.max(0, Math.ceil((Date.parse(activeIncident.nextEscalationAt!) - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [activeIncident?.nextEscalationAt, modal]);

  useEffect(() => {
    if (!activeIncident || activeIncident.searchStage <= seenEscalationStage.current) return;
    if (seenEscalationStage.current < 2) {
      if (modal) setEscalationQueued(true);
      else {
        seenEscalationStage.current = activeIncident.searchStage;
        window.localStorage.setItem(`rapidlink-escalation-seen-${activeIncident.id}`, String(activeIncident.searchStage));
        setModal('escalation');
      }
    } else {
      seenEscalationStage.current = activeIncident.searchStage;
      window.localStorage.setItem(`rapidlink-escalation-seen-${activeIncident.id}`, String(activeIncident.searchStage));
    }
  }, [activeIncident?.id, activeIncident?.searchStage, modal]);

  useEffect(() => {
    const request = activeIncident?.completionRequestStatus === 'pending' ? activeIncident.completionRequestedAt : undefined;
    if (!request || request === seenCompletionRequest.current) return;
    seenCompletionRequest.current = request;
    if (modal) setCompletionQueued(true);
    else setModal('confirm-help');
  }, [activeIncident?.completionRequestStatus, activeIncident?.completionRequestedAt, modal]);

  useEffect(() => {
    const updateLockout = () => {
      const until = state.profileSecurity?.lockedUntil ? Date.parse(state.profileSecurity.lockedUntil) : 0;
      setLockoutSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    };
    updateLockout();
    const timer = window.setInterval(updateLockout, 1000);
    return () => window.clearInterval(timer);
  }, [state.profileSecurity?.lockedUntil]);

  const saveLocation = useCallback(
    (captured: CapturedLocation) => {
      setLocation(captured);
      setLocationError('');
      try {
        window.localStorage.setItem(LOCATION_KEY, JSON.stringify(captured));
      } catch {
        // Current location is still usable for this session.
      }
      if (activeIncident) {
        sessionService.updateIncidentLocation(activeIncident.id, captured, draft.landmark);
        refresh();
      }
    },
    [activeIncident, draft.landmark, refresh],
  );

  const requestLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      saveLocation(await getBrowserLocation());
    } catch (cause) {
      setLocationError(cause instanceof Error ? cause.message : 'Location could not be determined.');
    } finally {
      setLocationLoading(false);
    }
  }, [saveLocation]);

  const activate = (service: ServiceType) => {
    if (activationGuard.current || activeIncident) return;
    activationGuard.current = true;
    const incidentId = `incident-${crypto.randomUUID()}`;
    sessionService.createIncident({ incidentId, service, location });
    sessionService.submitIncident(incidentId);
    refresh();
    setPulsingId(incidentId);
    setModal('prompt');
    window.setTimeout(() => setPulsingId(null), 5000);

    const capturedAt = location ? Date.parse(location.capturedAt) : 0;
    if (!location || Date.now() - capturedAt > 60_000) {
      void getBrowserLocation()
        .then((fresh) => {
          saveLocation(fresh);
          sessionService.updateIncidentLocation(incidentId, fresh);
          refresh();
        })
        .catch((cause: unknown) => {
          setLocationError(cause instanceof Error ? cause.message : 'Location could not be refreshed.');
        });
    }
  };

  const closeInformation = () => {
    if (completionQueued) setModal('confirm-help');
    else if (escalationQueued && activeIncident && activeIncident.searchStage > 1) {
      seenEscalationStage.current = activeIncident.searchStage;
      window.localStorage.setItem(`rapidlink-escalation-seen-${activeIncident.id}`, String(activeIncident.searchStage));
      setModal('escalation');
    } else setModal(acceptedQueued ? 'accepted' : 'status');
    setAcceptedQueued(false);
    setEscalationQueued(false);
    setCompletionQueued(false);
  };

  const closeModal = () => {
    setCancellationPin('');
    setCancellationError('');
    if (completionQueued) { setCompletionQueued(false); setModal('confirm-help'); return; }
    if (escalationQueued && activeIncident && activeIncident.searchStage > 1) {
      seenEscalationStage.current = activeIncident.searchStage;
      window.localStorage.setItem(`rapidlink-escalation-seen-${activeIncident.id}`, String(activeIncident.searchStage));
      setEscalationQueued(false);
      setModal('escalation');
      return;
    }
    setModal(null);
  };

  const confirmCancellation = async () => {
    if (!activeIncident || cancellationPin.length !== 6 || lockoutSeconds > 0 || checkingPin) return;
    setCheckingPin(true);
    setCancellationError('');
    const result = await verifyCancellationPin(cancellationPin);
    refresh();
    setCheckingPin(false);
    if (!result.ok) {
      setCancellationPin('');
      setCancellationError(result.lockedForSeconds
        ? `Incorrect cancellation PIN. The emergency request is still active. Try again in ${result.lockedForSeconds} seconds.`
        : `Incorrect cancellation PIN. The emergency request is still active. ${result.attemptsRemaining ?? 0} attempts remain.`);
      return;
    }
    const immediatelyCancelled = ['CREATING', 'WAITING_FOR_RESPONDER', 'FAILED'].includes(activeIncident.status);
    sessionService.cancelIncident(activeIncident.id);
    refresh();
    setCancellationPin('');
    setCancellationResult(immediatelyCancelled ? 'cancelled' : 'requested');
    setModal('cancellation-result');
  };

  const confirmHelp = (received: boolean) => {
    if (!activeIncident) return;
    sessionService.confirmHelpReceived(activeIncident.id, received);
    refresh();
    setEscalationQueued(false);
    setCompletionQueued(false);
    setModal(null);
  };

  const sendInformation = () => {
    if (!activeIncident) return;
    setSendingInfo(true);
    setInfoError('');
    const attachments = [draft.photo, draft.audio].filter(Boolean) as IncidentAttachment[];
    const result = sessionService.addIncidentInformation({
      incidentId: activeIncident.id,
      happened: draft.happened,
      landmark: draft.landmark,
      attachments,
    });
    const updated = result.incidents.find((item) => item.id === activeIncident.id);
    refresh();
    setSendingInfo(false);
    if (updated?.informationError) {
      setInfoError(`${updated.informationError} The original request remains active.`);
      return;
    }
    setDraft(emptyDraft);
    void deleteDraft(activeIncident.id).catch(() => undefined);
    closeInformation();
  };

  const statusTitle = useMemo(() => {
    if (!activeIncident) return 'Request status';
    if (activeIncident.progress === 'submission_failed') return 'Request not sent';
    if (activeIncident.status === 'CANCELLATION_REQUESTED') return 'Cancellation sent';
    if (activeIncident.completionRequestStatus === 'pending') return 'Confirm help received';
    if (activeIncident.assignedEmployeeId) return 'Help is on the way';
    if (activeIncident.deliveryState === 'sent' || activeIncident.deliveryState === 'no_responders') return 'Request sent';
    if (!activeIncident.location) return 'Location needed';
    return 'Sending request…';
  }, [activeIncident]);

  if (!profile) return <main className="min-h-[calc(100vh-4rem)] bg-white p-8 text-center font-bold text-[#003172]" role="status">Loading your profile…</main>;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white">
      {!online && <div className="bg-amber-700 px-4 py-3 text-center text-sm font-bold text-white" role="status">Connection lost — updates will send automatically when connectivity returns.</div>}
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-9">
        <header>
          <div className="flex items-center justify-between gap-4"><p className="text-sm font-bold text-slate-600">Client emergency request</p><Link to="/client/profile" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-[#003172] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><Settings className="h-5 w-5" /> Profile</Link></div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#003172] sm:text-4xl">What help do you need?</h1>
          <p className="mt-2 max-w-2xl text-base font-medium leading-6 text-slate-700">One tap sends your emergency request immediately. You can add details afterward.</p>
        </header>

        <section className="mt-7 text-center" aria-labelledby="sos-heading">
          <h2 id="sos-heading" className="text-xl font-extrabold text-[#003172]">Immediate combined response</h2>
          <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-slate-600">SOS immediately requests both police and ambulance support.</p>
          <div className="mt-6 py-3">
            <SosButton
              active={activeIncident?.service === 'sos'}
              pulsing={activeIncident?.service === 'sos' && pulsingId === activeIncident.id}
              disabled={Boolean(activeIncident)}
              onActivate={() => activate('sos')}
            />
          </div>
        </section>

        <div className="mt-7">
          <LocationStatus location={location} loading={locationLoading} error={locationError} onEnable={() => void requestLocation()} onPreset={saveLocation} />
        </div>

        <section aria-labelledby="services-heading" className="mt-7">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <h2 id="services-heading" className="text-xl font-extrabold text-slate-950">Choose an emergency service</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">The selected service turns red as the request starts.</p>
            </div>
            {activeIncident && <span className="shrink-0 rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-800">Request active</span>}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-5 py-3 sm:gap-7">
            {EMERGENCY_SERVICES.map((service) => (
              <EmergencyButton
                key={service.id}
                service={service}
                active={activeIncident?.service === service.id}
                pulsing={activeIncident?.service === service.id && pulsingId === activeIncident.id}
                disabled={Boolean(activeIncident)}
                onActivate={() => activate(service.id)}
              />
            ))}
          </div>
        </section>

        {activeIncident && (
          <div className="-mx-4 mt-8 sm:mx-0">
            <ActiveIncidentPanel
              incident={activeIncident}
              station={station}
              responder={responder}
              onAddInformation={() => setModal('information')}
              onView={() => setModal('status')}
              onRetry={() => { sessionService.submitIncident(activeIncident.id); refresh(); }}
            />
          </div>
        )}

        {completedIncident && <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" /><div><p className="text-sm font-bold">{completedIncident.reference}</p><h2 className="mt-1 text-xl font-extrabold">Incident completed</h2><p className="mt-1 text-sm font-semibold">The {serviceLabel(completedIncident.service).toLowerCase()} response has been closed. You can start another request if needed.</p></div></div></section>}

        {cancelledIncident && <section className="mt-8 bg-slate-100 p-5 text-slate-950"><div className="flex items-start gap-3"><XCircle className="mt-0.5 h-6 w-6 shrink-0 text-slate-700" /><div><p className="text-sm font-bold">{cancelledIncident.reference}</p><h2 className="mt-1 text-xl font-extrabold">Emergency request cancelled</h2><p className="mt-1 text-sm font-semibold">Your emergency request has been cancelled successfully.</p></div></div></section>}

        <section className="mt-8 pt-6" aria-labelledby="saved-details-heading">
          <h2 id="saved-details-heading" className="text-lg font-extrabold text-[#003172]">Saved emergency details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.10)]"><UserRound className="h-5 w-5 text-[#003172]" /><div><p className="font-bold text-slate-950">{profile.name} {profile.surname}</p><p className="text-sm text-slate-600">{profile.phone}</p></div></div>
            <div className="flex gap-3 rounded-xl bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.10)]"><Contact className="h-5 w-5 text-[#003172]" /><div><p className="font-bold text-slate-950">Emergency contact</p><p className="text-sm text-slate-600">{profile.nextOfKin.name} · {profile.nextOfKin.phone}</p></div></div>
          </div>
        </section>

      </div>

      <AccessibleModal open={modal === 'prompt'} title="Distress signal sent" description="Your emergency request was sent immediately. You can add information while responders are being contacted." onClose={() => setModal('status')}>
        <div className="rounded-lg bg-blue-50 p-4" role="status" aria-live="polite">
          <p className="font-bold text-[#003172]">
            {!activeIncident || activeIncident.deliveryState === 'pending'
              ? 'Sending your emergency request…'
              : activeIncident.deliveryState === 'sent' || activeIncident.deliveryState === 'no_responders'
                ? 'Your emergency request has been sent.'
                : 'Your emergency request was not sent.'}
          </p>
          {activeIncident?.deliveryState === 'failed' && <p className="mt-1 text-sm font-semibold text-red-700">Check your connection and retry from the active request panel.</p>}
        </div>
        {activeIncident?.status === 'WAITING_FOR_RESPONDER' && (
          <div className="mt-5 rounded-xl bg-slate-50 px-5 py-4 text-center">
            <p className="text-sm font-bold text-slate-600">Expanding the station search in</p>
            <p className="mt-1 text-5xl font-black tabular-nums text-[#003172]" aria-hidden="true">{searchCountdownSeconds}</p>
            <p className="text-sm font-semibold text-slate-600">seconds</p>
          </div>
        )}
        <div className="mt-5 grid gap-3">
          <Button className="min-h-12 w-full" onClick={() => setModal('information')}>Add additional information</Button>
          {activeIncident && activeIncident.status !== 'CANCELLATION_REQUESTED' && <Button variant="outline" className="min-h-12 w-full" onClick={() => { setCancellationPin(''); setCancellationError(''); setModal('cancellation'); }}>Cancel Response</Button>}
          <Button variant="ghost" className="min-h-12 w-full" onClick={() => setModal('status')}>Continue waiting</Button>
        </div>
      </AccessibleModal>

      <AccessibleModal open={modal === 'information'} title="Add information" description="This is optional. Your original emergency request remains active." onClose={closeInformation}>
        <AdditionalInfoForm
          draft={draft}
          onChange={setDraft}
          onSend={sendInformation}
          onSkip={closeInformation}
          acceptedNotice={acceptedQueued && responder && station ? `${responder.name} from ${station.name} accepted your request. Your draft is preserved.` : undefined}
          escalationNotice={escalationQueued && activeIncident ? `We’re expanding the search. ${activeIncident.notifiedStationIds.length} nearby stations have now been notified. Your draft is preserved.` : undefined}
          sending={sendingInfo}
          error={infoError}
        />
      </AccessibleModal>

      <AccessibleModal open={modal === 'status'} title={statusTitle} onClose={closeModal}>
        {activeIncident && (
          <div>
            {activeIncident.status === 'CANCELLATION_REQUESTED' ? (
              <div className="border-l-4 border-[#003172] bg-blue-50 p-4 text-[#003172]"><p className="font-bold">Cancellation sent. The assigned responder has been informed. Wait for confirmation that the response has been stopped.</p></div>
            ) : activeIncident.assignedEmployeeId && responder && station ? (
              <div className="border-l-4 border-emerald-600 bg-emerald-50 p-4 text-emerald-950"><p className="font-bold">{responder.name} {responder.surname} from {station.name} has accepted your emergency request.</p></div>
            ) : activeIncident.deliveryState === 'sent' || activeIncident.deliveryState === 'no_responders' ? (
              <p className="text-base leading-7 text-slate-700">Your emergency request has been sent to <strong>{station?.name}</strong>, the nearest appropriate station by straight-line distance. You will be notified as soon as a responder accepts your call.</p>
            ) : activeIncident.deliveryState === 'failed' ? (
              <p className="font-bold text-red-700">Request not sent. Check your connection and try again.</p>
            ) : (
              <p className="font-bold text-[#003172]">{activeIncident.location ? 'Sending request…' : 'Location is unresolved. Enable location or add a landmark so a station can be selected.'}</p>
            )}
            <dl className="mt-5 divide-y divide-slate-200 rounded-xl bg-slate-50 px-4 text-sm shadow-inner">
              <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Incident reference</dt><dd className="font-extrabold text-slate-950">{activeIncident.reference}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Service</dt><dd className="font-extrabold text-slate-950">{serviceLabel(activeIncident.service)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Station</dt><dd className="text-right font-extrabold text-slate-950">{station?.name ?? 'Not selected'}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Additional information</dt><dd className="font-extrabold text-slate-950">{activeIncident.information.length ? 'Sent' : activeIncident.informationError ? 'Failed, draft kept' : 'Not sent'}</dd></div>
            </dl>
            {activeIncident.deliveryState === 'no_responders' && <p className="mt-4 font-semibold text-amber-900">No employees are currently on duty for this service. No responder has accepted yet.</p>}
            {activeIncident.deliveryState === 'everyone_declined' && <p className="mt-4 font-semibold text-amber-900">Every offered responder declined. The request remains active and no responder has accepted yet.</p>}
            {activeIncident.cancellationResponse === 'continued' && <p className="mt-4 border-l-4 border-amber-600 bg-amber-50 p-3 font-semibold text-amber-950">The responder is continuing because assistance is still required or they are already on scene.</p>}
            <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button className="min-h-12" onClick={closeModal}>View request</Button><Button variant="outline" className="min-h-12" onClick={() => setModal('information')}>Add more information</Button></div>
          </div>
        )}
      </AccessibleModal>

      <AccessibleModal open={modal === 'accepted'} title="Help is on the way" onClose={closeModal}>
        {responder && station && activeIncident && (
          <div>
            <div className="flex items-start gap-3 bg-emerald-50 p-4 text-emerald-950"><CheckCircle2 className="h-6 w-6 shrink-0" /><p className="font-bold leading-6">{responder.name} {responder.surname} from {station.name} has accepted your emergency request.</p></div>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex gap-3"><Info className="h-4 w-4 text-slate-500" /><div><dt className="font-semibold text-slate-500">Service</dt><dd className="font-bold">{serviceLabel(activeIncident.service)}</dd></div></div>
              <div className="flex gap-3"><MapPin className="h-4 w-4 text-slate-500" /><div><dt className="font-semibold text-slate-500">Station</dt><dd className="font-bold">{station.name}</dd></div></div>
              <div className="flex gap-3"><Clock3 className="h-4 w-4 text-slate-500" /><div><dt className="font-semibold text-slate-500">Accepted</dt><dd className="font-bold">{new Date(activeIncident.acceptedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</dd></div></div>
            </dl>
            <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button onClick={closeModal}>View responder</Button><Button variant="outline" onClick={closeModal}>Close</Button></div>
          </div>
        )}
      </AccessibleModal>

      <AccessibleModal open={modal === 'escalation'} title="We’re expanding the search" description="Nobody has accepted your request yet. We have shared it with another nearby appropriate station." onClose={closeModal}>
        {activeIncident && <div>
          <dl className="divide-y divide-slate-200 bg-slate-50 px-4 text-sm">
            <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Original station</dt><dd className="text-right font-extrabold">{notifiedStations[0]?.name ?? 'Not available'}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Newly notified station</dt><dd className="text-right font-extrabold">{notifiedStations.at(-1)?.name ?? 'Not available'}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Emergency type</dt><dd className="text-right font-extrabold">{serviceLabel(activeIncident.service)}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Search stage</dt><dd className="font-extrabold">{activeIncident.searchStage}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Stations notified</dt><dd className="font-extrabold">{activeIncident.notifiedStationIds.length}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-slate-600">Current status</dt><dd className="font-extrabold">Waiting for a responder</dd></div>
          </dl>
          <Button className="mt-5 min-h-12 w-full" onClick={closeModal}>Continue waiting</Button>
        </div>}
      </AccessibleModal>

      <AccessibleModal open={modal === 'cancellation'} title="Cancel emergency request?" description="Enter your six-digit cancellation PIN to confirm. Your emergency request will remain active unless the correct PIN is entered." onClose={closeModal}>
        <label className="block font-bold text-slate-800">Six-digit cancellation PIN<input autoFocus className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-base tracking-[0.25em] outline-none focus:border-[#003172] focus:ring-4 focus:ring-blue-100" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="current-password" value={cancellationPin} onChange={(event) => setCancellationPin(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={lockoutSeconds > 0 || checkingPin} /></label>
        {lockoutSeconds > 0 && <p className="mt-3 font-semibold text-red-700" role="status">Too many incorrect attempts. Try again in {lockoutSeconds} seconds. The emergency remains active.</p>}
        {cancellationError && <p className="mt-3 font-semibold text-red-700" role="alert">{cancellationError}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button variant="outline" className="min-h-12" onClick={closeModal}>Keep request active</Button><Button variant="emergency" className="min-h-12" onClick={() => void confirmCancellation()} disabled={cancellationPin.length !== 6 || lockoutSeconds > 0 || checkingPin}>{checkingPin ? 'Checking PIN…' : 'Confirm cancellation'}</Button></div>
      </AccessibleModal>

      <AccessibleModal open={modal === 'cancellation-result'} title={cancellationResult === 'cancelled' ? 'Emergency request cancelled' : 'Cancellation sent'} onClose={closeModal}>
        <div className="flex items-start gap-3 bg-slate-50 p-4"><CheckCircle2 className="h-6 w-6 shrink-0 text-[#003172]" /><p className="font-bold leading-6">{cancellationResult === 'cancelled' ? 'Your emergency request has been cancelled successfully.' : 'The assigned responder has been informed. Wait for confirmation that the response has been stopped.'}</p></div>
        <Button className="mt-5 min-h-12 w-full" onClick={closeModal}>Close</Button>
      </AccessibleModal>

      <AccessibleModal open={modal === 'confirm-help'} title="Confirm help received" description="The responder has requested to close this incident. Confirm only after you have received the help you needed." onClose={() => setModal(null)}>
        <div className="flex items-start gap-3 border-l-4 border-[#003172] bg-blue-50 p-4 text-[#003172]"><Building2 className="h-6 w-6 shrink-0" /><p className="font-bold">Has the responder provided the required assistance?</p></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button variant="outline" className="min-h-12" onClick={() => confirmHelp(false)}><AlertTriangle className="h-5 w-5" /> I still need help</Button><Button className="min-h-12" onClick={() => confirmHelp(true)}><CheckCircle2 className="h-5 w-5" /> I received help</Button></div>
      </AccessibleModal>
    </main>
  );
}
