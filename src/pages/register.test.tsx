import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { App } from '@/app';

const completeRegistration = () => {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Naledi' } });
  fireEvent.change(screen.getByLabelText('Surname'), { target: { value: 'Mokoena' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'naledi@example.test' } });
  fireEvent.change(screen.getByLabelText('South African ID number'), { target: { value: '9001015009087' } });
  fireEvent.change(screen.getByLabelText('Client mobile number'), { target: { value: '0725550147' } });
  fireEvent.change(screen.getByLabelText('Next-of-kin name'), { target: { value: 'Refilwe Mokoena' } });
  fireEvent.change(screen.getByLabelText('Next-of-kin mobile number'), { target: { value: '0735550191' } });
  fireEvent.change(screen.getByLabelText('Six-digit cancellation PIN'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Confirm cancellation PIN'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Complete registration' }));
};

describe('client registration routing', () => {
  beforeEach(() => window.localStorage.clear());

  it('opens the client dashboard immediately after registration', async () => {
    render(<MemoryRouter initialEntries={['/register']}><App /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Register emergency details' });
    completeRegistration();

    expect(await screen.findByRole('heading', { name: 'What help do you need?' })).toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it('remembers the client and skips registration on a later visit', async () => {
    const first = render(<MemoryRouter initialEntries={['/register']}><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Register emergency details' });
    completeRegistration();
    await screen.findByRole('heading', { name: 'What help do you need?' });
    first.unmount();

    render(<MemoryRouter initialEntries={['/register']}><App /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'What help do you need?' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Register emergency details' })).not.toBeInTheDocument();
  });
});
