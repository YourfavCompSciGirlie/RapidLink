import { createInitialState } from './fixtures';
import type {
  AcceptResult,
  AttendanceEntry,
  CapturedLocation,
  EmergencyAction,
  EmergencyState,
  Employee,
  Incident,
  IncidentAttachment,
  IncidentProgress,
  ServiceType,
  SessionRecord,
  SyncStatus,
} from './types';

export const ACTIVE_SESSION_KEY = 'rapidlink-active-session-v2';
const CHANNEL_NAME = 'rapidlink-session-events-v2';
const stateKey = (code: string) => `rapidlink-session-${code}`;
const queueKey = (code: string) => `rapidlink-actions-${code}`;

const now = () => new Date().toISOString();
const generatedId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const action = <T extends EmergencyAction['type']>(type: T, payload: Extract<EmergencyAction, { type: T }>['payload']) =>
  ({ id: crypto.randomUUID(), type, payload } as Extract<EmergencyAction, { type: T }>);

const storage = () => (typeof window === 'undefined' ? null : window.localStorage);
const activeCode = () => storage()?.getItem(ACTIVE_SESSION_KEY) ?? null;

export const normalizeRoomCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
export const generateRoomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (value) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[value % 32]).join('');

export const isAttendanceActive = (entry: AttendanceEntry | undefined, at = Date.now()) =>
  Boolean(entry && entry.choice === 'present' && !entry.endedAt && Date.parse(entry.shiftStart) <= at && Date.parse(entry.shiftEnd) > at);

export const employeeDuty = (state: EmergencyState, employeeId: string) => {
  const entries = state.attendance.filter((item) => item.employeeId === employeeId).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return isAttendanceActive(entries[0]);
};

export const employeeBusy = (state: EmergencyState, employeeId: string, excludeIncidentId?: string) =>
  state.incidents.some((incident) => incident.id !== excludeIncidentId && incident.assignedEmployeeId === employeeId && incident.progress !== 'completed');

const distanceKm = (location: CapturedLocation, latitude: number, longitude: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(latitude - location.latitude);
  const dLng = toRad(longitude - location.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(location.latitude)) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const routeIncident = (state: EmergencyState, incident: Incident): EmergencyState => {
  if (!incident.location) {
    return { ...state, incidents: state.incidents.map((item) => item.id === incident.id ? { ...item, progress: 'waiting' as const, deliveryState: 'pending' as const, submittedAt: now() } : item) };
  }
  const station = state.stations
    .filter((item) => incident.service === 'sos' ? item.services.includes('police') && item.services.includes('ambulance') : item.services.includes(incident.service))
    .map((item) => ({ item, distance: distanceKm(incident.location!, item.latitude, item.longitude) }))
    .sort((a, b) => a.distance - b.distance)[0]?.item;
  if (!station) {
    return { ...state, incidents: state.incidents.map((item) => item.id === incident.id ? { ...item, progress: 'waiting' as const, deliveryState: 'no_station' as const } : item) };
  }
  const routed: Incident = { ...incident, stationId: station.id, deliveryState: 'sent', progress: 'waiting', submittedAt: now() };
  const employees = state.employees.filter((employee) =>
    employee.stationId === station.id &&
    (employee.service === routed.service || (routed.service === 'sos' && (employee.service === 'police' || employee.service === 'ambulance'))) &&
    employee.active && employeeDuty(state, employee.id) && !employeeBusy(state, employee.id));
  if (!employees.length) {
    return { ...state, incidents: state.incidents.map((item) => item.id === incident.id ? { ...routed, deliveryState: 'no_responders' } : item) };
  }
  const createdAt = now();
  const offers = employees.map((employee) => ({ id: generatedId('offer'), incidentId: incident.id, employeeId: employee.id, status: 'open' as const, createdAt }));
  return {
    ...state,
    incidents: state.incidents.map((item) => item.id === incident.id ? routed : item),
    offers: [...state.offers, ...offers],
    messages: [...state.messages, ...offers.map((offer) => ({ id: generatedId('message'), offerId: offer.id, incidentId: incident.id, employeeId: offer.employeeId, createdAt }))],
  };
};

export function applyEmergencyAction(current: EmergencyState, event: EmergencyAction): EmergencyState {
  if (current.appliedActionIds.includes(event.id)) return current;
  const remember = (state: EmergencyState): EmergencyState => ({ ...state, revision: current.revision + 1, appliedActionIds: [...current.appliedActionIds.slice(-99), event.id] });
  if (event.type === 'reset-session') return remember(createInitialState());
  if (event.type === 'create-incident') {
    if (current.incidents.some((incident) => incident.clientId === current.profile.id && incident.progress !== 'completed')) return remember(current);
    const incident: Incident = {
      id: event.payload.incidentId,
      reference: `RL-${event.payload.incidentId.slice(-6).toUpperCase()}`,
      clientId: current.profile.id,
      service: event.payload.service,
      createdAt: now(), deliveryState: 'pending', progress: 'submitting', location: event.payload.location,
      information: [], declinedEmployeeIds: [],
    };
    return remember({ ...current, incidents: [...current.incidents, incident], audit: [...current.audit, { id: generatedId('audit'), type: 'incident-created', message: `${incident.reference} created`, createdAt: now() }] });
  }
  if (event.type === 'submit-incident') {
    const incident = current.incidents.find((item) => item.id === event.payload.incidentId);
    if (!incident || incident.deliveryState === 'sent') return remember(current);
    return remember(routeIncident(current, incident));
  }
  if (event.type === 'update-location') {
    const updated: EmergencyState = { ...current, incidents: current.incidents.map((incident) => incident.id === event.payload.incidentId ? { ...incident, location: event.payload.location, locationNote: event.payload.locationNote ?? incident.locationNote } : incident) };
    const incident = updated.incidents.find((item) => item.id === event.payload.incidentId);
    return remember(incident?.deliveryState === 'pending' && !incident.stationId ? routeIncident(updated, incident) : updated);
  }
  if (event.type === 'add-information') {
    return remember({ ...current, incidents: current.incidents.map((incident) => incident.id === event.payload.incidentId ? { ...incident, informationError: undefined, locationNote: event.payload.landmark || incident.locationNote, information: [...incident.information, { id: generatedId('information'), incidentId: incident.id, happened: event.payload.happened, landmark: event.payload.landmark, attachments: event.payload.attachments, createdAt: now() }] } : incident) });
  }
  if (event.type === 'save-attendance') {
    const existing = current.attendance.find((item) => item.employeeId === event.payload.employeeId && item.date === event.payload.date);
    const updatedAt = now();
    const entry: AttendanceEntry = { id: existing?.id ?? generatedId('attendance'), ...event.payload, endedAt: event.payload.choice === 'present' ? undefined : updatedAt, updatedAt, updatedBy: 'Supervisor N. Selemela' };
    return remember({ ...current, attendance: [...current.attendance.filter((item) => item.id !== entry.id), entry] });
  }
  if (event.type === 'end-shift') return remember({ ...current, attendance: current.attendance.map((entry) => entry.employeeId === event.payload.employeeId && isAttendanceActive(entry) ? { ...entry, endedAt: now(), updatedAt: now() } : entry) });
  if (event.type === 'add-employee') return remember({ ...current, employees: [...current.employees, { ...event.payload.employee, id: generatedId('employee') }] });
  if (event.type === 'update-employee') return remember({ ...current, employees: current.employees.map((item) => item.id === event.payload.employee.id ? event.payload.employee : item) });
  if (event.type === 'decline-offer') {
    const offer = current.offers.find((item) => item.id === event.payload.offerId);
    if (!offer || offer.status !== 'open') return remember(current);
    const offers = current.offers.map((item) => item.id === offer.id ? { ...item, status: 'declined' as const, respondedAt: now() } : item);
    const incidentOffers = offers.filter((item) => item.incidentId === offer.incidentId);
    const everyoneDeclined = incidentOffers.length > 0 && incidentOffers.every((item) => item.status === 'declined');
    return remember({ ...current, offers, incidents: current.incidents.map((incident) => incident.id === offer.incidentId ? { ...incident, deliveryState: everyoneDeclined ? 'everyone_declined' : incident.deliveryState, declinedEmployeeIds: [...incident.declinedEmployeeIds, offer.employeeId] } : incident) });
  }
  if (event.type === 'accept-offer') {
    const offer = current.offers.find((item) => item.id === event.payload.offerId);
    const incident = current.incidents.find((item) => item.id === offer?.incidentId);
    const employee = current.employees.find((item) => item.id === offer?.employeeId);
    if (!offer || !incident || !employee || incident.assignedEmployeeId || incident.progress === 'completed' || offer.status !== 'open' || !employee.active || !employeeDuty(current, employee.id) || employeeBusy(current, employee.id, incident.id)) return remember(current);
    const acceptedAt = now();
    return remember({
      ...current,
      incidents: current.incidents.map((item) => item.id === incident.id ? { ...item, assignedEmployeeId: employee.id, acceptedAt, progress: 'accepted' } : item),
      offers: current.offers.map((item) => item.incidentId !== incident.id ? item : item.id === offer.id ? { ...item, status: 'accepted', respondedAt: acceptedAt } : { ...item, status: 'closed' }),
      audit: [...current.audit, { id: generatedId('audit'), type: 'accepted', message: `${employee.employeeNumber} accepted ${incident.reference}`, createdAt: acceptedAt }],
    });
  }
  if (event.type === 'update-progress') return remember({ ...current, incidents: current.incidents.map((incident) => incident.id === event.payload.incidentId && incident.assignedEmployeeId === event.payload.employeeId ? { ...incident, progress: event.payload.progress } : incident) });
  return remember(current);
}

const readQueue = (code: string): EmergencyAction[] => {
  try { return JSON.parse(storage()?.getItem(queueKey(code)) ?? '[]') as EmergencyAction[]; } catch { return []; }
};

const writeQueue = (code: string, events: EmergencyAction[]) => storage()?.setItem(queueKey(code), JSON.stringify(events));

export const readState = (code = activeCode() ?? 'LOCAL1'): EmergencyState => {
  try {
    const saved = storage()?.getItem(stateKey(code));
    return saved ? (JSON.parse(saved) as EmergencyState) : createInitialState();
  } catch { return createInitialState(); }
};

let remoteAvailable = true;
let flushing = false;

const announce = (code: string, state: EmergencyState) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('rapidlink-state', { detail: state }));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ code, state });
    channel.close();
  }
};

const writeLocal = (code: string, state: EmergencyState) => {
  storage()?.setItem(stateKey(code), JSON.stringify(state));
  announce(code, state);
  return state;
};

const mergePending = (state: EmergencyState, pending: EmergencyAction[]) => pending.reduce(applyEmergencyAction, state);

export const receiveRemoteState = (code: string, state: EmergencyState) => writeLocal(code, mergePending(state, readQueue(code)));

const uploadQueuedMedia = async (code: string, event: EmergencyAction): Promise<EmergencyAction> => {
  if (event.type !== 'add-information') return event;
  const attachments = await Promise.all(event.payload.attachments.map(async (attachment) => {
    if (!attachment.dataUrl.startsWith('data:')) return attachment;
    const blob = await fetch(attachment.dataUrl).then((response) => response.blob());
    const form = new FormData();
    form.append('file', new File([blob], attachment.name, { type: attachment.mimeType }));
    const response = await fetch(`/api/sessions/${code}/attachments`, { method: 'POST', body: form });
    if (!response.ok) return attachment;
    const uploaded = await response.json() as { storagePath: string; url: string };
    return { ...attachment, dataUrl: uploaded.url, storagePath: uploaded.storagePath };
  }));
  return { ...event, payload: { ...event.payload, attachments } };
};

export async function syncFromRemote(code = activeCode()) {
  if (!code || typeof navigator === 'undefined' || !navigator.onLine) return readState(code ?? 'LOCAL1');
  try {
    const response = await fetch(`/api/sessions/${code}`, { cache: 'no-store' });
    if (!response.ok) { remoteAvailable = response.status !== 503; return readState(code); }
    const record = await response.json() as SessionRecord;
    remoteAvailable = true;
    return receiveRemoteState(code, record.state);
  } catch { remoteAvailable = false; return readState(code); }
}

export async function flushPending(code = activeCode()) {
  if (!code || flushing || typeof navigator === 'undefined' || !navigator.onLine) return;
  flushing = true;
  try {
    let queue = readQueue(code);
    while (queue.length) {
      const nextAction = await uploadQueuedMedia(code, queue[0]);
      const response = await fetch(`/api/sessions/${code}/actions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(nextAction) });
      if (!response.ok) { remoteAvailable = response.status !== 503; break; }
      const record = await response.json() as SessionRecord;
      queue = queue.slice(1);
      writeQueue(code, queue);
      remoteAvailable = true;
      writeLocal(code, mergePending(record.state, queue));
    }
  } catch { remoteAvailable = false; }
  finally { flushing = false; announce(code, readState(code)); }
}

const commit = (event: EmergencyAction) => {
  const code = activeCode() ?? 'LOCAL1';
  const next = applyEmergencyAction(readState(code), event);
  writeLocal(code, next);
  writeQueue(code, [...readQueue(code), event]);
  void flushPending(code);
  return next;
};

export async function createSession(code = generateRoomCode()) {
  const normalized = normalizeRoomCode(code);
  storage()?.setItem(ACTIVE_SESSION_KEY, normalized);
  let state = createInitialState();
  try {
    const response = await fetch('/api/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: normalized }) });
    if (response.ok) state = ((await response.json()) as SessionRecord).state;
    remoteAvailable = response.ok;
  } catch { remoteAvailable = false; }
  writeQueue(normalized, []);
  writeLocal(normalized, state);
  return normalized;
}

export async function joinSession(code: string) {
  const normalized = normalizeRoomCode(code);
  if (normalized.length !== 6) throw new Error('Enter a six-character room code.');
  storage()?.setItem(ACTIVE_SESSION_KEY, normalized);
  const response = await fetch(`/api/sessions/${normalized}`, { cache: 'no-store' }).catch(() => null);
  if (response?.ok) {
    remoteAvailable = true;
    const record = await response.json() as SessionRecord;
    writeLocal(normalized, record.state);
  } else if (!storage()?.getItem(stateKey(normalized))) {
    if (response && response.status === 404) throw new Error('That room could not be found.');
    remoteAvailable = false;
    writeLocal(normalized, createInitialState());
  }
  return normalized;
}

export const getActiveSessionCode = activeCode;
export const getSyncStatus = (): SyncStatus => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  const code = activeCode();
  if (!remoteAvailable || (code && readQueue(code).length)) return 'saved';
  if (flushing) return 'syncing';
  return 'synced';
};

export const sessionService = {
  subscribe(listener: (state: EmergencyState) => void) {
    if (typeof window === 'undefined') return () => undefined;
    const local = (event: Event) => listener((event as CustomEvent<EmergencyState>).detail);
    const storageListener = (event: StorageEvent) => { if (event.key?.startsWith('rapidlink-session-')) listener(readState()); };
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    const channelListener = (event: MessageEvent<{ code: string; state: EmergencyState }>) => { if (event.data.code === activeCode()) listener(event.data.state); };
    window.addEventListener('rapidlink-state', local);
    window.addEventListener('storage', storageListener);
    channel?.addEventListener('message', channelListener);
    return () => { window.removeEventListener('rapidlink-state', local); window.removeEventListener('storage', storageListener); channel?.removeEventListener('message', channelListener); channel?.close(); };
  },
  reset() { return commit(action('reset-session', {})); },
  createIncident(payload: { incidentId: string; service: ServiceType; location: CapturedLocation | null }) { return commit(action('create-incident', payload)); },
  submitIncident(incidentId: string) { return commit(action('submit-incident', { incidentId })); },
  updateIncidentLocation(incidentId: string, location: CapturedLocation, locationNote?: string) { return commit(action('update-location', { incidentId, location, locationNote })); },
  addIncidentInformation(payload: { incidentId: string; happened: string; landmark: string; attachments: IncidentAttachment[] }) { return commit(action('add-information', payload)); },
  saveAttendance(payload: Extract<EmergencyAction, { type: 'save-attendance' }>['payload']) { return commit(action('save-attendance', payload)); },
  endShift(employeeId: string) { return commit(action('end-shift', { employeeId })); },
  addEmployee(employee: Omit<Employee, 'id'>) { return commit(action('add-employee', { employee })); },
  updateEmployee(employee: Employee) { return commit(action('update-employee', { employee })); },
  declineIncident(offerId: string) { return commit(action('decline-offer', { offerId })); },
  async acceptIncident(offerId: string): Promise<AcceptResult> {
    const state = readState();
    const offer = state.offers.find((item) => item.id === offerId);
    const incident = state.incidents.find((item) => item.id === offer?.incidentId);
    const employee = state.employees.find((item) => item.id === offer?.employeeId);
    if (!offer || !incident || !employee || offer.status !== 'open') return { ok: false, reason: 'invalid' };
    if (incident.assignedEmployeeId && incident.assignedEmployeeId !== employee.id) return { ok: false, reason: 'assigned' };
    if (!employee.active) return { ok: false, reason: 'inactive' };
    if (!employeeDuty(state, employee.id)) return { ok: false, reason: 'off_duty' };
    if (employeeBusy(state, employee.id, incident.id)) return { ok: false, reason: 'busy' };
    commit(action('accept-offer', { offerId }));
    await flushPending();
    const accepted = readState().incidents.find((item) => item.id === incident.id);
    return accepted?.assignedEmployeeId === employee.id ? { ok: true, incident: accepted, employee } : { ok: false, reason: 'assigned' };
  },
  updateIncidentProgress(incidentId: string, employeeId: string, progress: IncidentProgress) { return commit(action('update-progress', { incidentId, employeeId, progress })); },
};
