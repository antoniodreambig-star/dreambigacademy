import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import { TZ, fmtZoned } from '@/lib/schedule';
import type { Cohort, OfficeHour, Profile } from '@/lib/types';
import { createSlots, deleteSlot, releaseSlot } from './actions';

export const metadata = { title: 'Office hours' };

const OK: Record<string, string> = { created: 'Slots added.', deleted: 'Slot removed.', released: 'Booking released. The time is open again.' };
const ERR: Record<string, string> = {
  when: 'Enter the date and start time.',
  count: 'Slot length must be 10–120 minutes, up to 12 slots a day, repeated for up to 12 weeks.',
  link: 'The meeting link doesn’t look like a web link.',
  past: 'Those times have already passed. Pick a future date.',
  save: 'That didn’t save. If you haven’t run the database update for online students (20_online_students.sql), run it first.',
};

export default async function OfficeHoursAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; n?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const nowIso = new Date().toISOString();
  const [{ data: cohorts }, { data: upcoming }, { data: recent }] = await Promise.all([
    supabase.from('cohorts').select('*').eq('format', 'online').order('start_date', { ascending: false }),
    supabase.from('office_hours').select('*').gt('starts_at', nowIso).order('starts_at'),
    supabase.from('office_hours').select('*').not('booked_by', 'is', null).lte('starts_at', nowIso).order('starts_at', { ascending: false }).limit(10),
  ]);
  const C = (cohorts ?? []) as Cohort[];
  const U = (upcoming ?? []) as OfficeHour[];
  const R = (recent ?? []) as OfficeHour[];
  const ids = [...new Set([...U, ...R].map((s) => s.booked_by).filter((x): x is string => !!x))];
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
  const P = new Map(((people ?? []) as Pick<Profile, 'id' | 'full_name' | 'email'>[]).map((p) => [p.id, p]));
  const who = (id: string | null) => (id ? P.get(id)?.full_name || P.get(id)?.email || 'A student' : null);
  const booked = U.filter((s) => s.booked_by).length;

  return (
    <>
      <h1 className="page-title">Office hours</h1>
      <p className="sub">Open one-on-one slots for your online students. They pick a time themselves, you get an email, and their times show in their own time zone. Everything here is in Killeen time ({TZ.replace('_', ' ')}).</p>
      {q.ok && OK[q.ok] && <div className="notice notice--ok">{OK[q.ok]}{q.ok === 'created' && q.n ? ` (${q.n})` : ''}</div>}
      {q.err && <div className="notice notice--err">{ERR[q.err] ?? ERR.save}</div>}

      <section className="card stack">
        <h2>Add slots</h2>
        {C.length === 0 && <p className="small muted" style={{ margin: 0 }}>Create an online class first under <Link href="/admin/cohorts">Classes</Link>. Slots can be open to every online class or to one class.</p>}
        <form action={createSlots} className="stack">
          <div className="row">
            <div><label htmlFor="date">First day</label><input id="date" name="date" type="date" required /></div>
            <div><label htmlFor="time">First slot starts at</label><input id="time" name="time" type="time" defaultValue="18:00" required /></div>
          </div>
          <div className="row">
            <div><label htmlFor="minutes">Minutes per slot</label><input id="minutes" name="minutes" type="number" min={10} max={120} defaultValue={20} required /></div>
            <div><label htmlFor="slots">Back-to-back slots that day</label><input id="slots" name="slots" type="number" min={1} max={12} defaultValue={3} required /></div>
          </div>
          <div className="row">
            <div>
              <label htmlFor="weeks">Repeat weekly for</label>
              <input id="weeks" name="weeks" type="number" min={1} max={12} defaultValue={1} required />
              <p className="small muted" style={{ margin: '4px 0 0' }}>weeks (1 = just that day)</p>
            </div>
            <div>
              <label htmlFor="cohort_id">Open to</label>
              <select id="cohort_id" name="cohort_id" defaultValue="">
                <option value="">Every online class</option>
                {C.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label htmlFor="meeting_url">Meeting link (optional)</label><input id="meeting_url" name="meeting_url" type="text" placeholder="Leave blank to use the class meeting link" /></div>
          <button className="btn" type="submit" style={{ alignSelf: 'flex-start' }}>Add slots</button>
        </form>
      </section>

      <h2 className="phase">Upcoming <span className="muted small">{booked} booked · {U.length - booked} open</span></h2>
      <section className="card tablewrap">
        <table>
          <thead><tr><th>When (Killeen)</th><th>Length</th><th>Student</th><th /></tr></thead>
          <tbody>
            {U.length === 0 && <tr><td colSpan={4} className="muted">No upcoming slots.</td></tr>}
            {U.map((s) => (
              <tr key={s.id}>
                <td>{fmtZoned(new Date(s.starts_at), TZ)}</td>
                <td>{s.minutes} min</td>
                <td>
                  {s.booked_by ? (
                    <>
                      <Link href={`/admin/students/${s.booked_by}`}><strong>{who(s.booked_by)}</strong></Link>
                      {s.topic && <><br /><span className="small muted">{s.topic}</span></>}
                    </>
                  ) : (
                    <span className="chip chip--later">Open</span>
                  )}
                </td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.booked_by && (
                    <form action={releaseSlot}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn btn--ghost btn--sm" type="submit">Release</button>
                    </form>
                  )}
                  <form action={deleteSlot}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn btn--danger btn--sm" type="submit">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {R.length > 0 && (
        <>
          <h2 className="phase">Recent sessions</h2>
          <section className="card stack">
            {R.map((s) => (
              <p key={s.id} className="small" style={{ margin: 0 }}>{fmtZoned(new Date(s.starts_at), TZ)} · <strong>{who(s.booked_by)}</strong>{s.topic ? ` · ${s.topic}` : ''}</p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
