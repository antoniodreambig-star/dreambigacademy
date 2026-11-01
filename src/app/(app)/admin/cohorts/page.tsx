import { requireInstructor } from '@/lib/auth';
import { classDate, fmtDate } from '@/lib/schedule';
import type { Cohort } from '@/lib/types';
import { addInvite, createCohort, removeInvite, updateCohort } from '../actions';

export const metadata = { title: 'Classes' };

export default async function Cohorts({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const [{ data: cohorts }, { data: invites }, { data: students }] = await Promise.all([
    supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
    supabase.from('invites').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('email').eq('role', 'student'),
  ]);
  const C = (cohorts ?? []) as Cohort[];
  const joined = new Set((students ?? []).map((s) => s.email as string));
  const day = (d: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d];

  return (
    <>
      <h1 className="page-title">Classes and enrollment</h1>
      <p className="sub">Set a start date and every class, lab and due date is figured out for you. Only emails you add here can create an account.</p>
      {q.ok && <div className="notice notice--ok">Saved.</div>}
      {q.err && <div className="notice notice--err">{q.err === 'email' ? 'Enter a valid email address.' : 'Check the name and start date and try again.'}</div>}

      <section className="card stack">
        <h2>New class</h2>
        <form action={createCohort} className="stack">
          <div className="row">
            <div><label htmlFor="cn">Name</label><input id="cn" name="name" type="text" placeholder="Spring 2027" required /></div>
            <div><label htmlFor="cs">Week 1 class date</label><input id="cs" name="start_date" type="date" required /></div>
          </div>
          <div className="row">
            <div><label htmlFor="ct">Class starts at</label><input id="ct" name="class_start" type="time" defaultValue="10:00" required /></div>
            <div><label htmlFor="ch">Class length (hours)</label><input id="ch" name="class_hours" type="number" step="0.5" min="1" max="8" defaultValue="3" /></div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Classes repeat on the same weekday for 26 weeks.</p>
          <button className="btn" type="submit">Create class</button>
        </form>
      </section>

      {C.map((c) => (
        <section className="card" key={c.id} style={{ marginTop: 16 }}>
          <h2>{c.name}</h2>
          <p className="muted small">
            {day(c.class_weekday)}s · Week 1 {fmtDate(c.start_date, { year: 'numeric' })} · Week 26 {fmtDate(classDate(c, 26), { year: 'numeric' })}
          </p>
          <details className="fold">
            <summary>Change dates or time</summary>
            <form action={updateCohort} className="stack">
              <input type="hidden" name="id" value={c.id} />
              <div className="row">
                <div><label>Name</label><input name="name" type="text" defaultValue={c.name} required /></div>
                <div><label>Week 1 class date</label><input name="start_date" type="date" defaultValue={c.start_date} required /></div>
              </div>
              <div className="row">
                <div><label>Class starts at</label><input name="class_start" type="time" defaultValue={c.class_start.slice(0, 5)} required /></div>
                <div><label>Class length (hours)</label><input name="class_hours" type="number" step="0.5" min="1" max="8" defaultValue={c.class_hours} /></div>
              </div>
              <button className="btn btn--sm" type="submit">Update (students’ schedules and calendars change too)</button>
            </form>
          </details>
        </section>
      ))}

      <section className="card stack" style={{ marginTop: 16 }}>
        <h2>Add a student</h2>
        <form action={addInvite} className="stack">
          <div className="row">
            <div><label htmlFor="ie">Their email</label><input id="ie" name="email" type="email" required /></div>
            <div><label htmlFor="in">Name</label><input id="in" name="full_name" type="text" /></div>
          </div>
          <div>
            <label htmlFor="ic">Class</label>
            <select id="ic" name="cohort_id" defaultValue={C[0]?.id ?? ''}>
              <option value="">None yet</option>
              {C.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
            <input type="checkbox" name="notify" value="1" defaultChecked style={{ width: 20, height: 20 }} /> Email them how to sign in
          </label>
          <button className="btn" type="submit">Add student</button>
        </form>

        <div className="tablewrap">
          <table>
            <thead><tr><th>Email</th><th>Name</th><th>Class</th><th>Status</th><th /></tr></thead>
            <tbody>
              {(invites ?? []).length === 0 && <tr><td colSpan={5} className="muted">No one added yet.</td></tr>}
              {(invites ?? []).map((i) => (
                <tr key={i.email as string}>
                  <td>{i.email as string}</td>
                  <td>{(i.full_name as string) || '—'}</td>
                  <td>{C.find((c) => c.id === i.cohort_id)?.name ?? '—'}</td>
                  <td>{joined.has(i.email as string) ? <span className="chip chip--done">Signed in</span> : <span className="chip">Invited</span>}</td>
                  <td>
                    <form action={removeInvite}>
                      <input type="hidden" name="email" value={i.email as string} />
                      <button className="btn btn--danger btn--sm" type="submit">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
