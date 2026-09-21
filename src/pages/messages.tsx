import { ArrowUpDown, CheckCircle2, Clock3, Inbox, MapPin, Navigation, Radio, ShieldCheck, Siren } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { serviceLabel } from '@/features/emergency/config';
import { useEmergency } from '@/features/emergency/emergency-context';
import { employeeDuty } from '@/features/emergency/session-service';
import type { Employee, Incident, IncidentOffer, Station } from '@/features/emergency/types';

type RequestTab = 'all' | 'open' | 'accepted' | 'en_route' | 'arrived' | 'closed';
type RequestSort = 'proximity' | 'newest' | 'oldest';

interface RequestItem {
  offer: IncidentOffer;
  incident: Incident;
  station: Station | undefined;
  status: Exclude<RequestTab, 'all'>;
  distance: number;
}

const tabs: { id: RequestTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'en_route', label: 'En route' },
  { id: 'arrived', label: 'Arrived' },
  { id: 'closed', label: 'Closed' },
];

const toRadians = (value: number) => (value * Math.PI) / 180;

function distanceKm(incident: Incident, origin?: Station) {
  if (!incident.location || !origin) return Number.POSITIVE_INFINITY;
  const earthRadius = 6371;
  const latitudeDelta = toRadians(incident.location.latitude - origin.latitude);
  const longitudeDelta = toRadians(incident.location.longitude - origin.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(origin.latitude)) * Math.cos(toRadians(incident.location.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function requestStatus(offer: IncidentOffer, incident: Incident, responderId: string): Exclude<RequestTab, 'all'> {
  if (incident.assignedEmployeeId === responderId) {
    if (incident.progress === 'accepted') return 'accepted';
    if (incident.progress === 'en_route') return 'en_route';
    if (incident.progress === 'arrived') return 'arrived';
    if (incident.progress === 'completed') return 'closed';
  }
  if (offer.status === 'open' && !incident.assignedEmployeeId) return 'open';
  return 'closed';
}

function statusLabel(item: RequestItem, responderId: string) {
  if (item.status !== 'closed') return tabs.find((tab) => tab.id === item.status)?.label ?? 'Closed';
  if (item.incident.progress === 'completed') return 'Completed';
  if (item.offer.status === 'declined') return 'Declined';
  if (item.incident.assignedEmployeeId && item.incident.assignedEmployeeId !== responderId) return 'Assigned elsewhere';
  return 'Closed';
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function responderForPortal(employees: Employee[], offers: IncidentOffer[], storedId: string | null) {
  if (storedId && employees.some((employee) => employee.id === storedId) && (offers.length === 0 || offers.some((offer) => offer.employeeId === storedId))) {
    return employees.find((employee) => employee.id === storedId);
  }
  const latestOffer = [...offers].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  return employees.find((employee) => employee.id === latestOffer?.employeeId)
    ?? employees.find((employee) => employee.stationId === 'station-garankuwa' && employee.active)
    ?? employees.find((employee) => employee.active);
}

export default function ResponderMessagesPage() {
  const { state, online, sessionCode } = useEmergency();
  const [activeTab, setActiveTab] = useState<RequestTab>('all');
  const [sort, setSort] = useState<RequestSort>('proximity');
  const responderStorageKey = `rapidlink-responder-${sessionCode ?? 'local'}`;
  const responder = useMemo(() => responderForPortal(
    state.employees,
    state.offers,
    window.localStorage.getItem(responderStorageKey),
  ), [responderStorageKey, state.employees, state.offers]);
  const responderStation = state.stations.find((station) => station.id === responder?.stationId);
  const onDuty = responder ? employeeDuty(state, responder.id) : false;

  useEffect(() => {
    if (responder) window.localStorage.setItem(responderStorageKey, responder.id);
  }, [responder, responderStorageKey]);

  const requests = useMemo<RequestItem[]>(() => {
    if (!responder) return [];
    return state.offers
      .filter((offer) => offer.employeeId === responder.id)
      .map((offer) => {
        const incident = state.incidents.find((item) => item.id === offer.incidentId);
        if (!incident) return null;
        return {
          offer,
          incident,
          station: state.stations.find((station) => station.id === incident.stationId),
          status: requestStatus(offer, incident, responder.id),
          distance: distanceKm(incident, responderStation),
        } satisfies RequestItem;
      })
      .filter((item): item is RequestItem => item !== null);
  }, [responder, responderStation, state.incidents, state.offers, state.stations]);

  const visibleRequests = useMemo(() => requests
    .filter((item) => activeTab === 'all' || item.status === activeTab)
    .sort((a, b) => {
      if (sort === 'newest') return Date.parse(b.incident.createdAt) - Date.parse(a.incident.createdAt);
      if (sort === 'oldest') return Date.parse(a.incident.createdAt) - Date.parse(b.incident.createdAt);
      return a.distance - b.distance || Date.parse(b.incident.createdAt) - Date.parse(a.incident.createdAt);
    }), [activeTab, requests, sort]);

  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [
    tab.id,
    tab.id === 'all' ? requests.length : requests.filter((item) => item.status === tab.id).length,
  ])) as Record<RequestTab, number>, [requests]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {!online && <div className="bg-amber-700 px-4 py-2.5 text-center text-sm font-semibold text-white" role="status">Offline · updates are saved on this device.</div>}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
        <header>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Responder portal</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#003172]">Requests</h1>
        </header>

        {responder && (
          <section className="mt-5 flex items-center gap-3 rounded-2xl bg-[#003172] p-4 text-white shadow-[0_14px_34px_rgba(0,49,114,0.2)] sm:p-5" aria-label="Responder profile">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-black">
              {responder.name[0]}{responder.surname[0]}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold">{responder.name} {responder.surname}</h2>
              <p className="truncate text-xs font-semibold text-blue-100">{serviceLabel(responder.service)} · {responderStation?.name} · {responder.employeeNumber}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${onDuty ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-blue-100'}`}>
              {onDuty ? 'On duty' : 'Off duty'}
            </span>
          </section>
        )}

        <section className="mt-7" aria-labelledby="request-list-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="request-list-heading" className="text-xl font-extrabold text-slate-950">Your requests</h2>
              <p className="mt-1 text-sm text-slate-500">{counts.open} waiting · {counts.en_route} en route</p>
            </div>
            <label className="relative shrink-0">
              <span className="sr-only">Sort requests</span>
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                aria-label="Sort requests"
                value={sort}
                onChange={(event) => setSort(event.target.value as RequestSort)}
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-[#003172] focus:ring-4 focus:ring-blue-100"
              >
                <option value="proximity">Nearest first</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Request status">
            <div className="flex min-w-max gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-10 rounded-full px-3.5 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${activeTab === tab.id ? 'bg-[#003172] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-blue-50'}`}
                >
                  {tab.label} <span className={`ml-1 ${activeTab === tab.id ? 'text-blue-200' : 'text-slate-400'}`}>{counts[tab.id]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visibleRequests.map((item) => {
              const label = statusLabel(item, responder?.id ?? '');
              const urgent = item.status === 'open';
              const active = ['accepted', 'en_route', 'arrived'].includes(item.status);
              const StatusIcon = urgent ? Radio : item.status === 'arrived' || label === 'Completed' ? CheckCircle2 : active ? Navigation : ShieldCheck;
              return (
                <article key={item.offer.id} className={`overflow-hidden rounded-2xl border bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] ${urgent ? 'border-red-200' : active ? 'border-blue-100' : 'border-slate-200'}`}>
                  <div className={`h-1 ${urgent ? 'bg-red-600' : active ? 'bg-[#003172]' : 'bg-slate-300'}`} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${urgent ? 'bg-red-50 text-red-700' : active ? 'bg-blue-50 text-[#003172]' : 'bg-slate-100 text-slate-600'}`}>
                        <StatusIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-lg font-extrabold text-slate-950">{serviceLabel(item.incident.service)}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${urgent ? 'bg-red-100 text-red-800' : active ? 'bg-blue-100 text-[#003172]' : 'bg-slate-100 text-slate-600'}`}>{label}</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.incident.reference}</p>
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-3 text-center">
                      <div className="px-2"><dt className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500"><MapPin className="h-3 w-3" /> Area</dt><dd className="mt-1 truncate text-xs font-extrabold text-slate-800">{item.station?.area ?? 'Pending'}</dd></div>
                      <div className="px-2"><dt className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500"><Navigation className="h-3 w-3" /> Distance</dt><dd className="mt-1 text-xs font-extrabold text-slate-800">{Number.isFinite(item.distance) ? `${item.distance < 10 ? item.distance.toFixed(1) : Math.round(item.distance)} km` : 'Pending'}</dd></div>
                      <div className="px-2"><dt className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500"><Clock3 className="h-3 w-3" /> Reported</dt><dd className="mt-1 text-xs font-extrabold text-slate-800">{relativeTime(item.incident.createdAt)}</dd></div>
                    </dl>

                    <Button asChild className="mt-4 w-full">
                      <Link to={`/responder/offers/${item.offer.id}`}>
                        <Siren className="h-4 w-4" /> {urgent ? 'Review request' : active ? 'Open assignment' : 'View details'}
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}

            {!visibleRequests.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500"><Inbox className="h-6 w-6" /></span>
                <h3 className="mt-3 font-extrabold text-slate-950">No {activeTab === 'all' ? '' : `${tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()} `}requests</h3>
                <p className="mt-1 text-sm text-slate-500">New requests will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
