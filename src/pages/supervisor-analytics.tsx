import { Activity, ArrowLeft, BarChart3, CheckCircle2, Clock3, FileSearch, Search, ShieldCheck, Siren, UserRound, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AccessibleModal } from '@/components/accessible-modal';
import { Button } from '@/components/ui/button';
import { serviceLabel } from '@/features/emergency/config';
import { useEmergency } from '@/features/emergency/emergency-context';
import type { Incident, ServiceType } from '@/features/emergency/types';

const SUPERVISOR_STATION_ID = 'station-garankuwa';
type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

const activeStatuses = new Set(['CREATING', 'WAITING_FOR_RESPONDER', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'CANCELLATION_REQUESTED']);

function minutesBetween(start: string, end?: string) {
  if (!end) return null;
  return Math.max(0, (Date.parse(end) - Date.parse(start)) / 60_000);
}

function durationLabel(minutes: number | null) {
  if (minutes === null) return '—';
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return `${hours}h${remainder ? ` ${remainder}m` : ''}`;
}

function statusLabel(incident: Incident) {
  if (incident.status === 'WAITING_FOR_RESPONDER') return 'Waiting';
  if (incident.status === 'EN_ROUTE') return 'En route';
  if (incident.status === 'CANCELLATION_REQUESTED') return 'Cancellation requested';
  if (incident.status === 'COMPLETED') return 'Completed';
  if (incident.status === 'CANCELLED') return 'Cancelled';
  if (incident.status === 'FAILED') return 'Failed';
  return incident.status.charAt(0) + incident.status.slice(1).toLowerCase();
}

function statusClasses(incident: Incident) {
  if (incident.status === 'COMPLETED') return 'bg-emerald-100 text-emerald-900';
  if (incident.status === 'CANCELLED' || incident.status === 'FAILED') return 'bg-slate-100 text-slate-700';
  if (incident.status === 'CANCELLATION_REQUESTED') return 'bg-amber-100 text-amber-900';
  if (incident.status === 'WAITING_FOR_RESPONDER') return 'bg-red-100 text-red-800';
  return 'bg-blue-100 text-[#003172]';
}

function auditLabel(type: string) {
  if (type === 'incident-created') return 'Incident record created';
  if (type === 'submitted') return 'Request routed to responders';
  if (type === 'search-expanded') return 'Responder search expanded';
  if (type === 'accepted') return 'Request accepted';
  if (type === 'offer-declined') return 'Responder offer declined';
  if (type === 'information-added') return 'Additional information recorded';
  if (type === 'progress-accepted') return 'Responder confirmed the assignment';
  if (type === 'progress-en-route') return 'Responder marked en route';
  if (type === 'progress-arrived') return 'Responder marked arrived';
  if (type === 'cancellation-requested') return 'Client requested cancellation';
  if (type === 'cancellation-acknowledged') return 'Responder acknowledged cancellation';
  if (type === 'cancellation-continued') return 'Responder continued the response';
  if (type === 'closure-requested') return 'Responder requested incident closure';
  if (type === 'closure-declined') return 'Client confirmed more help was needed';
  if (type === 'completed') return 'Client confirmed help was received';
  if (type === 'cancelled') return 'Request cancelled by client';
  return 'Operational record updated';
}

export default function SupervisorAnalyticsPage() {
  const { state, online } = useEmergency();
  const station = state.stations.find((item) => item.id === SUPERVISOR_STATION_ID)!;
  const [service, setService] = useState<ServiceType | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const stationEmployees = useMemo(
    () => state.employees.filter((employee) => employee.stationId === station.id),
    [state.employees, station.id],
  );
  const stationEmployeeIds = useMemo(() => new Set(stationEmployees.map((employee) => employee.id)), [stationEmployees]);
  const incidents = useMemo(
    () => state.incidents
      .filter((incident) => incident.stationId === station.id || incident.notifiedStationIds.includes(station.id) || (incident.assignedEmployeeId && stationEmployeeIds.has(incident.assignedEmployeeId)))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [state.incidents, station.id, stationEmployeeIds],
  );

  const acceptedIncidents = incidents.filter((incident) => incident.acceptedAt);
  const averageAcceptance = acceptedIncidents.length
    ? acceptedIncidents.reduce((sum, incident) => sum + (minutesBetween(incident.createdAt, incident.acceptedAt) ?? 0), 0) / acceptedIncidents.length
    : null;
  const activeCount = incidents.filter((incident) => activeStatuses.has(incident.status)).length;
  const completionCount = incidents.filter((incident) => incident.status === 'COMPLETED').length;
  const acceptanceRate = incidents.length ? Math.round((acceptedIncidents.length / incidents.length) * 100) : 0;
  const serviceCounts = (['police', 'ambulance', 'fire', 'sos'] as ServiceType[]).map((item) => ({
    service: item,
    count: incidents.filter((incident) => incident.service === item).length,
  }));
  const maxServiceCount = Math.max(1, ...serviceCounts.map((item) => item.count));

  const responderStats = stationEmployees
    .map((employee) => {
      const assigned = incidents.filter((incident) => incident.assignedEmployeeId === employee.id);
      return {
        employee,
        assigned: assigned.length,
        active: assigned.filter((incident) => activeStatuses.has(incident.status)).length,
        completed: assigned.filter((incident) => incident.status === 'COMPLETED').length,
      };
    })
    .filter((item) => item.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned);

  const visibleIncidents = incidents.filter((incident) => {
    const assigned = state.employees.find((employee) => employee.id === incident.assignedEmployeeId && employee.stationId === station.id);
    const matchesQuery = `${incident.reference} ${assigned?.name ?? ''} ${assigned?.surname ?? ''} ${assigned?.employeeNumber ?? ''}`.toLowerCase().includes(query.toLowerCase());
    const matchesService = service === 'all' || incident.service === service;
    const matchesStatus = status === 'all'
      || (status === 'active' && activeStatuses.has(incident.status))
      || incident.status.toLowerCase() === status;
    return matchesQuery && matchesService && matchesStatus;
  });

  const selectedAssignedEmployee = state.employees.find((employee) => employee.id === selectedIncident?.assignedEmployeeId);
  const selectedResponder = selectedAssignedEmployee?.stationId === station.id ? selectedAssignedEmployee : undefined;
  const selectedStationOffers = selectedIncident
    ? state.offers.filter((offer) => offer.incidentId === selectedIncident.id && stationEmployeeIds.has(offer.employeeId))
    : [];
  const selectedAudit = selectedIncident
    ? state.audit.filter((entry) => entry.message.includes(selectedIncident.reference)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    : [];

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-slate-50">
      {!online && <div className="bg-amber-700 px-4 py-2.5 text-center text-sm font-semibold text-white" role="status">Offline · analytics reflect data saved on this device.</div>}
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <Link to="/supervisor" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#003172] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><ArrowLeft className="h-4 w-4" /> Station team</Link>

        <header className="mt-4 flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)] sm:p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#003172]"><BarChart3 className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Supervisor</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#003172] sm:text-3xl">Operations overview</h1>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">{station.name}</p>
          </div>
        </header>

        <section className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-[#003172]" aria-label="Privacy notice">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div><h2 className="font-extrabold">Operational data only</h2><p className="mt-1 text-sm leading-5 text-blue-900">Client identity, contact details, exact location, descriptions, photos and audio are hidden from this view.</p></div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Operational statistics">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reports</p><p className="mt-2 text-3xl font-black text-[#003172]">{incidents.length}</p><p className="mt-1 text-xs text-slate-500">Station involved</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Active now</p><p className="mt-2 text-3xl font-black text-red-700">{activeCount}</p><p className="mt-1 text-xs text-slate-500">Not closed</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Accepted</p><p className="mt-2 text-3xl font-black text-[#003172]">{acceptanceRate}%</p><p className="mt-1 text-xs text-slate-500">{acceptedIncidents.length} of {incidents.length}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Avg. acceptance</p><p className="mt-2 text-3xl font-black text-[#003172]">{durationLabel(averageAcceptance)}</p><p className="mt-1 text-xs text-slate-500">Report to acceptance</p></article>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]" aria-labelledby="service-mix-heading">
            <h2 id="service-mix-heading" className="text-lg font-bold text-[#003172]">Reports by service</h2>
            <div className="mt-4 space-y-4">{serviceCounts.map((item) => <div key={item.service}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-bold text-slate-700">{serviceLabel(item.service)}</span><span className="font-extrabold text-slate-950">{item.count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#003172]" style={{ width: `${(item.count / maxServiceCount) * 100}%` }} /></div></div>)}</div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]" aria-labelledby="outcomes-heading">
            <h2 id="outcomes-heading" className="text-lg font-bold text-[#003172]">Outcomes</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black text-[#003172]">{completionCount}</p><p className="text-xs font-bold text-slate-500">Completed</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black text-[#003172]">{incidents.filter((incident) => incident.status === 'CANCELLED').length}</p><p className="text-xs font-bold text-slate-500">Cancelled</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black text-[#003172]">{incidents.filter((incident) => incident.deliveryState === 'no_responders').length}</p><p className="text-xs font-bold text-slate-500">No responders</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black text-[#003172]">{incidents.filter((incident) => incident.deliveryState === 'everyone_declined').length}</p><p className="text-xs font-bold text-slate-500">All declined</p></div>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]" aria-labelledby="responder-performance-heading">
          <div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-[#003172]" /><h2 id="responder-performance-heading" className="text-lg font-bold text-[#003172]">Responder activity</h2></div>
          {responderStats.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{responderStats.map((item) => <article key={item.employee.id} className="rounded-xl bg-slate-50 p-4"><p className="font-extrabold text-slate-950">{item.employee.name} {item.employee.surname}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">{item.employee.employeeNumber} · {serviceLabel(item.employee.service)}</p><dl className="mt-3 grid grid-cols-3 text-center text-xs"><div><dt className="font-semibold text-slate-500">Assigned</dt><dd className="mt-1 text-lg font-black text-[#003172]">{item.assigned}</dd></div><div><dt className="font-semibold text-slate-500">Active</dt><dd className="mt-1 text-lg font-black text-[#003172]">{item.active}</dd></div><div><dt className="font-semibold text-slate-500">Closed</dt><dd className="mt-1 text-lg font-black text-[#003172]">{item.completed}</dd></div></dl></article>)}</div> : <p className="mt-3 text-sm text-slate-500">No responder assignments recorded yet.</p>}
        </section>

        <section className="mt-7 pb-4" aria-labelledby="incident-log-heading">
          <div><h2 id="incident-log-heading" className="text-lg font-bold text-[#003172]">Incident log</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">De-identified operational records</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_160px]">
            <label className="relative"><span className="sr-only">Search incident log</span><Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-base outline-none transition focus:border-[#003172] focus:ring-4 focus:ring-blue-100" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference or responder" /></label>
            <label><span className="sr-only">Filter incidents by service</span><select value={service} onChange={(event) => setService(event.target.value as ServiceType | 'all')} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#003172] focus:ring-4 focus:ring-blue-100"><option value="all">All services</option><option value="sos">SOS</option><option value="police">Police</option><option value="ambulance">Ambulance</option><option value="fire">Firefighters</option></select></label>
            <label><span className="sr-only">Filter incidents by status</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#003172] focus:ring-4 focus:ring-blue-100"><option value="all">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
          </div>

          <div className="mt-4 space-y-3 lg:hidden">
            {visibleIncidents.map((incident) => {
              const assignedEmployee = state.employees.find((employee) => employee.id === incident.assignedEmployeeId);
              const responder = assignedEmployee?.stationId === station.id ? assignedEmployee : undefined;
              const responderName = responder ? `${responder.name} ${responder.surname}` : assignedEmployee ? 'External station responder' : 'Unassigned';
              return <article key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">{incident.reference}</p><h3 className="mt-1 font-extrabold text-slate-950">{serviceLabel(incident.service)}</h3></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${statusClasses(incident)}`}>{statusLabel(incident)}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs"><div><dt className="font-semibold text-slate-500">Responder</dt><dd className="mt-0.5 font-bold text-slate-900">{responderName}</dd></div><div><dt className="font-semibold text-slate-500">Accepted in</dt><dd className="mt-0.5 font-bold text-slate-900">{durationLabel(minutesBetween(incident.createdAt, incident.acceptedAt))}</dd></div><div className="col-span-2"><dt className="font-semibold text-slate-500">Reported</dt><dd className="mt-0.5 font-bold text-slate-900">{new Date(incident.createdAt).toLocaleString()}</dd></div></dl><Button variant="outline" className="mt-3 min-h-11 w-full" onClick={() => setSelectedIncident(incident)}><FileSearch className="h-4 w-4" /> View operational record</Button></article>;
            })}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] lg:block">
            <table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Report</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Responder</th><th className="px-4 py-3">Accepted in</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-100">{visibleIncidents.map((incident) => { const assignedEmployee = state.employees.find((employee) => employee.id === incident.assignedEmployeeId); const responder = assignedEmployee?.stationId === station.id ? assignedEmployee : undefined; const responderName = responder ? `${responder.name} ${responder.surname}` : assignedEmployee ? 'External station responder' : 'Unassigned'; return <tr key={incident.id}><td className="px-4 py-4"><p className="font-extrabold text-slate-950">{incident.reference}</p><p className="mt-0.5 text-xs text-slate-500">{new Date(incident.createdAt).toLocaleString()}</p></td><td className="px-4 py-4 font-bold text-slate-700">{serviceLabel(incident.service)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses(incident)}`}>{statusLabel(incident)}</span></td><td className="px-4 py-4"><p className="font-bold text-slate-800">{responderName}</p>{responder && <p className="text-xs text-slate-500">{responder.employeeNumber}</p>}</td><td className="px-4 py-4 font-bold text-slate-700">{durationLabel(minutesBetween(incident.createdAt, incident.acceptedAt))}</td><td className="px-4 py-4 text-right"><Button size="sm" variant="outline" onClick={() => setSelectedIncident(incident)}><FileSearch className="h-4 w-4" /> View</Button></td></tr>; })}</tbody></table>
          </div>

          {!visibleIncidents.length && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500"><FileSearch className="h-6 w-6" /></span><p className="mt-3 font-extrabold text-slate-950">No matching incidents</p><p className="mt-1 text-sm text-slate-500">New operational records will appear here.</p></div>}
        </section>
      </div>

      <AccessibleModal open={selectedIncident !== null} title={selectedIncident ? `Operational record · ${selectedIncident.reference}` : 'Operational record'} description="This record excludes client personal and sensitive information." onClose={() => setSelectedIncident(null)}>
        {selectedIncident && <div>
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Siren className="h-5 w-5 text-[#003172]" /><p className="font-extrabold text-slate-950">{serviceLabel(selectedIncident.service)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses(selectedIncident)}`}>{statusLabel(selectedIncident)}</span></div>
          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-sm">
            <div><dt className="text-xs font-semibold text-slate-500">Reported</dt><dd className="mt-1 font-bold text-slate-900">{new Date(selectedIncident.createdAt).toLocaleString()}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Station</dt><dd className="mt-1 font-bold text-slate-900">{station.name}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Responder</dt><dd className="mt-1 font-bold text-slate-900">{selectedResponder ? `${selectedResponder.name} ${selectedResponder.surname}` : selectedAssignedEmployee ? 'External station responder' : 'Unassigned'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Employee number</dt><dd className="mt-1 font-bold text-slate-900">{selectedResponder?.employeeNumber ?? '—'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Accepted in</dt><dd className="mt-1 font-bold text-slate-900">{durationLabel(minutesBetween(selectedIncident.createdAt, selectedIncident.acceptedAt))}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Resolution time</dt><dd className="mt-1 font-bold text-slate-900">{durationLabel(minutesBetween(selectedIncident.createdAt, selectedIncident.completedAt))}</dd></div>
          </dl>

          <section className="mt-5" aria-labelledby="handling-heading"><h3 id="handling-heading" className="font-extrabold text-[#003172]">How it was handled</h3><div className="mt-3 grid gap-3 text-sm"><div className="flex gap-3 rounded-xl border border-slate-200 p-3"><Activity className="h-4 w-4 shrink-0 text-slate-500" /><div><p className="font-bold text-slate-900">Search coverage</p><p className="mt-0.5 text-slate-600">Stage {selectedIncident.searchStage} · {selectedIncident.notifiedStationIds.length} station{selectedIncident.notifiedStationIds.length === 1 ? '' : 's'} notified</p></div></div><div className="flex gap-3 rounded-xl border border-slate-200 p-3"><UserRound className="h-4 w-4 shrink-0 text-slate-500" /><div><p className="font-bold text-slate-900">Responder offers</p><p className="mt-0.5 text-slate-600">{selectedStationOffers.length} sent · {selectedStationOffers.filter((offer) => offer.status === 'accepted').length} accepted · {selectedStationOffers.filter((offer) => offer.status === 'declined').length} declined</p></div></div><div className="flex gap-3 rounded-xl border border-slate-200 p-3">{selectedIncident.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" /> : selectedIncident.status === 'CANCELLED' ? <XCircle className="h-4 w-4 shrink-0 text-slate-500" /> : <Clock3 className="h-4 w-4 shrink-0 text-[#003172]" />}<div><p className="font-bold text-slate-900">Outcome</p><p className="mt-0.5 text-slate-600">{selectedIncident.status === 'COMPLETED' ? 'Client confirmed that help was received.' : selectedIncident.status === 'CANCELLED' ? `Request cancelled${selectedIncident.cancellationResponse === 'acknowledged' ? ' and acknowledged by the responder' : ''}.` : `${statusLabel(selectedIncident)}.`}</p></div></div></div></section>

          <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="data-summary-heading"><h3 id="data-summary-heading" className="font-extrabold text-[#003172]">Record summary</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs font-semibold text-slate-500">Location</dt><dd className="mt-0.5 font-bold text-slate-900">{selectedIncident.location ? 'Captured' : 'Not captured'}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Additional updates</dt><dd className="mt-0.5 font-bold text-slate-900">{selectedIncident.information.length}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Attachments</dt><dd className="mt-0.5 font-bold text-slate-900">{selectedIncident.information.reduce((sum, item) => sum + item.attachments.length, 0)} hidden</dd></div><div><dt className="text-xs font-semibold text-slate-500">Completion confirmation</dt><dd className="mt-0.5 font-bold text-slate-900">{selectedIncident.completionRequestStatus ?? 'Not requested'}</dd></div></dl></section>

          {selectedAudit.length > 0 && <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="activity-heading"><h3 id="activity-heading" className="font-extrabold text-[#003172]">Activity trail</h3><ol className="mt-3 space-y-3">{selectedAudit.map((entry) => <li key={entry.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#003172]" /><div><p className="font-bold text-slate-800">{auditLabel(entry.type)}</p><p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p></div></li>)}</ol></section>}
          <Button className="mt-6 min-h-12 w-full" onClick={() => setSelectedIncident(null)}>Close record</Button>
        </div>}
      </AccessibleModal>
    </main>
  );
}
