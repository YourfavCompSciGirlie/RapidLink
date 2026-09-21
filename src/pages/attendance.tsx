import { ArrowLeft, CalendarCheck, Clock3, History, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useEmergency } from '@/features/emergency/emergency-context';
import { employeeBusy, employeeDuty, sessionService } from '@/features/emergency/session-service';
import type { AttendanceChoice } from '@/features/emergency/types';

const STATION_ID = 'station-garankuwa';
const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#003172] focus:ring-4 focus:ring-blue-100';

const localInputValue = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AttendancePage() {
  const { state, online, refresh } = useEmergency();
  const station = state.stations.find((item) => item.id === STATION_ID);
  const [notice, setNotice] = useState('');
  const employees = state.employees.filter((item) => item.stationId === STATION_ID && item.active);
  const latestByEmployee = useMemo(
    () => Object.fromEntries(employees.map((employee) => [employee.id, state.attendance.filter((entry) => entry.employeeId === employee.id).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]])),
    [employees, state.attendance],
  );
  const [edits, setEdits] = useState<Record<string, { choice: AttendanceChoice; start: string; end: string }>>({});

  const row = (employeeId: string) => {
    const entry = latestByEmployee[employeeId];
    return edits[employeeId] ?? {
      choice: entry?.choice ?? 'absent',
      start: localInputValue(entry?.shiftStart ?? new Date().toISOString()),
      end: localInputValue(entry?.shiftEnd ?? new Date(Date.now() + 8 * 60 * 60_000).toISOString()),
    };
  };

  const save = (employeeId: string) => {
    const value = row(employeeId);
    if (Date.parse(value.end) <= Date.parse(value.start)) {
      setNotice('Shift end must be after shift start.');
      return;
    }
    sessionService.saveAttendance({ employeeId, date: value.start.slice(0, 10), shiftStart: new Date(value.start).toISOString(), shiftEnd: new Date(value.end).toISOString(), choice: value.choice });
    refresh();
    setNotice('Attendance saved.');
  };

  const endShift = (employeeId: string) => {
    sessionService.endShift(employeeId);
    refresh();
    setNotice('Shift ended. Active assignments remain attached.');
  };

  const history = state.attendance.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 12);
  const noticeIsError = notice.startsWith('Shift end');

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-slate-50">
      {!online && <div className="bg-amber-700 px-4 py-2.5 text-center text-sm font-semibold text-white" role="status">Offline · updates are saved on this device.</div>}
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <Link to="/supervisor" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#003172] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><ArrowLeft className="h-4 w-4" /> Station team</Link>

        <header className="mt-4 flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)] sm:p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#003172]"><CalendarCheck className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Supervisor</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#003172] sm:text-3xl">Attendance</h1>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">{station?.name}</p>
          </div>
        </header>

        {notice && <div className={`mt-4 rounded-xl p-3 text-sm font-bold ${noticeIsError ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-[#003172]'}`} role={noticeIsError ? 'alert' : 'status'}>{notice}</div>}

        <section className="mt-6" aria-labelledby="attendance-heading">
          <div><h2 id="attendance-heading" className="text-lg font-bold text-[#003172]">Today’s shifts</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">{employees.length} active employees</p></div>

          <div className="mt-4 space-y-3 lg:hidden">
            {employees.map((employee) => {
              const value = row(employee.id);
              const onDuty = employeeDuty(state, employee.id);
              const busy = employeeBusy(state, employee.id);
              const statusLabel = !onDuty ? 'Off duty' : busy ? 'Busy' : 'Available';
              const statusClasses = !onDuty ? 'bg-slate-100 text-slate-700' : busy ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900';
              return (
                <article key={employee.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#003172]"><UserRound className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1"><h3 className="font-extrabold text-slate-950">{employee.name} {employee.surname}</h3><p className="text-xs font-semibold text-slate-500">{employee.employeeNumber}</p></div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${statusClasses}`}>{statusLabel}</span>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-bold text-slate-600" htmlFor={`attendance-${employee.id}`}>Attendance</label>
                    <select id={`attendance-${employee.id}`} aria-label={`Attendance for ${employee.name} ${employee.surname}`} value={value.choice} onChange={(event) => setEdits({ ...edits, [employee.id]: { ...value, choice: event.target.value as AttendanceChoice } })} className={`${inputClass} mt-1.5`}><option value="present">Present</option><option value="absent">Absent</option><option value="leave">On leave</option></select>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600">Shift start<input aria-label={`Shift start for ${employee.name}`} type="datetime-local" value={value.start} onChange={(event) => setEdits({ ...edits, [employee.id]: { ...value, start: event.target.value } })} className={`${inputClass} mt-1.5`} /></label>
                    <label className="text-xs font-bold text-slate-600">Shift end<input aria-label={`Shift end for ${employee.name}`} type="datetime-local" value={value.end} onChange={(event) => setEdits({ ...edits, [employee.id]: { ...value, end: event.target.value } })} className={`${inputClass} mt-1.5`} /></label>
                  </div>
                  {busy && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-950">Ending this shift will not remove the active assignment.</p>}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2"><Button className="min-h-11" onClick={() => save(employee.id)}>Save attendance</Button><Button variant="outline" className="min-h-11" disabled={!onDuty} onClick={() => endShift(employee.id)}>End shift</Button></div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Attendance</th><th className="px-4 py-3">Shift</th><th className="px-4 py-3">Availability</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((employee) => {
                  const value = row(employee.id);
                  const onDuty = employeeDuty(state, employee.id);
                  const busy = employeeBusy(state, employee.id);
                  const statusLabel = !onDuty ? 'Off duty' : busy ? 'Busy' : 'Available';
                  const statusClasses = !onDuty ? 'bg-slate-100 text-slate-700' : busy ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900';
                  return (
                    <tr key={employee.id} className="align-top">
                      <td className="px-4 py-4"><p className="font-extrabold text-slate-950">{employee.name} {employee.surname}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">{employee.employeeNumber}</p></td>
                      <td className="px-4 py-4"><select aria-label={`Attendance for ${employee.name} ${employee.surname}`} value={value.choice} onChange={(event) => setEdits({ ...edits, [employee.id]: { ...value, choice: event.target.value as AttendanceChoice } })} className={inputClass}><option value="present">Present</option><option value="absent">Absent</option><option value="leave">On leave</option></select></td>
                      <td className="px-4 py-4"><div className="grid min-w-[220px] gap-2"><label className="grid grid-cols-[3rem_1fr] items-center gap-2 text-xs font-semibold text-slate-500">Start<input aria-label={`Shift start for ${employee.name}`} type="datetime-local" value={value.start} onChange={(event) => setEdits({ ...edits, [employee.id]: { ...value, start: event.target.value } })} className={inputClass} /></label><label className="grid grid-cols-[3rem_1fr] items-center gap-2 text-xs font-semibold text-slate-500">End<input aria-label={`Shift end for ${employee.name}`} type="datetime-local" value={value.end} onChange={(event) => setEdits({ ...edits, [employee.id]: { ...value, end: event.target.value } })} className={inputClass} /></label></div></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses}`}>{statusLabel}</span>{busy && <p className="mt-2 max-w-44 text-xs font-semibold text-slate-500">Assignment remains if shift ends.</p>}</td>
                      <td className="px-4 py-4"><div className="grid gap-2"><Button size="sm" onClick={() => save(employee.id)}>Save</Button><Button size="sm" variant="outline" disabled={!onDuty} onClick={() => endShift(employee.id)}>End shift</Button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-7 pb-4" aria-labelledby="history-heading">
          <h2 id="history-heading" className="flex items-center gap-2 text-lg font-bold text-[#003172]"><History className="h-5 w-5" /> Recent changes</h2>
          <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:px-5">
            {history.map((entry) => {
              const employee = state.employees.find((item) => item.id === entry.employeeId);
              return <div key={`${entry.id}-${entry.updatedAt}`} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]"><p><strong>{employee?.name} {employee?.surname}</strong> · {entry.choice === 'leave' ? 'On leave' : entry.choice}</p><p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4" /> {new Date(entry.updatedAt).toLocaleString()} · {entry.updatedBy}</p></div>;
            })}
            {!history.length && <p className="py-8 text-center text-sm font-semibold text-slate-500">No attendance changes yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
