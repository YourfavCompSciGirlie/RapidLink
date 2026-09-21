'use client';

import { CheckCircle2, Clock3, Contact, Info, MapPin, Undo2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AccessibleModal } from '@/components/accessible-modal';
import { ServiceNotice } from '@/components/service-notice';
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
import type { CapturedLocation, IncidentAttachment, IncidentDraft, ServiceType } from '@/features/emergency/types';

type ClientModal = 'arming' | 'prompt' | 'information' | 'status' | 'accepted' | null;

const emptyDraft: IncidentDraft = { happened: '', landmark: '', photo: null, audio: null, dirty: false };
const LOCATION_KEY = 'rapidlink-last-location-v1';

export default function ClientPage() {
  const { state, online, ready, refresh } = useEmergency();
  const activeIncident = state.incidents.find(
    (incident) => incident.clientId === state.profile.id && incident.progress !== 'completed',
  );
  const completedIncident = !activeIncident ? state.incidents.filter((incident) => incident.clientId === state.profile.id && incident.progress === 'completed').at(-1) : undefined;
  const station = state.stations.find((item) => item.id === activeIncident?.stationId);
  const responder = state.employees.find((item) => item.id === activeIncident?.assignedEmployeeId);
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [modal, setModal] = useState<ClientModal>(null);
  const [countdown, setCountdown] = useState(5);
  const [pendingActivation, setPendingActivation] = useState<{ incidentId: string; service: ServiceType } | null>(null);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<IncidentDraft>(emptyDraft);
  const [sendingInfo, setSendingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [acceptedQueued, setAcceptedQueued] = useState(false);
  const activationGuard = useRef(false);
  const initializedAssignment = useRef(false);
  const previousAssignment = useRef<string | undefined>();

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
    if (ready && !activeIncident && !pendingActivation && modal !== 'arming') activationGuard.current = false;
  }, [activeIncident, modal, pendingActivation, ready]);

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
    setPendingActivation({ incidentId: `incident-${crypto.randomUUID()}`, service });
    setCountdown(5);
    setModal('arming');
  };

  const transmit = useCallback(() => {
    if (!pendingActivation) return;
    const { incidentId, service } = pendingActivation;
    sessionService.createIncident({ incidentId, service, location });
    sessionService.submitIncident(incidentId);
    refresh();
    setPulsingId(incidentId);
    setPendingActivation(null);
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
  }, [location, pendingActivation, refresh, saveLocation]);

  useEffect(() => {
    if (modal !== 'arming' || !pendingActivation) return;
    if (countdown <= 0) { transmit(); return; }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, modal, pendingActivation, transmit]);

  const undoActivation = () => {
    setPendingActivation(null);
    setModal(null);
    setCountdown(5);
    activationGuard.current = false;
  };

  const closeInformation = () => {
    setModal(acceptedQueued ? 'accepted' : 'status');
    setAcceptedQueued(false);
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
    if (activeIncident.assignedEmployeeId) return 'Help is on the way';
    if (activeIncident.deliveryState === 'sent' || activeIncident.deliveryState === 'no_responders') return 'Request sent';
    if (!activeIncident.location) return 'Location needed';
    return 'Sending request…';
  }, [activeIncident]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white">
      <ServiceNotice />
      {!online && <div className="bg-amber-700 px-4 py-3 text-center text-sm font-bold text-white" role="status">Offline — this device will save the workflow and synchronize after reconnection.</div>}
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-9">
        <header>
          <p className="text-sm font-bold text-slate-600">Client emergency request</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#003172] sm:text-4xl">What help do you need?</h1>
          <p className="mt-2 max-w-2xl text-base font-medium leading-6 text-slate-700">One tap begins a five-second safety countdown. You can add details after the request is sent.</p>
        </header>

        <section className="mt-7 text-center" aria-labelledby="sos-heading">
          <h2 id="sos-heading" className="text-xl font-extrabold text-[#003172]">Immediate combined response</h2>
          <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-slate-600">SOS immediately requests both police and ambulance support.</p>
          <div className="mt-6 py-3">
            <SosButton
              active={activeIncident?.service === 'sos'}
              pulsing={activeIncident?.service === 'sos' && pulsingId === activeIncident.id}
              disabled={Boolean(activeIncident) || Boolean(pendingActivation)}
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
                disabled={Boolean(activeIncident) || Boolean(pendingActivation)}
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

        <section className="mt-8 pt-6" aria-labelledby="saved-details-heading">
          <h2 id="saved-details-heading" className="text-lg font-extrabold text-[#003172]">Saved emergency details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.10)]"><UserRound className="h-5 w-5 text-[#003172]" /><div><p className="font-bold text-slate-950">{state.profile.name} {state.profile.surname}</p><p className="text-sm text-slate-600">{state.profile.phone}</p></div></div>
            <div className="flex gap-3 rounded-xl bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.10)]"><Contact className="h-5 w-5 text-[#003172]" /><div><p className="font-bold text-slate-950">Emergency contact</p><p className="text-sm text-slate-600">{state.profile.nextOfKin?.name} · {state.profile.nextOfKin?.phone}</p></div></div>
          </div>
        </section>

      </div>

      <AccessibleModal open={modal === 'arming'} title="Sending emergency request" description="Use this safety window if the alert was activated by mistake." onClose={undoActivation}>
        <div className="rounded-2xl bg-red-50 p-6 text-center"><p className="text-sm font-bold uppercase tracking-wider text-red-700">Transmitting in</p><p className="mt-2 text-6xl font-black tabular-nums text-red-800" aria-live="assertive">{countdown}</p><p className="mt-2 text-sm font-semibold text-red-900">seconds</p></div>
        <Button variant="outline" className="mt-5 min-h-14 w-full border-red-300 text-base text-red-800 hover:bg-red-50" onClick={undoActivation}><Undo2 className="h-5 w-5" /> Undo false alert</Button>
      </AccessibleModal>

      <AccessibleModal open={modal === 'prompt'} title="Request sent" description="Add details if you can. Your emergency request does not depend on completing this step." onClose={() => setModal('status')}>
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
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button className="min-h-12" onClick={() => setModal('information')}>Add information</Button>
          <Button variant="outline" className="min-h-12" onClick={() => setModal('status')}>Skip</Button>
        </div>
      </AccessibleModal>

      <AccessibleModal open={modal === 'information'} title="Add information" description="This is optional. Your original emergency request remains active." onClose={closeInformation}>
        <AdditionalInfoForm
          draft={draft}
          onChange={setDraft}
          onSend={sendInformation}
          onSkip={closeInformation}
          acceptedNotice={acceptedQueued && responder && station ? `${responder.name} from ${station.name} accepted your request. Your draft is preserved.` : undefined}
          sending={sendingInfo}
          error={infoError}
        />
      </AccessibleModal>

      <AccessibleModal open={modal === 'status'} title={statusTitle} onClose={() => setModal(null)}>
        {activeIncident && (
          <div>
            {activeIncident.assignedEmployeeId && responder && station ? (
              <div className="border-l-4 border-emerald-600 bg-emerald-50 p-4 text-emerald-950"><p className="font-bold">{responder.name} {responder.surname} from {station.name} has accepted your emergency request.</p></div>
            ) : activeIncident.deliveryState === 'sent' || activeIncident.deliveryState === 'no_responders' ? (
              <p className="text-base leading-7 text-slate-700">Your emergency request has been sent to <strong>{station?.name}</strong>, the nearest appropriate station by straight-line distance. You will be notified as soon as a responder accepts your call.</p>
            ) : activeIncident.deliveryState === 'failed' ? (
              <p className="font-bold text-red-700">Request not sent. Your browser is offline or the submission failed.</p>
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
            <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button className="min-h-12" onClick={() => setModal(null)}>View request</Button><Button variant="outline" className="min-h-12" onClick={() => setModal('information')}>Add more information</Button></div>
          </div>
        )}
      </AccessibleModal>

      <AccessibleModal open={modal === 'accepted'} title="Help is on the way" onClose={() => setModal(null)}>
        {responder && station && activeIncident && (
          <div>
            <div className="flex items-start gap-3 bg-emerald-50 p-4 text-emerald-950"><CheckCircle2 className="h-6 w-6 shrink-0" /><p className="font-bold leading-6">{responder.name} {responder.surname} from {station.name} has accepted your emergency request.</p></div>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex gap-3"><Info className="h-4 w-4 text-slate-500" /><div><dt className="font-semibold text-slate-500">Service</dt><dd className="font-bold">{serviceLabel(activeIncident.service)}</dd></div></div>
              <div className="flex gap-3"><MapPin className="h-4 w-4 text-slate-500" /><div><dt className="font-semibold text-slate-500">Station</dt><dd className="font-bold">{station.name}</dd></div></div>
              <div className="flex gap-3"><Clock3 className="h-4 w-4 text-slate-500" /><div><dt className="font-semibold text-slate-500">Accepted</dt><dd className="font-bold">{new Date(activeIncident.acceptedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</dd></div></div>
            </dl>
            <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button onClick={() => setModal(null)}>View responder</Button><Button variant="outline" onClick={() => setModal(null)}>Close</Button></div>
          </div>
        )}
      </AccessibleModal>
    </main>
  );
}
