import Link from 'next/link';
import { requireOnlineStudent } from '@/lib/auth';
import { DEFAULT_TZ, buildSessions, meetingFor, type SessionRow } from '@/lib/online';
import { TZ, fmtZoned, fmtZonedTime, localWeek } from '@/lib/schedule';
import type { Attendance, AttendanceStatus, OnlineProfile, OnlineSession, Week } from '@/lib/types';
import { markWatched } from './actions';

export const metadata = { title: 'Live sessions' };

const ATT: Record<AttendanceStatus, [string, string]> = {
  present: ['Attended live', 'chip--done'],
  late: ['Joined late', 'chip--soon'],
  absent: ['Missed', 'chip--overdue'],
  excused: ['Excused', ''],
  watched: ['Watched recording', 'chip--done'],
};

export default async function Live({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase, profile, cohort } = await requireOnlineStudent();
  const q = await searchParams;
  const [{ data: weeks }, { data: ovs }, { data: op }, { data: att }] = await Promise.all([
    supabase.from('online_weeks').select('week,title,phase').order('week'),
    supabase.from('online_sessions').select('*').eq('cohort_id', cohort.id),
    supabase.from('online_profiles').select('*').eq('student_id', profile.id).maybeSingle(),
    supabase.from('attendance').select('*').eq('student_id', profile.id),
  ]);
  const tz = ((op as OnlineProfile | null)?.time_zone) || DEFAULT_TZ;
  const A = new Map(((att ?? []) as Attendance[]).map((a) => [a.week, a.status]));
  const W = (weeks ?? []) as Pick<Week, 'week' | 'title' | 'phase'>[];
  const phaseOf = new Map(W.map((w) => [w.week, w.phase]));
  const rows = buildSessions(cohort, W, (ovs ?? []) as OnlineSession[]);
  const upcoming = rows.filter((r) => r.state === 'open' || r.state === 'later');
  const past = rows.filter((r) => r.state === 'ended' || r.state === 'canceled');
  const meet = meetingFor(cohort, null);

  function Row({ r }: { r: SessionRow }) {
    const m = meetingFor(cohort, r.ov);
    const status = A.get(r.week);
    const canWatch = r.state === 'ended' && r.ov?.recording_url && (!status || status === 'absent');
    return (
      <article id={`w${r.week}`} className="week">
        <div className="week__head">
          <span className="week__n">Week {localWeek(cohort, r.week)}</span>
          <span className="week__title">{r.title}</span>
          {r.state === 'open' && <span className="chip chip--soon">Live now</span>}
          {r.state === 'canceled' && <span className="chip chip--overdue">Canceled</span>}
          {r.times.rescheduled && r.state !== 'canceled' && <span className="chip chip--soon">Rescheduled</span>}
          {status && <span className={`chip ${ATT[status][1]}`}>{ATT[status][0]}</span>}
          <span className="week__date">{fmtZoned(r.times.start, tz)}</span>
        </div>
        {tz !== TZ && r.state !== 'canceled' && <p className="small muted" style={{ margin: '6px 0 0' }}>{fmtZonedTime(r.times.start, TZ)} in Killeen.</p>}
        {r.ov?.topic_note && <p className="small" style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}><strong>Note from your instructor:</strong> {r.ov.topic_note}</p>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          {(r.state === 'open' || r.state === 'later') && m.url && (
            <a className={`btn btn--sm${r.state === 'open' ? '' : ' btn--ghost'}`} href={m.url} target="_blank" rel="noopener noreferrer">Join live session</a>
          )}
          {r.ov?.recording_url && <a className="btn btn--sm" href={r.ov.recording_url} target="_blank" rel="noopener noreferrer">Watch recording</a>}
          {r.ov?.slides_url && <a className="btn btn--ghost btn--sm" href={r.ov.slides_url} target="_blank" rel="noopener noreferrer">Slides and files</a>}
          {r.state === 'ended' && !r.ov?.recording_url && <span className="small muted">Recording coming soon.</span>}
          {canWatch && (
            <form action={markWatched}>
              <input type="hidden" name="week" value={r.week} />
              <button className="btn btn--ghost btn--sm" type="submit">I watched it</button>
            </form>
          )}
        </div>
        {r.ov?.recording_note && (
          <details className="fold" style={{ marginTop: 10 }}>
            <summary>Notes and chapter times</summary>
            <p className="small" style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{r.ov.recording_note}</p>
          </details>
        )}
      </article>
    );
  }

  const grouped = (list: SessionRow[]) => {
    let last = '';
    return list.map((r) => {
      const ph = phaseOf.get(r.week) ?? '';
      const head = ph && ph !== last ? <h3 key={`p${r.week}`} className="phase" style={{ fontSize: '1.05rem' }}>{ph}</h3> : null;
      last = ph;
      return (
        <div key={r.week}>
          {head}
          <Row r={r} />
        </div>
      );
    });
  };

  return (
    <>
      <h1 className="page-title">Live sessions</h1>
      <p className="sub">
        {cohort.class_hours}-hour live video sessions. Times are shown in your time zone ({tz.replace(/_/g, ' ')}). <Link href="/setup">Change it</Link>
      </p>
      {q.ok && <div className="notice notice--ok">Marked as watched. Nice catch-up.</div>}
      {q.err && <div className="notice notice--err">{q.err === 'early' ? 'You can mark a recording as watched after the session is over and the recording is posted.' : 'That didn’t save. Please try again.'}</div>}

      <section className="card stack" style={{ marginBottom: 20 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Class meeting link</p>
        {meet.url ? (
          <>
            <p style={{ margin: 0 }}><a className="btn btn--sm" href={meet.url} target="_blank" rel="noopener noreferrer">Open the meeting</a></p>
            {meet.passcode && <p className="small" style={{ margin: 0 }}>Passcode: <strong>{meet.passcode}</strong></p>}
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Your instructor will post the meeting link here before the first session.</p>
        )}
        {cohort.meeting_notes && <p className="small" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{cohort.meeting_notes}</p>}
        <p className="small muted" style={{ margin: 0 }}>Every session is recorded and posted here afterwards. If you can’t make it live, watch the recording and tap “I watched it” so your instructor knows you’re caught up.</p>
      </section>

      {upcoming.length > 0 && (<><h2 className="phase" style={{ marginTop: 0 }}>Coming up</h2>{grouped(upcoming)}</>)}
      {past.length > 0 && (<><h2 className="phase">Past sessions</h2>{grouped([...past].reverse())}</>)}
    </>
  );
}
