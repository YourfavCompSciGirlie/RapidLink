import type {
  Incident,
  Resource,
  ResourceRecommendation,
  TimelineEvent,
} from '@rapidlink/shared';

import type { DemoState } from '../demo-context';

export const DEMO_INCIDENT_ID = 'incident-er-1042';
export const DEMO_REFERENCE = 'ER-1042';

export const reportTranscript =
  "A taxi has crashed outside Mams Mall. About six people are hurt, someone's trapped and there's smoke coming from the engine.";

export const createDemoIncident = (): Incident => ({
  id: DEMO_INCIDENT_ID,
  reference: DEMO_REFERENCE,
  type: 'Road traffic collision',
  status: 'reported',
  priority: 'P1',
  priorityScore: 92,
  priorityFactors: [
    { label: 'Possible threat to life', score: 30, source: 'rule' },
    { label: 'Multiple casualties reported', score: 20, source: 'rule' },
    { label: 'Possible entrapment', score: 15, source: 'rule' },
    { label: 'Smoke / fire risk', score: 15, source: 'rule' },
    { label: 'Major roadway affected', score: 12, source: 'rule' },
  ],
  description: 'Minibus taxi collision with multiple casualties, possible entrapment and smoke.',
  transcript: reportTranscript,
  casualties: 6,
  trappedPersons: true,
  fireRisk: true,
  location: {
    source: 'landmark',
    label: 'Mams Mall, Mamelodi',
    landmark: 'Mams Mall main entrance',
    lat: -25.7149,
    lng: 28.3377,
    confidence: 91,
    confirmed: false,
  },
  triage: {
    incidentType: { value: 'Road traffic collision', source: 'inferred', confidence: 96 },
    casualties: { value: 6, source: 'reported', confidence: 86 },
    entrapment: { value: true, source: 'reported', confidence: 82 },
    fireRisk: { value: true, source: 'inferred', confidence: 79 },
  },
  reportedAt: '2026-09-20T12:03:00.000Z',
});

export const seedResources: Resource[] = [
  {
    id: 'resource-a07',
    callSign: 'A07',
    agency: 'EMS',
    type: 'Advanced life support ambulance',
    capabilities: ['advanced-life-support', 'patient-transport'],
    status: 'available',
    location: { lat: -25.733, lng: 28.323 },
    etaMinutes: 7,
    distanceKm: 4.3,
    workload: 0,
  },
  {
    id: 'resource-r03',
    callSign: 'R03',
    agency: 'Fire & Rescue',
    type: 'Heavy rescue unit',
    capabilities: ['extrication'],
    status: 'available',
    location: { lat: -25.742, lng: 28.313 },
    etaMinutes: 8,
    distanceKm: 5.1,
    workload: 0,
  },
  {
    id: 'resource-f11',
    callSign: 'F11',
    agency: 'Fire & Rescue',
    type: 'Fire engine',
    capabilities: ['fire-suppression'],
    status: 'available',
    location: { lat: -25.748, lng: 28.352 },
    etaMinutes: 10,
    distanceKm: 6.2,
    workload: 0,
  },
  {
    id: 'resource-t02',
    callSign: 'TMPD T02',
    agency: 'Metro Police',
    type: 'Traffic response vehicle',
    capabilities: ['traffic-control'],
    status: 'available',
    location: { lat: -25.706, lng: 28.329 },
    etaMinutes: 6,
    distanceKm: 3.1,
    workload: 1,
  },
  {
    id: 'resource-a12',
    callSign: 'A12',
    agency: 'EMS',
    type: 'Patient transport ambulance',
    capabilities: ['patient-transport'],
    status: 'unavailable',
    location: { lat: -25.69, lng: 28.31 },
    etaMinutes: 12,
    distanceKm: 2.1,
    workload: 2,
  },
  {
    id: 'resource-a09',
    callSign: 'A09',
    agency: 'EMS',
    type: 'Advanced life support ambulance',
    capabilities: ['advanced-life-support', 'patient-transport'],
    status: 'available',
    location: { lat: -25.765, lng: 28.36 },
    etaMinutes: 11,
    distanceKm: 7.4,
    workload: 0,
  },
];

export const seedRecommendations: ResourceRecommendation[] = [
  { resourceId: 'resource-a07', reason: 'ALS care for multiple casualties · ETA 7 min', selected: true },
  { resourceId: 'resource-r03', reason: 'Extrication capability · ETA 8 min', selected: true },
  { resourceId: 'resource-f11', reason: 'Smoke and possible fuel fire · ETA 10 min', selected: true },
  { resourceId: 'resource-t02', reason: 'Traffic control and scene safety · ETA 6 min', selected: true },
  { resourceId: 'resource-a12', reason: 'Closer, but currently transporting a patient', selected: false },
  { resourceId: 'resource-a09', reason: 'Reserve ALS capacity · ETA 11 min', selected: false },
];

export const createInitialDemoState = (scenarioStarted = false): DemoState => ({
  scenarioStarted,
  incident: createDemoIncident(),
  resources: seedResources,
  recommendations: seedRecommendations,
  assignments: [],
  timeline: [],
  citizenUpdates: [],
  supportRequests: [],
  isOnline: true,
  queuedUpdates: 0,
});

export const backgroundTimeline: TimelineEvent[] = [
  {
    id: 'background-1',
    incidentId: 'incident-er-1039',
    kind: 'resolution',
    title: 'Medical incident resolved',
    detail: 'Patient transferred to Steve Biko Academic Hospital.',
    timestamp: '2026-09-20T11:48:00.000Z',
    visibility: 'operational',
  },
];

export const historicalIncidents = [
  { area: 'Mamelodi', type: 'Road collision', priority: 'P1', responseMinutes: 7, resolved: true },
  { area: 'Soshanguve', type: 'Medical', priority: 'P2', responseMinutes: 11, resolved: true },
  { area: 'Pretoria CBD', type: 'Fire', priority: 'P1', responseMinutes: 9, resolved: true },
  { area: 'Hatfield', type: 'Road collision', priority: 'P2', responseMinutes: 8, resolved: true },
  { area: 'Mamelodi', type: 'Road collision', priority: 'P2', responseMinutes: 10, resolved: true },
  { area: 'Atteridgeville', type: 'Medical', priority: 'P3', responseMinutes: 14, resolved: true },
];
