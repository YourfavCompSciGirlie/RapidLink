import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { EmergencyProvider } from '@/features/emergency/emergency-context';
import { sessionService } from '@/features/emergency/session-service';

import ResponderMessagesPage from './messages';

describe('responder request dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    const timestamp = new Date().toISOString();
    sessionService.saveProfile(
      { id: 'client-test', name: 'Naledi', surname: 'Mokoena', email: 'naledi@example.test', southAfricanId: '9001015009087', phone: '0725550147', nextOfKin: { name: 'Refilwe Mokoena', phone: '0735550191' }, createdAt: timestamp, updatedAt: timestamp },
      { salt: 'dGVzdA==', derivedHash: 'dGVzdA==', iterations: 1, failedAttempts: 0 },
    );
    sessionService.createIncident({
      incidentId: 'incident-responder-dashboard',
      service: 'police',
      location: {
        latitude: -25.6045,
        longitude: 28.005,
        accuracy: 18,
        capturedAt: new Date().toISOString(),
        source: 'browser',
      },
    });
    sessionService.submitIncident('incident-responder-dashboard');
  });

  it('shows a personal request queue with status and sorting controls', async () => {
    render(
      <MemoryRouter>
        <EmergencyProvider><ResponderMessagesPage /></EmergencyProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Requests' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Filter by employee')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Open 1/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort requests' })).toHaveValue('proximity');
    expect(screen.getByRole('link', { name: /Review request/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort requests' }), { target: { value: 'newest' } });
    expect(screen.getByRole('combobox', { name: 'Sort requests' })).toHaveValue('newest');
  });
});
