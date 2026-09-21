import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DemoProvider, useDemo } from './demo-context';

function DemoHarness() {
  const demo = useDemo();
  return (
    <div>
      <span data-testid="status">{demo.incident.status}</span>
      <span data-testid="assignments">{demo.assignments.length}</span>
      <span data-testid="timeline">{demo.timeline.length}</span>
      <button onClick={() => demo.submitReport({ transcript: 'Taxi collision', locationLabel: 'Mams Mall', casualties: 6 })}>Report</button>
      <button onClick={demo.verifyIncident}>Verify</button>
      <button onClick={demo.dispatchSelected}>Dispatch</button>
      <button onClick={() => demo.resolveIncident('Scene safe')}>Resolve</button>
    </div>
  );
}

describe('DemoProvider', () => {
  beforeEach(() => window.localStorage.clear());

  it('moves the golden incident through the operational lifecycle', async () => {
    render(
      <DemoProvider>
        <DemoHarness />
      </DemoProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    expect(screen.getByTestId('status')).toHaveTextContent('reported');

    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(screen.getByTestId('status')).toHaveTextContent('verified');

    fireEvent.click(screen.getByRole('button', { name: 'Dispatch' }));
    expect(screen.getByTestId('status')).toHaveTextContent('dispatched');
    expect(screen.getByTestId('assignments')).toHaveTextContent('4');

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(screen.getByTestId('status')).toHaveTextContent('resolved');
    expect(Number(screen.getByTestId('timeline').textContent)).toBeGreaterThanOrEqual(4);

    await waitFor(() => expect(window.localStorage.getItem('rapidlink-demo-state-v1')).toContain('resolved'));
  });
});
