import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmergencyProvider } from '@/features/emergency/emergency-context';
import { readState } from '@/features/emergency/session-service';

import ClientPage from './client';

describe('client activation safety window', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
  });

  it('does not create an incident before the countdown and supports undo', () => {
    render(<EmergencyProvider><ClientPage /></EmergencyProvider>);
    fireEvent.click(screen.getByRole('button', { name: /^Police$/ }));
    expect(screen.getByRole('heading', { name: 'Sending emergency request' })).toBeInTheDocument();
    expect(readState().incidents).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Undo false alert/i }));
    expect(screen.queryByRole('heading', { name: 'Sending emergency request' })).not.toBeInTheDocument();
    expect(readState().incidents).toHaveLength(0);
  });

  it('transmits when the five-second countdown completes', async () => {
    vi.useFakeTimers();
    render(<EmergencyProvider><ClientPage /></EmergencyProvider>);
    fireEvent.click(screen.getByRole('button', { name: /^Ambulance$/ }));
    for (let second = 0; second < 6; second += 1) {
      await act(async () => { vi.advanceTimersByTime(1_000); });
    }
    expect(readState().incidents).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Request sent' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
