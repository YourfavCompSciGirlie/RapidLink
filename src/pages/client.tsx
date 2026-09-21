import { Camera, Check, CheckCircle2, Clock3, Contact, FileText, IdCard, Info, MapPin, Mic, Phone, Undo2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import type { CapturedLocation, IncidentAttachment, IncidentDraft, ServiceType } from '@/features/emergency/types';

type ClientModal = 'arming' | 'prompt' | 'information' | 'status' | 'accepted' | null;

const emptyDraft: IncidentDraft = { happened: '', landmark: '', photo: null, audio: null, dirty: false };
const LOCATION_KEY = 'rapidlink-last-location-v1';
const progressSteps = [
  { id: 'waiting', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'en_route', label: 'En route' },
  { id: 'arrived', label: 'Arrived' },
] as const;

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

  const progressIndex = activeIncident
    ? progressSteps.findIndex((step) => step.id === activeIncident.progress)
    : -1;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {!online && <div className="bg-amber-700 px-4 py-2.5 text-center text-sm font-semibold text-white" role="status">Offline · changes are saved on this device.</div>}
      <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
        {activeIncident && (
          <div className="mb-5 overflow-hidden rounded-2xl">
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

        <section className="relative rounded-3xl bg-white px-4 py-7 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:px-6 sm:py-9" aria-labelledby="emergency-actions-heading">
          <h1 id="emergency-actions-heading" className="sr-only">Request emergency help</h1>
          <div className="py-2">
            <SosButton
              active={activeIncident?.service === 'sos'}
              pulsing={!activeIncident || (activeIncident.service === 'sos' && pulsingId === activeIncident.id)}
              disabled={Boolean(activeIncident) || Boolean(pendingActivation)}
              onActivate={() => activate('sos')}
            />
          </div>
          <p className="mt-6 text-base font-bold text-slate-950">Press for immediate help</p>
          <p className="mt-1 text-sm text-slate-500">Police and ambulance · 5 seconds to cancel</p>
        </section>

        <div className="mt-5">
          <LocationStatus location={location} loading={locationLoading} error={locationError} onEnable={() => void requestLocation()} />
        </div>

        <section className="mt-6" aria-labelledby="service-options-heading">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Specific response</p>
            <h2 id="service-options-heading" className="mt-1 text-lg font-bold text-[#003172]">Choose a service</h2>
          </div>
          <div className="mx-auto mt-5 flex max-w-72 flex-wrap justify-center gap-4 sm:max-w-[21rem] sm:gap-5">
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
          {activeIncident && <p className="mt-4 text-center text-sm font-semibold text-red-700">An emergency request is active.</p>}
        </section>

        {completedIncident && <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-xs font-semibold">{completedIncident.reference}</p><h2 className="mt-0.5 font-bold">Incident completed</h2><p className="mt-1 text-sm">The {serviceLabel(completedIncident.service).toLowerCase()} response is closed.</p></div></div></section>}

        <section className="mt-7 pb-4" aria-labelledby="saved-details-heading">
          <h2 id="saved-details-heading" className="text-lg font-bold text-[#003172]">Saved emergency details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#003172]"><UserRound className="h-5 w-5" /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your details</p><h3 className="font-bold text-slate-950">{state.profile.name} {state.profile.surname}</h3></div>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3"><IdCard className="mt-0.5 h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">ID number</dt><dd className="font-medium text-slate-800">{state.profile.idNumber ?? 'Not added'}</dd></div></div>
                <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Phone number</dt><dd className="font-medium text-slate-800">{state.profile.phone}</dd></div></div>
              </dl>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#003172]"><Contact className="h-5 w-5" /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next of kin</p><h3 className="font-bold text-slate-950">{state.profile.nextOfKin?.name ?? 'Not added'}</h3></div>
              </div>
              <dl className="mt-4 text-sm">
                <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Phone number</dt><dd className="font-medium text-slate-800">{state.profile.nextOfKin?.phone ?? 'Not added'}</dd></div></div>
              </dl>
            </article>
          </div>
        </section>

      </div>

      <AccessibleModal open={modal === 'arming'} title="Sending alert" description="Cancel now if this was a mistake." onClose={undoActivation}>
        <div className="rounded-2xl bg-red-50 p-6 text-center"><p className="text-sm font-bold uppercase tracking-wider text-red-700">Transmitting in</p><p className="mt-2 text-6xl font-black tabular-nums text-red-800" aria-live="assertive">{countdown}</p><p className="mt-2 text-sm font-semibold text-red-900">seconds</p></div>
        <Button variant="outline" className="mt-5 min-h-14 w-full border-red-300 text-base text-red-800 hover:bg-red-50" onClick={undoActivation}><Undo2 className="h-5 w-5" /> Undo false alert</Button>
      </AccessibleModal>

      <AccessibleModal open={modal === 'prompt'} title="Alert sent" description="Add details now or skip." onClose={() => setModal('status')}>
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

      <AccessibleModal open={modal === 'information'} title="Add information" description="Optional. Your alert stays active." onClose={closeInformation}>
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
              <p className="text-base leading-7 text-slate-700">Sent to <strong>{station?.name}</strong>. You will be notified when a responder accepts.</p>
            ) : activeIncident.deliveryState === 'failed' ? (
              <p className="font-bold text-red-700">Request not sent. Your browser is offline or the submission failed.</p>
            ) : (
              <p className="font-bold text-[#003172]">{activeIncident.location ? 'Sending request…' : 'Location is unresolved. Enable location or add a landmark so a station can be selected.'}</p>
            )}

            {!['submission_failed', 'submitting'].includes(activeIncident.progress) && (
              <ol className="mt-5 grid grid-cols-4" aria-label="Request progress">
                {progressSteps.map((step, index) => {
                  const reached = progressIndex >= index;
                  return (
                    <li key={step.id} className="relative flex flex-col items-center text-center">
                      {index > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full ${progressIndex >= index ? 'bg-emerald-600' : 'bg-slate-200'}`} />}
                      <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${reached ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {reached ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className={`mt-1.5 text-[10px] font-bold sm:text-xs ${reached ? 'text-emerald-800' : 'text-slate-500'}`}>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl bg-slate-50 p-4 text-sm shadow-inner">
              <div><dt className="text-xs font-semibold text-slate-500">Reference</dt><dd className="mt-0.5 font-extrabold text-slate-950">{activeIncident.reference}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">Service</dt><dd className="mt-0.5 font-extrabold text-slate-950">{serviceLabel(activeIncident.service)}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">Station</dt><dd className="mt-0.5 font-extrabold text-slate-950">{station?.name ?? 'Not selected'}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">Reported</dt><dd className="mt-0.5 font-extrabold text-slate-950">{new Date(activeIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</dd></div>
            </dl>
            {activeIncident.deliveryState === 'no_responders' && <p className="mt-4 font-semibold text-amber-900">No employees are currently on duty for this service. No responder has accepted yet.</p>}
            {activeIncident.deliveryState === 'everyone_declined' && <p className="mt-4 font-semibold text-amber-900">Every offered responder declined. The request remains active and no responder has accepted yet.</p>}

            <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="additional-information-heading">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Optional details</p>
                  <h3 id="additional-information-heading" className="mt-0.5 text-sm font-bold text-slate-700">Additional information</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{activeIncident.information.length || 'None'}</span>
              </div>
              {activeIncident.information.length ? (
                <div className="mt-3 space-y-3">
                  {activeIncident.information.map((information) => (
                    <article key={information.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      {information.happened && <p className="flex items-start gap-2"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /><span>{information.happened}</span></p>}
                      {information.landmark && <p className="mt-2 flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /><span>{information.landmark}</span></p>}
                      {information.attachments.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {information.attachments.map((attachment) => attachment.kind === 'photo' ? (
                            <figure key={attachment.id} className="overflow-hidden rounded-lg bg-slate-100">
                              <img src={attachment.dataUrl} alt="Additional emergency information" className="max-h-32 w-full object-cover" />
                              <figcaption className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-slate-500"><Camera className="h-3 w-3" /> Photo</figcaption>
                            </figure>
                          ) : (
                            <div key={attachment.id} className="rounded-lg bg-slate-100 p-2">
                              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><Mic className="h-3 w-3" /> Voice recording</p>
                              <audio controls src={attachment.dataUrl} className="w-full" />
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-slate-500">No additional details have been added.</p>
              )}
            </section>

            <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button className="min-h-12" onClick={() => setModal('information')}>Add information</Button><Button variant="outline" className="min-h-12" onClick={() => setModal(null)}>Close</Button></div>
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
