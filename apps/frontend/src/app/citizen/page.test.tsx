import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoProvider } from '@/features/demo/demo-context';
import { EmergencyProvider } from '@/features/emergency/emergency-context';

import CitizenReportPage from './page';

describe('CitizenReportPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
  });

  it('starts one request immediately and opens the optional information prompt', async () => {
    render(
      <DemoProvider><EmergencyProvider><CitizenReportPage /></EmergencyProvider></DemoProvider>,
    );

    const police = screen.getByRole('button', { name: /^Police$/ });
    fireEvent.click(police);
    fireEvent.click(police);

    expect(screen.getByRole('heading', { name: 'Can you tell us more?' })).toBeInTheDocument();
    expect(screen.getByText('Continuing in 5 seconds…')).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('rapidlink-emergency-demo-v1')!).incidents).toHaveLength(1));
  });

  it('stops the countdown when additional information starts', () => {
    vi.useFakeTimers();
    render(<DemoProvider><EmergencyProvider><CitizenReportPage /></EmergencyProvider></DemoProvider>);
    fireEvent.click(screen.getByRole('button', { name: /^Ambulance$/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add information' }));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('heading', { name: 'Add information' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
