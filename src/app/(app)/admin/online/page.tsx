import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import { buildSessions, meetingFor, setupProgress } from '@/lib/online';
import { currentWeek, fmtDate, fmtZoned, localWeek, sessionTimes, todayLocal, TZ, weekSpan } from '@/lib/schedule';
import type { Attendance, Cohort, OnlineProfile, OnlineSession, Profile, Week } from '@/lib/types';
import { saveSession } from './actions';

export const metadata = { title: 'Online classes' };

const DONE = new Set(['present', 'late', 'excused', 'watched']);
const ERR: Record<string, string> = {
  date: 'Check the new date and time.',
  meeting_url: 'The meeting link doesn’t look like a web link.',
  recording_url: 'The recording link doesn’t look like a web link.',
  slides_url: 'The slides link doesn’t look like a web link.',
  save: 'That didn’t save. If you haven’t run the database update for online students (20_online_students.sql), run it first.',
};

export default async function OnlineAdmin({ searchParams }: { searchParams: Promise<{ cohort?: string; ok?: string; err?: string; mail?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const { data: cohorts } = await supabase.from('cohorts').select('*').eq('format', 'online').order('start_date', { ascending: false });
  const C = (cohorts ?? []) as Cohort[];

  if (C.length === 0) {
    return (
      <>
        <h1 className="page-title">Online classes</h1>
        <div className="card stack">
          <p style={{ margin: 0 }}>You don’t have an online class yet. Create one under <Link href="/admin/cohorts">Classes</Link> (“New online class”), add the meeting link, and come back here to run its live sessions and recordings.</p>
        </div>
      </>
    );
  }

  const cohort = C.find((c) => c.id === q.cohort) ?? C.find((c) => c.active) ?? C[0];
  const [{ data: weeks }, { data: ovs }, { data: students }, { data: ops }] = await Promise.all([
    supabase.from('weeks').select('*').order('week'),
    supabase.from('online_sessions').select('*').eq('cohort_id', cohort.id),
    supabase.from('profiles').select('*').eq('role', 'student').eq('cohort_id', cohort.id).order('full_name'),
    supabase.from('online_profiles').select('*'),
  ]);
  const W = (weeks ?? []) as Week[];
  const S = (students ?? []) as Profile[];
  const OP = new Map(((ops ?? []) as OnlineProfile[]).map((o) => [o.student_id, o]));
  const { data: att } = S.length ? await supabase.from('attendance').select('*').in('student_id', S.map((s) => s.id)) : { data: [] };
  const A = new Map(((att ?? []) as (Attendance & { student_id: string })[]).map((a) => [`${a.student_id}:${a.week}`, a.status]));
  const rows = buildSessions(cohort, W, (ovs ?? []) as OnlineSession[]);
  const today = todayLocal();
  const cw = currentWeek(cohort, today);
  const meet = meetingFor(cohort, null);
  const ready = S.filter((s) => setupProgress(OP.get(s.id) ?? null).complete).length;

  return (
    <>
      <h1 className="page-title">Online classes</h1>
      <p className="sub">Run the live sessions: post recordings, reschedule or cancel a session, and see who has caught up.</p>
      {q.ok && <div className="notice notice--ok">Saved.{q.mail === 'none' ? ' (Nothing to email for that change.)' : q.mail ? ` Emailed ${q.mail.replace('of', ' of ')} students.` : ''}</div>}
      {q.err && <div className="notice notice--err">{ERR[q.err] ?? ERR.save}</div>}

      {C.length > 1 && (
        <form method="get" className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 16 }}>
          <div>
            <label htmlFor="cohort">Class</label>
            <select id="cohort" name="cohort" defaultValue={cohort.id}>{C.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <button className="btn btn--sm" type="submit">Show</button>
        </form>
      )}

      <div className="grid grid--3" style={{ marginBottom: 16 }}>
        <section className="card">
          <p className="eyebrow">{cohort.name}</p>
          <h2 style={{ margin: 0 }}>{cw === 0 ? `Starts ${fmtDate(cohort.start_date, { year: 'numeric' })}` : cw > weekSpan(cohort).last ? 'Finished' : `Week ${localWeek(cohort, cw)} of ${weekSpan(cohort).count}`}</h2>
          <p className="small muted" style={{ margin: '6px 0 0' }}>{S.length} of {cohort.seats} seats filled</p>
        </section>
        <section className="card">
          <p className="eyebrow">Students ready</p>
          <h2 style={{ margin: 0 }}>{ready} of {S.length}</h2>
          <p className="small muted" style={{ margin: '6px 0 0' }}>finished the setup checklist</p>
        </section>
        <section className="card">
          <p className="eyebrow">Meeting link</p>
          {meet.url ? <p style={{ margin: 0 }}><a href={meet.url} target="_blank" rel="noopener noreferrer">Open the meeting</a></p> : <p style={{ margin: 0 }} className="muted">Not set yet</p>}
          <p className="small" style={{ margin: '6px 0 0' }}><Link href="/admin/cohorts">Change it under Classes</Link></p>
        </section>
      </div>

      <h2 className="phase" style={{ marginTop: 8 }}>Sessions</h2>
      {rows.map((r) => {
        const o = r.ov;
        const behind = r.state === 'ended' && !r.times.canceled ? S.filter((s) => !DONE.has(A.get(`${s.id}:${r.week}`) ?? '')) : [];
        const stateChip = r.state === 'canceled' ? <span className="chip chip--overdue">Canceled</span> : r.state === 'open' ? <span className="chip chip--soon">Live now</span> : r.state === 'ended' ? <span className="chip">Done</span> : <span className="chip chip--later">Upcoming</span>;
        return (
          <details key={r.week} id={`w${r.week}`} className="week">
            <summary style={{ cursor: 'pointer' }}>
              <span className="week__n">Week {localWeek(cohort, r.week)}</span> <span className="week__title">{r.title}</span>{' '}
              {stateChip}{' '}
              {o?.recording_url && <span className="chip chip--done">Recording posted</span>}{' '}
              {r.times.rescheduled && !r.times.canceled && <span className="chip chip--soon">Rescheduled</span>}{' '}
              {r.state === 'ended' && !o?.recording_url && !r.times.canceled && <span className="chip chip--soon">Needs recording</span>}
              <span className="small muted"> · {fmtZoned(r.times.start, TZ)}</span>
            </summary>

            <form action={saveSession} className="stack" style={{ marginTop: 14 }}>
              <input type="hidden" name="cohort_id" value={cohort.id} />
              <input type="hidden" name="week" value={r.week} />
              <div><label>Note for students before this session</label><textarea name="topic_note" maxLength={1000} defaultValue={o?.topic_note ?? ''} placeholder="Bring a vocal take you’d like to work on." style={{ minHeight: 70 }} /></div>
              <div className="row">
                <div><label>Recording link (after class)</label><input name="recording_url" type="text" defaultValue={o?.recording_url ?? ''} placeholder="https://" /></div>
                <div><label>Slides or files link</label><input name="slides_url" type="text" defaultValue={o?.slides_url ?? ''} placeholder="https://" /></div>
              </div>
              <div><label>Recording notes (chapter times, key points)</label><textarea name="recording_note" maxLength={2000} defaultValue={o?.recording_note ?? ''} placeholder={'0:00 Welcome\n12:30 Gain staging demo'} style={{ minHeight: 80 }} /></div>
              <details className="fold">
                <summary>Reschedule, cancel or use a different meeting link</summary>
                <div className="stack" style={{ marginTop: 10 }}>
                  <div className="row">
                    <div><label>New date (Killeen time)</label><input name="date_override" type="date" defaultValue={o?.date_override ?? ''} /></div>
                    <div><label>New start time (Killeen time)</label><input name="time_override" type="time" defaultValue={o?.time_override?.slice(0, 5) ?? ''} /></div>
                  </div>
                  <p className="small muted" style={{ margin: 0 }}>Leave both blank to keep the normal time. The normal time is {fmtZoned(sessionTimesNormal(cohort, r.week), TZ)}.</p>
                  <div><label>Meeting link for this session only</label><input name="meeting_url" type="text" defaultValue={o?.meeting_url ?? ''} placeholder="Leave blank to use the class link" /></div>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
                    <input type="checkbox" name="canceled" value="1" defaultChecked={o?.canceled} style={{ width: 20, height: 20 }} /> This session is canceled
                  </label>
                </div>
              </details>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
                <input type="checkbox" name="notify" value="1" style={{ width: 20, height: 20 }} /> Email the class about what changed (new recording, new time or cancellation)
              </label>
              <button className="btn btn--sm" type="submit">Save week {localWeek(cohort, r.week)}</button>
            </form>

            {behind.length > 0 && (
              <p className="small" style={{ margin: '12px 0 0' }}>
                <strong>{behind.length}</strong> not counted for this session yet: {behind.map((s) => (s.full_name || s.email).split(' ')[0]).join(', ')}.{' '}
                <Link href={`/admin/attendance?cohort=${cohort.id}&week=${r.week}`}>Take attendance</Link>
              </p>
            )}
          </details>
        );
      })}
    </>
  );
}

/** The regular start time of a session, ignoring any one-off change. */
function sessionTimesNormal(cohort: Cohort, week: number): Date {
  return sessionTimes(cohort, week, null).start;
}
