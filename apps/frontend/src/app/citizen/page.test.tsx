import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DemoProvider } from '@/features/demo/demo-context';

import CitizenReportPage from './page';

describe('CitizenReportPage', () => {
  it('offers a typed fallback when transcription fails', () => {
    render(
      <DemoProvider>
        <CitizenReportPage />
      </DemoProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Demo transcription fallback' }));

    expect(screen.getByText("We couldn't transcribe that recording")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /type instead/i })).toBeInTheDocument();
  });
});
