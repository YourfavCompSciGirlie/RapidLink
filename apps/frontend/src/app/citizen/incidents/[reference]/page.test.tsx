import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DemoProvider } from '@/features/demo/demo-context';

import CitizenTrackingPage from './page';

describe('CitizenTrackingPage', () => {
  it('redacts operational priority and responder identifiers', () => {
    render(
      <DemoProvider>
        <CitizenTrackingPage />
      </DemoProvider>,
    );

    expect(screen.getByText(/responder positions are private/i)).toBeInTheDocument();
    expect(screen.queryByText(/P1 priority/i)).not.toBeInTheDocument();
    expect(screen.queryByText('A07')).not.toBeInTheDocument();
  });
});
