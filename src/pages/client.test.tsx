import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { EmergencyProvider } from '@/features/emergency/emergency-context';
import { readState, sessionService } from '@/features/emergency/session-service';

import ClientPage from './client';

describe('client emergency activation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    const timestamp = new Date().toISOString();
    sessionService.saveProfile(
      { id: 'client-test', name: 'Naledi', surname: 'Mokoena', email: 'naledi@example.test', southAfricanId: '9001015009087', phone: '0725550147', nextOfKin: { name: 'Refilwe Mokoena', phone: '0735550191' }, createdAt: timestamp, updatedAt: timestamp },
      { salt: 'dGVzdA==', derivedHash: 'dGVzdA==', iterations: 1, failedAttempts: 0 },
    );
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
  });

  it('creates and submits an incident immediately', async () => {
    render(<MemoryRouter><EmergencyProvider><ClientPage /></EmergencyProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Use Ga-Rankuwa' }));
    fireEvent.click(screen.getByRole('button', { name: /^Police$/ }));
    expect(screen.getByRole('heading', { name: 'Request sent' })).toBeInTheDocument();
    expect(readState().incidents).toHaveLength(1);
    await waitFor(() => expect(readState().offers.length).toBeGreaterThan(0));
  });
});
