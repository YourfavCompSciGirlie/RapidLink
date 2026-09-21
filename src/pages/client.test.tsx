import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmergencyProvider } from '@/features/emergency/emergency-context';
import { readState, sessionService } from '@/features/emergency/session-service';

import ClientPage from './client';

describe('client activation safety window', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
  });

  it('does not create an incident before the countdown and supports undo', () => {
    render(<EmergencyProvider><ClientPage /></EmergencyProvider>);
    fireEvent.click(screen.getByRole('button', { name: /^Police$/ }));
    expect(screen.getByRole('heading', { name: 'Sending alert' })).toBeInTheDocument();
    expect(readState().incidents).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Undo false alert/i }));
    expect(screen.queryByRole('heading', { name: 'Sending alert' })).not.toBeInTheDocument();
    expect(readState().incidents).toHaveLength(0);
  });

  it('labels saved contacts clearly without a competing call action', () => {
    render(<EmergencyProvider><ClientPage /></EmergencyProvider>);
    expect(screen.queryByRole('link', { name: /Call 112/i })).not.toBeInTheDocument();
    expect(screen.getByText('Your details')).toBeInTheDocument();
    expect(screen.getByText('ID number')).toBeInTheDocument();
    expect(screen.getByText('Next of kin')).toBeInTheDocument();
  });

  it('transmits when the five-second countdown completes', async () => {
    vi.useFakeTimers();
    render(<EmergencyProvider><ClientPage /></EmergencyProvider>);
    fireEvent.click(screen.getByRole('button', { name: /^Ambulance$/ }));
    for (let second = 0; second < 6; second += 1) {
      await act(async () => { vi.advanceTimersByTime(1_000); });
    }
    expect(readState().incidents).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Alert sent' })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('prioritizes an active request and shows its additional information', () => {
    sessionService.createIncident({ incidentId: 'incident-active', service: 'police', location: null });
    sessionService.submitIncident('incident-active');
    sessionService.addIncidentInformation({
      incidentId: 'incident-active',
      happened: 'A person needs assistance near the entrance.',
      landmark: 'Blue gate beside the clinic.',
      attachments: [],
    });

    render(<EmergencyProvider><ClientPage /></EmergencyProvider>);

    const activeRequest = screen.getByText(/Active request ·/i);
    const sosButton = screen.getByRole('button', { name: /SOS — request police and ambulance/i });
    expect(activeRequest.compareDocumentPosition(sosButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'View request' }));
    expect(screen.getByRole('heading', { name: 'Additional information' })).toBeInTheDocument();
    expect(screen.getByText('A person needs assistance near the entrance.')).toBeInTheDocument();
    expect(screen.getByText('Blue gate beside the clinic.')).toBeInTheDocument();
  });
});
