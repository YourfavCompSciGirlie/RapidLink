import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { DemoProvider } from '@/features/demo/demo-context';
import HomePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('HomePage', () => {
  it('renders the RapidLink demo launcher', () => {
    render(
      <DemoProvider>
        <HomePage />
      </DemoProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Every minute saved is a life saved.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start the live scenario/i })).toBeInTheDocument();
    expect(screen.getByText('Follow one incident, end to end')).toBeInTheDocument();
  });
});
