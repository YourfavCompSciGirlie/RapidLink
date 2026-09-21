import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmergencyProvider } from '@/features/emergency/emergency-context';
import { readState } from '@/features/emergency/session-service';

import ClientPage from './client';

describe('client emergency activation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
  });

  it('creates and submits an incident immediately', async () => {
    render(<EmergencyProvider><ClientPage /></EmergencyProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Use Ga-Rankuwa' }));
    fireEvent.click(screen.getByRole('button', { name: /^Police$/ }));
    expect(screen.getByRole('heading', { name: 'Request sent' })).toBeInTheDocument();
    expect(readState().incidents).toHaveLength(1);
    await waitFor(() => expect(readState().offers.length).toBeGreaterThan(0));
  });
});
