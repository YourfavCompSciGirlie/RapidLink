import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { EmergencyProvider } from '@/features/emergency/emergency-context';
import { readState } from '@/features/emergency/session-service';

import AttendancePage from './attendance';
import SupervisorPage from './supervisor';

describe('supervisor dashboard', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows meaningful employee columns and adds an employee', async () => {
    render(<MemoryRouter><EmergencyProvider><SupervisorPage /></EmergencyProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Station team' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Employee' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Availability' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Record' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    const dialog = screen.getByRole('dialog', { name: 'Add employee' });
    fireEvent.change(within(dialog).getByLabelText('Employee number'), { target: { value: 'P-9999' } });
    fireEvent.change(within(dialog).getByLabelText('Phone number'), { target: { value: '071 555 9999' } });
    fireEvent.change(within(dialog).getByLabelText('First name'), { target: { value: 'Test' } });
    fireEvent.change(within(dialog).getByLabelText('Surname'), { target: { value: 'Responder' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add employee' }));

    expect(readState().employees.some((employee) => employee.employeeNumber === 'P-9999')).toBe(true);
    expect(screen.getAllByText('Test Responder').length).toBeGreaterThan(0);
  });

  it('groups shift times into one column and saves attendance', async () => {
    render(<MemoryRouter><EmergencyProvider><AttendancePage /></EmergencyProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Attendance' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Shift' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Availability' })).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText(/Attendance for/)[0]!, { target: { value: 'present' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save attendance' })[0]!);
    expect(screen.getByRole('status')).toHaveTextContent('Attendance saved.');
  });
});
