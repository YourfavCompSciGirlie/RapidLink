'use client';

import type {
  Assignment,
  AssignmentStatus,
  CitizenUpdate,
  Incident,
  Priority,
  Resource,
  ResourceRecommendation,
  SupportRequest,
  TimelineEvent,
} from '@rapidlink/shared';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { browserDemoRepository } from './data/demo-repository';
import { createInitialDemoState, DEMO_INCIDENT_ID } from './data/seed';

export interface DemoState {
  scenarioStarted: boolean;
  incident: Incident;
  resources: Resource[];
  recommendations: ResourceRecommendation[];
  assignments: Assignment[];
  timeline: TimelineEvent[];
  citizenUpdates: CitizenUpdate[];
  supportRequests: SupportRequest[];
  isOnline: boolean;
  queuedUpdates: number;
}

interface ReportInput {
  transcript: string;
  locationLabel: string;
  casualties: number;
}

interface DemoContextValue extends DemoState {
  startScenario(): void;
  resetScenario(): void;
  submitReport(input: ReportInput): void;
  verifyIncident(): void;
  overridePriority(priority: Priority, reason: string): void;
  toggleRecommendation(resourceId: string): void;
  dispatchSelected(): void;
  updateAssignment(resourceId: string, status: AssignmentStatus): void;
  addObservation(input: { casualties?: number; fuelLeak?: boolean; entrapment?: boolean }): void;
  requestSupport(resourceType: string, reason: string): void;
  approveSupport(requestId: string): void;
  setOnline(isOnline: boolean): void;
  resolveIncident(summary: string): void;
  addCitizenInformation(message: string): void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const demoTimestamp = (state: DemoState) => {
  const base = Date.parse('2026-09-20T12:03:00.000Z');
  return new Date(base + (state.timeline.length + state.citizenUpdates.length + 1) * 60_000).toISOString();
};

const createEvent = (
  state: DemoState,
  event: Omit<TimelineEvent, 'id' | 'incidentId' | 'timestamp'>,
): TimelineEvent => ({
  ...event,
  id: `event-${state.timeline.length + 1}`,
  incidentId: DEMO_INCIDENT_ID,
  timestamp: demoTimestamp(state),
});

const createUpdate = (
  state: DemoState,
  update: Omit<CitizenUpdate, 'id' | 'incidentId' | 'timestamp'>,
): CitizenUpdate => ({
  ...update,
  id: `update-${state.citizenUpdates.length + 1}`,
  incidentId: DEMO_INCIDENT_ID,
  timestamp: demoTimestamp(state),
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createInitialDemoState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedState = browserDemoRepository.load();
    if (savedState) setState(savedState);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) browserDemoRepository.save(state);
  }, [hydrated, state]);

  const actions = useMemo<Omit<DemoContextValue, keyof DemoState>>(
    () => ({
      startScenario() {
        setState(createInitialDemoState(true));
      },
      resetScenario() {
        browserDemoRepository.clear();
        setState(createInitialDemoState(false));
      },
      submitReport(input) {
        setState((current) => {
          const event = createEvent(current, {
            kind: 'report',
            title: 'Emergency report received',
            detail: 'Voice report structured and queued for dispatcher verification.',
            visibility: 'public',
          });
          const update = createUpdate(current, {
            title: 'Report received',
            message: 'Your emergency report has been received. A dispatcher is reviewing it now.',
            status: 'received',
          });
          return {
            ...current,
            scenarioStarted: true,
            incident: {
              ...current.incident,
              status: 'reported',
              transcript: input.transcript,
              description: input.transcript,
              casualties: input.casualties,
              location: { ...current.incident.location, label: input.locationLabel },
              triage: {
                ...current.incident.triage,
                casualties: { ...current.incident.triage.casualties, value: input.casualties },
              },
            },
            timeline: [event],
            citizenUpdates: [update],
          };
        });
      },
      verifyIncident() {
        setState((current) => {
          const timestamp = demoTimestamp(current);
          return {
            ...current,
            incident: {
              ...current.incident,
              status: 'verified',
              verifiedAt: timestamp,
              location: { ...current.incident.location, confirmed: true },
            },
            timeline: [
              ...current.timeline,
              createEvent(current, {
                kind: 'verification',
                title: 'Incident verified · P1 confirmed',
                detail: 'Location, hazards and priority confirmed by dispatcher Naledi K.',
                visibility: 'public',
              }),
            ],
            citizenUpdates: [
              ...current.citizenUpdates,
              createUpdate(current, {
                title: 'Location confirmed',
                message: 'The incident location near Mams Mall has been confirmed.',
                status: 'location_confirmed',
              }),
            ],
          };
        });
      },
      overridePriority(priority, reason) {
        setState((current) => ({
          ...current,
          incident: {
            ...current.incident,
            priority,
            priorityFactors: [
              ...current.incident.priorityFactors,
              { label: reason || 'Dispatcher assessment', score: 0, source: 'dispatcher' },
            ],
          },
        }));
      },
      toggleRecommendation(resourceId) {
        setState((current) => ({
          ...current,
          recommendations: current.recommendations.map((item) => {
            const resource = current.resources.find(({ id }) => id === resourceId);
            if (item.resourceId !== resourceId || resource?.status === 'unavailable') return item;
            return { ...item, selected: !item.selected };
          }),
        }));
      },
      dispatchSelected() {
        setState((current) => {
          const timestamp = demoTimestamp(current);
          const selectedIds = current.recommendations
            .filter(({ selected }) => selected)
            .map(({ resourceId }) => resourceId);
          const assignments: Assignment[] = selectedIds.map((resourceId, index) => {
            const resource = current.resources.find(({ id }) => id === resourceId)!;
            return {
              id: `assignment-${index + 1}`,
              incidentId: current.incident.id,
              resourceId,
              status: 'assigned',
              assignedAt: timestamp,
              etaMinutes: resource.etaMinutes,
            };
          });
          return {
            ...current,
            incident: { ...current.incident, status: 'dispatched', dispatchedAt: timestamp },
            assignments,
            resources: current.resources.map((resource) =>
              selectedIds.includes(resource.id) ? { ...resource, status: 'assigned' } : resource,
            ),
            timeline: [
              ...current.timeline,
              createEvent(current, {
                kind: 'dispatch',
                title: `${assignments.length} units dispatched`,
                detail: 'EMS, Fire & Rescue and Metro Police are responding as one coordinated package.',
                visibility: 'public',
              }),
            ],
            citizenUpdates: [
              ...current.citizenUpdates,
              createUpdate(current, {
                title: 'Emergency teams dispatched',
                message: 'Emergency responders are on the way. Please remain at a safe distance.',
                status: 'dispatched',
              }),
            ],
          };
        });
      },
      updateAssignment(resourceId, status) {
        setState((current) => {
          const resource = current.resources.find(({ id }) => id === resourceId);
          const timeline = [
            ...current.timeline,
            createEvent(current, {
              kind: 'status',
              title: `${resource?.callSign ?? 'Unit'} · ${status.replace('_', ' ')}`,
              detail: current.isOnline ? 'Status shared with the command centre.' : 'Update queued offline.',
              visibility: status === 'on_scene' ? 'public' : 'operational',
            }),
          ];
          let citizenUpdates = current.citizenUpdates;
          if (status === 'nearby' || status === 'on_scene') {
            citizenUpdates = [
              ...citizenUpdates,
              createUpdate(current, {
                title: status === 'nearby' ? 'Help is nearby' : 'Responders are on scene',
                message:
                  status === 'nearby'
                    ? 'The first emergency team is approaching the incident area.'
                    : 'Emergency teams have arrived and are assessing the scene.',
                status,
              }),
            ];
          }
          return {
            ...current,
            incident: status === 'on_scene' ? { ...current.incident, status: 'active' } : current.incident,
            assignments: current.assignments.map((assignment) =>
              assignment.resourceId === resourceId ? { ...assignment, status } : assignment,
            ),
            timeline,
            citizenUpdates,
            queuedUpdates: current.isOnline ? current.queuedUpdates : current.queuedUpdates + 1,
          };
        });
      },
      addObservation(input) {
        setState((current) => ({
          ...current,
          incident: {
            ...current.incident,
            priority: 'P1',
            priorityScore: 98,
            casualties: input.casualties ?? current.incident.casualties,
            fireRisk: input.fuelLeak ? true : current.incident.fireRisk,
            trappedPersons: input.entrapment ?? current.incident.trappedPersons,
            priorityFactors: [
              ...current.incident.priorityFactors,
              ...(input.fuelLeak
                ? [{ label: 'Fuel leak confirmed on scene', score: 6, source: 'rule' as const }]
                : []),
            ],
          },
          timeline: [
            ...current.timeline,
            createEvent(current, {
              kind: 'escalation',
              title: 'Scene assessment updated',
              detail: `Responder confirmed ${input.casualties ?? current.incident.casualties} casualties${input.fuelLeak ? ' and a fuel leak' : ''}.`,
              visibility: 'operational',
            }),
          ],
          queuedUpdates: current.isOnline ? current.queuedUpdates : current.queuedUpdates + 1,
        }));
      },
      requestSupport(resourceType, reason) {
        setState((current) => ({
          ...current,
          supportRequests: [
            ...current.supportRequests,
            {
              id: `support-${current.supportRequests.length + 1}`,
              incidentId: current.incident.id,
              requestedBy: 'A07 · Thabo M.',
              resourceType,
              reason,
              status: 'pending',
              requestedAt: demoTimestamp(current),
            },
          ],
          timeline: [
            ...current.timeline,
            createEvent(current, {
              kind: 'support',
              title: `${resourceType} requested`,
              detail: reason,
              visibility: 'operational',
            }),
          ],
        }));
      },
      approveSupport(requestId) {
        setState((current) => {
          const reserve = current.resources.find(({ id }) => id === 'resource-a09');
          const alreadyAssigned = current.assignments.some(({ resourceId }) => resourceId === reserve?.id);
          return {
            ...current,
            supportRequests: current.supportRequests.map((request) =>
              request.id === requestId ? { ...request, status: 'approved' } : request,
            ),
            resources: current.resources.map((resource) =>
              resource.id === reserve?.id ? { ...resource, status: 'assigned' } : resource,
            ),
            assignments:
              reserve && !alreadyAssigned
                ? [
                    ...current.assignments,
                    {
                      id: `assignment-${current.assignments.length + 1}`,
                      incidentId: current.incident.id,
                      resourceId: reserve.id,
                      status: 'assigned',
                      assignedAt: demoTimestamp(current),
                      etaMinutes: reserve.etaMinutes,
                    },
                  ]
                : current.assignments,
            timeline: [
              ...current.timeline,
              createEvent(current, {
                kind: 'support',
                title: 'Additional ambulance approved',
                detail: 'A09 assigned with an estimated arrival time of 11 minutes.',
                visibility: 'operational',
              }),
            ],
          };
        });
      },
      setOnline(isOnline) {
        setState((current) => ({
          ...current,
          isOnline,
          timeline:
            isOnline && current.queuedUpdates > 0
              ? [
                  ...current.timeline,
                  createEvent(current, {
                    kind: 'status',
                    title: `${current.queuedUpdates} offline updates synchronised`,
                    detail: 'Field activity is now visible to the command centre.',
                    visibility: 'operational',
                  }),
                ]
              : current.timeline,
          queuedUpdates: isOnline ? 0 : current.queuedUpdates,
        }));
      },
      resolveIncident(summary) {
        setState((current) => ({
          ...current,
          incident: { ...current.incident, status: 'resolved', resolvedAt: demoTimestamp(current) },
          assignments: current.assignments.map((assignment) => ({ ...assignment, status: 'completed' })),
          resources: current.resources.map((resource) => ({
            ...resource,
            status: resource.status === 'assigned' ? 'available' : resource.status,
          })),
          timeline: [
            ...current.timeline,
            createEvent(current, {
              kind: 'resolution',
              title: 'Incident resolved',
              detail: summary || 'Scene safe, casualties transported and roadway reopened.',
              visibility: 'public',
            }),
          ],
          citizenUpdates: [
            ...current.citizenUpdates,
            createUpdate(current, {
              title: 'Incident resolved',
              message: 'Emergency operations at the reported scene have concluded. Thank you for your report.',
              status: 'resolved',
            }),
          ],
        }));
      },
      addCitizenInformation(message) {
        setState((current) => ({
          ...current,
          timeline: [
            ...current.timeline,
            createEvent(current, {
              kind: 'report',
              title: 'Reporter added information',
              detail: message,
              visibility: 'operational',
            }),
          ],
        }));
      },
    }),
    [],
  );

  return <DemoContext.Provider value={{ ...state, ...actions }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used within DemoProvider');
  return context;
}
