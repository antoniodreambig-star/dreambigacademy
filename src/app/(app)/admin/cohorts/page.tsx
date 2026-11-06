import { requireInstructor } from '@/lib/auth';
import { classDate, courseWeeks, fmtDate } from '@/lib/schedule';
import type { Cohort, Format } from '@/lib/types';
import { addInvite, createCohort, removeInvite, updateCohort } from '../actions';

export const metadata = { title: 'Classes' };


/** The create / edit form for one class. Online classes also get the meeting link, passcode and a seat count. */
function Fields({ format, c }: { format: Format; c?: Cohort }) {
  const online = format === 'online';
  const id = c?.id ?? `new-${format}`;
  return (
    <>
      <input type="hidden" name="format" value={format} />
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="row">
        <div><label htmlFor={`n-${id}`}>Name</label><input id={`n-${id}`} name="name" type="text" placeholder={online ? 'Online Winter 2027' : 'Spring 2027'} defaultValue={c?.name ?? ''} required /></div>
        <div><label htmlFor={`d-${id}`}>Week 1 {online ? 'live session' : 'class'} date</label><input id={`d-${id}`} name="start_date" type="date" defaultValue={c?.start_date ?? ''} required /></div>
      </div>
      <div className="row">
        <div><label htmlFor={`t-${id}`}>{online ? 'Session starts at (Killeen time)' : 'Class starts at'}</label><input id={`t-${id}`} name="class_start" type="time" defaultValue={c?.class_start.slice(0, 5) ?? '10:00'} required /></div>
        <div><label htmlFor={`h-${id}`}>{online ? 'Session' : 'Class'} length (hours)</label><input id={`h-${id}`} name="class_hours" type="number" step="0.5" min="1" max="8" defaultValue={c?.class_hours ?? (online ? 2 : 3)} /></div>
      </div>
      <div style={{ maxWidth: 260 }}>
        <label htmlFor={`s-${id}`}>Seats</label>
        <input id={`s-${id}`} name="seats" type="number" min="1" max="200" defaultValue={c?.seats ?? (online ? 12 : 6)} />
      </div>
      {online && (
        <>
          <div className="row">
            <div><label htmlFor={`m-${id}`}>Meeting link (Zoom, Google Meet…)</label><input id={`m-${id}`} name="meeting_url" type="text" placeholder="https://zoom.us/j/…" defaultValue={c?.meeting_url ?? ''} /></div>
            <div><label htmlFor={`p-${id}`}>Passcode (optional)</label><input id={`p-${id}`} name="meeting_passcode" type="text" maxLength={60} defaultValue={c?.meeting_passcode ?? ''} /></div>
          </div>
          <div><label htmlFor={`x-${id}`}>Note for students (optional)</label><textarea id={`x-${id}`} name="meeting_notes" maxLength={600} defaultValue={c?.meeting_notes ?? ''} placeholder="Join 5 minutes early. Cameras on, please. Headphones on so there’s no echo." style={{ minHeight: 70 }} /></div>
        </>
      )}
    </>
  );
}

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
      <p className="sub">Set a start date and every class, lab and due date is figured out for you. Online classes (3 months, live video) are set up here too. Only emails you add here can create an account.</p>
      {q.ok && <div className="notice notice--ok">Saved.</div>}
      {q.err && <div className="notice notice--err">{q.err === 'email' ? 'Enter a valid email address.' : 'Check the name and start date and try again.'}</div>}

      <div className="grid grid--2">
        <section className="card stack">
          <h2>New in-person class</h2>
          <form action={createCohort} className="stack">
            <Fields format="in_person" />
            <p className="small muted" style={{ margin: 0 }}>Classes repeat on the same weekday for {courseWeeks('in_person')} weeks at the studio.</p>
            <button className="btn" type="submit">Create class</button>
          </form>
        </section>
        <section className="card stack">
          <h2>New online class</h2>
          <form action={createCohort} className="stack">
            <Fields format="online" />
            <p className="small muted" style={{ margin: 0 }}>Live video sessions repeat weekly for {courseWeeks('online')} weeks (3 months). Students see times in their own time zone.</p>
            <button className="btn" type="submit">Create online class</button>
          </form>
        </section>
      </div>

      {C.map((c) => (
        <section className="card" key={c.id} style={{ marginTop: 16 }}>
          <h2>{c.name} {c.format === 'online' && <span className="chip chip--soon">Online</span>}</h2>
          <p className="muted small">
            {day(c.class_weekday)}s · Week 1 {fmtDate(c.start_date, { year: 'numeric' })} · Week {courseWeeks(c.format)} {fmtDate(classDate(c, courseWeeks(c.format)), { year: 'numeric' })} · {c.seats} seats
            {c.format === 'online' && (c.meeting_url ? ' · meeting link set' : ' · no meeting link yet')}
          </p>
          <details className="fold">
            <summary>Change dates, time or {c.format === 'online' ? 'meeting link' : 'seats'}</summary>
            <form action={updateCohort} className="stack">
              <Fields format={c.format} c={c} />
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
              {C.map((c) => <option key={c.id} value={c.id}>{c.name}{c.format === 'online' ? ' (online)' : ''}</option>)}
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
