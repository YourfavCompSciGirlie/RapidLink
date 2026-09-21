import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_COORDINATES } from './config';
import { createInitialState } from './fixtures';
import { applyEmergencyAction, createSession, sessionService } from './session-service';
import type { EmergencyAction } from './types';

const location = { ...DEMO_COORDINATES, capturedAt: new Date().toISOString(), source: 'demo' as const };
const apply = (state: ReturnType<typeof createInitialState>, event: EmergencyAction) => applyEmergencyAction(state, event);

describe('emergency session reducer', () => {
  beforeEach(() => window.localStorage.clear());

  it('routes a service request to every matching active on-duty responder', () => {
    let state = createInitialState();
    state = apply(state, { id: 'create', type: 'create-incident', payload: { incidentId: 'incident-police', service: 'police', location } });
    state = apply(state, { id: 'submit', type: 'submit-incident', payload: { incidentId: 'incident-police' } });
    const offers = state.offers.filter((offer) => offer.incidentId === 'incident-police');
    expect(offers).toHaveLength(2);
    expect(offers.every((offer) => state.employees.find((employee) => employee.id === offer.employeeId)?.service === 'police')).toBe(true);
  });

  it('routes SOS to police and ambulance responders', () => {
    let state = createInitialState();
    state = apply(state, { id: 'create-sos', type: 'create-incident', payload: { incidentId: 'incident-sos', service: 'sos', location } });
    state = apply(state, { id: 'submit-sos', type: 'submit-incident', payload: { incidentId: 'incident-sos' } });
    const services = state.offers.map((offer) => state.employees.find((employee) => employee.id === offer.employeeId)?.service);
    expect(services).toEqual(expect.arrayContaining(['police', 'ambulance']));
    expect(services.every((service) => service === 'police' || service === 'ambulance')).toBe(true);
  });

  it.each(['police', 'ambulance', 'fire'] as const)('routes a Ga-Rankuwa %s request to local on-duty responders', (service) => {
    let state = createInitialState();
    const incidentId = `incident-garankuwa-${service}`;
    state = apply(state, { id: `create-${service}`, type: 'create-incident', payload: { incidentId, service, location } });
    state = apply(state, { id: `submit-${service}`, type: 'submit-incident', payload: { incidentId } });
    const incident = state.incidents.find((item) => item.id === incidentId);
    const offers = state.offers.filter((offer) => offer.incidentId === incidentId);
    expect(incident?.stationId).toBe('station-garankuwa');
    expect(incident?.deliveryState).toBe('sent');
    expect(offers).toHaveLength(2);
    expect(offers.every((offer) => state.employees.find((employee) => employee.id === offer.employeeId)?.stationId === 'station-garankuwa')).toBe(true);
  });

  it('applies an action id only once', () => {
    const event: EmergencyAction = { id: 'one-action', type: 'create-incident', payload: { incidentId: 'incident-one', service: 'fire', location } };
    const once = apply(createInitialState(), event);
    const twice = apply(once, event);
    expect(twice.incidents).toHaveLength(1);
    expect(twice.revision).toBe(once.revision);
  });

  it('allows only the first responder to accept', () => {
    let state = createInitialState();
    state = apply(state, { id: 'create-race', type: 'create-incident', payload: { incidentId: 'incident-race', service: 'ambulance', location } });
    state = apply(state, { id: 'submit-race', type: 'submit-incident', payload: { incidentId: 'incident-race' } });
    const [first, second] = state.offers;
    state = apply(state, { id: 'accept-first', type: 'accept-offer', payload: { offerId: first!.id } });
    state = apply(state, { id: 'accept-second', type: 'accept-offer', payload: { offerId: second!.id } });
    expect(state.incidents[0]?.assignedEmployeeId).toBe(first!.employeeId);
    expect(state.offers.find((offer) => offer.id === second!.id)?.status).toBe('closed');
  });

  it('preserves actions appended while synchronization is already running', async () => {
    let remoteState = createInitialState();
    let version = 0;
    const synchronizedTypes: EmergencyAction['type'][] = [];
    const record = () => ({
      id: 'session-queue', code: 'QUEUE1', state: remoteState, version,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input) === '/api/sessions') return { ok: true, status: 200, json: async () => record() } as Response;
      const event = JSON.parse(String(init?.body)) as EmergencyAction;
      synchronizedTypes.push(event.type);
      remoteState = applyEmergencyAction(remoteState, event);
      version += 1;
      return { ok: true, status: 200, json: async () => record() } as Response;
    });

    await createSession('QUEUE1');
    sessionService.createIncident({ incidentId: 'incident-queue', service: 'police', location });
    sessionService.submitIncident('incident-queue');

    await vi.waitFor(() => expect(synchronizedTypes).toEqual(['create-incident', 'submit-incident']));
    expect(remoteState.offers).toHaveLength(2);
    vi.restoreAllMocks();
  });
});
