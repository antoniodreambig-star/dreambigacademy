import { requireInstructor } from '@/lib/auth';
import { classDate, courseWeeks, currentWeek, fmtDate, todayLocal } from '@/lib/schedule';
import type { Attendance, AttendanceStatus, Cohort, Profile } from '@/lib/types';
import { saveAttendance } from '../actions';

export const metadata = { title: 'Attendance' };

const STATUSES: { v: AttendanceStatus; label: string }[] = [
  { v: 'present', label: 'Present' },
  { v: 'late', label: 'Late' },
  { v: 'absent', label: 'Absent' },
  { v: 'excused', label: 'Excused' },
];
/** Online classes add "Watched recording" for students who caught up on a session they missed. */
const ONLINE_STATUSES: { v: AttendanceStatus; label: string }[] = [...STATUSES, { v: 'watched', label: 'Watched recording' }];

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ cohort?: string; week?: string; ok?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const { data: cohorts } = await supabase.from('cohorts').select('*').order('start_date', { ascending: false });
  const C = (cohorts ?? []) as Cohort[];
  if (C.length === 0) {
    return (<><h1 className="page-title">Attendance</h1><div className="card"><p>Create a class first (Classes page), then come back to take attendance.</p></div></>);
  }
  const cohort = C.find((c) => c.id === q.cohort) ?? C.find((c) => c.active) ?? C[0];
  const total = courseWeeks(cohort.format);
  const options = cohort.format === 'online' ? ONLINE_STATUSES : STATUSES;
  const guess = Math.min(total, Math.max(1, currentWeek(cohort, todayLocal())));
  const wk = Math.min(total, Math.max(1, Number(q.week) || guess));

  const { data: students } = await supabase.from('profiles').select('*').eq('role', 'student').eq('cohort_id', cohort.id).order('full_name');
  const S = (students ?? []) as Profile[];
  const { data: att } = S.length
    ? await supabase.from('attendance').select('*').eq('week', wk).in('student_id', S.map((s) => s.id))
    : { data: [] };
  const A = new Map(((att ?? []) as Attendance[]).map((a) => [a.student_id, a]));

  return (
    <>
      <h1 className="page-title">Attendance</h1>
      <p className="sub">{cohort.format === 'online' ? 'Live session' : 'Class'} date: {fmtDate(classDate(cohort, wk), { year: 'numeric' })}</p>
      {q.ok && <div className="notice notice--ok">Attendance saved.</div>}

      <form method="get" className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 16 }}>
        <div>
          <label htmlFor="cohort">Class</label>
          <select id="cohort" name="cohort" defaultValue={cohort.id}>{C.map((c) => <option key={c.id} value={c.id}>{c.name}{c.format === 'online' ? ' (online)' : ''}</option>)}</select>
        </div>
        <div>
          <label htmlFor="week">Week</label>
          <select id="week" name="week" defaultValue={wk}>{Array.from({ length: total }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Week {n}</option>)}</select>
        </div>
        <button className="btn btn--sm" type="submit">Show</button>
      </form>

      {S.length === 0 ? (
        <div className="card"><p className="muted">No students are in this class yet.</p></div>
      ) : (
        <form action={saveAttendance} className="card stack">
          <input type="hidden" name="cohort" value={cohort.id} />
          <input type="hidden" name="week" value={wk} />
          {S.map((s) => {
            const a = A.get(s.id);
            return (
              <div key={s.id} className="attrow">
                <strong>{s.full_name || s.email}</strong>
                <div className="attrow__opts" role="radiogroup" aria-label={`Attendance for ${s.full_name || s.email}`}>
                  {options.map((o) => (
                    <label key={o.v} className="attrow__opt">
                      <input type="radio" name={`s_${s.id}`} value={o.v} defaultChecked={a?.status === o.v} /> {o.label}
                    </label>
                  ))}
                </div>
                <input type="text" name={`n_${s.id}`} defaultValue={a?.note ?? ''} placeholder="Note (optional)" maxLength={200} aria-label="Note" />
              </div>
            );
          })}
          <button className="btn" type="submit">Save attendance</button>
        </form>
      )}
    </>
  );
}
