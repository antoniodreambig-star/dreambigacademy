import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSessions, latestRecording, meetingFor, nextSession, setupProgress, DEFAULT_TZ } from '@/lib/online';
import { TZ, currentWeek, dueDate, fmtDate, fmtZoned, fmtZonedTime, hasHomework, hwState, localWeek, todayLocal, weekSpan, weeksFor } from '@/lib/schedule';
import type { Announcement, Attendance, Cohort, OfficeHour, OnlineProfile, OnlineSession, Profile, Submission, Week } from '@/lib/types';

const DONE = new Set(['present', 'late', 'excused', 'watched']);

/** The Home page for students in an online class. */
export default async function OnlineHome({ supabase, profile, cohort }: { supabase: SupabaseClient; profile: Profile; cohort: Cohort }) {
  const first = (profile.full_name || '').split(' ')[0] || 'there';
  const nowIso = new Date().toISOString();
  const [{ data: weeks }, { data: subs }, { data: ovs }, { data: op }, { data: att }, { data: anns }, { data: oh }] = await Promise.all([
    supabase.from('online_weeks').select('*').order('week'),
    supabase.from('submissions').select('*').eq('student_id', profile.id),
    supabase.from('online_sessions').select('*').eq('cohort_id', cohort.id),
    supabase.from('online_profiles').select('*').eq('student_id', profile.id).maybeSingle(),
    supabase.from('attendance').select('*').eq('student_id', profile.id),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('office_hours').select('*').eq('booked_by', profile.id).gt('starts_at', nowIso).order('starts_at').limit(1),
  ]);

  const W = weeksFor(cohort, (weeks ?? []) as Week[]);
  const S = new Map(((subs ?? []) as Submission[]).map((s) => [s.week, s]));
  const prof = (op as OnlineProfile | null) ?? null;
  const tz = prof?.time_zone || DEFAULT_TZ;
  const A = new Map(((att ?? []) as Attendance[]).map((a) => [a.week, a.status]));
  const rows = buildSessions(cohort, W, (ovs ?? []) as OnlineSession[]);
  const next = nextSession(rows);
  const latest = latestRecording(rows);
  const today = todayLocal();
  const cw = currentWeek(cohort, today);
  const total = weekSpan(cohort).last;
  const setup = setupProgress(prof);
  const booked = ((oh ?? []) as OfficeHour[])[0] ?? null;

  // Finished sessions with a recording that this student hasn't attended or watched yet.
  const toWatch = rows.filter((r) => r.state === 'ended' && !r.times.canceled && r.ov?.recording_url && !DONE.has(A.get(r.week) ?? ''));

  const homework = W.filter(hasHomework)
    .map((w) => ({ w, state: hwState(cohort, w, S.get(w.week), today), due: dueDate(cohort, w) }))
    .filter((x) => x.state === 'overdue' || x.state === 'soon' || x.state === 'upcoming')
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  const totalHw = W.filter(hasHomework).length;

  const meet = next ? meetingFor(cohort, next.ov) : { url: null, passcode: null };

  return (
    <>
      <h1 className="page-title">Hi {first}</h1>
      <p className="sub">
        {cohort.name} · Online ·{' '}
        {cw === 0 ? `Live sessions start ${fmtDate(cohort.start_date, { year: 'numeric' })}` : cw > total ? 'Course complete' : `Week ${localWeek(cohort, cw)} of ${weekSpan(cohort).count}`}
      </p>

      {!setup.complete && (
        <div className="notice notice--err" role="status">
          Finish your setup checklist ({setup.done} of {setup.total} done) so you’re ready for the first live session. <Link href="/setup">Open the checklist</Link>
        </div>
      )}

      <div className="grid grid--2">
        <section className="card card--dark card--photo">
          <p className="eyebrow">{next?.state === 'open' ? 'Live now' : 'Next live session'}</p>
          {next ? (
            <>
              <h2 style={{ fontSize: '1.7rem' }}>
                Week {localWeek(cohort, next.week)}: {next.title}
              </h2>
              <p className="muted" style={{ marginTop: 8 }}>
                {fmtZoned(next.times.start, tz)} · {cohort.class_hours} hours
                {next.times.rescheduled && <> · <strong>rescheduled</strong></>}
              </p>
              {tz !== TZ && <p className="small muted" style={{ margin: '0 0 8px' }}>That’s {fmtZonedTime(next.times.start, TZ)} in Killeen.</p>}
              {next.ov?.topic_note && <p className="small" style={{ whiteSpace: 'pre-wrap' }}><strong>Before you join:</strong> {next.ov.topic_note}</p>}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {meet.url ? (
                  <a className={`btn btn--sm${next.state === 'open' ? '' : ' btn--ghost'}`} href={meet.url} target="_blank" rel="noopener noreferrer">
                    Join the live session
                  </a>
                ) : (
                  <span className="small muted">Your instructor will post the meeting link soon.</span>
                )}
                <Link className="btn btn--ghost btn--sm" href="/live">All sessions</Link>
              </div>
              {meet.passcode && <p className="small muted" style={{ margin: '10px 0 0' }}>Passcode: <strong>{meet.passcode}</strong></p>}
            </>
          ) : (
            <h2>All live sessions are done. Great work.</h2>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">Homework</p>
          <p className="stat">
            {S.size}
            <span className="muted" style={{ fontSize: '1rem', fontFamily: 'var(--body)', fontWeight: 600 }}> of {totalHw} turned in</span>
          </p>
          <div className="stack" style={{ marginTop: 14 }}>
            {homework.length === 0 && <p className="muted">Nothing due right now.</p>}
            {homework.map(({ w, state, due }) => (
              <div key={w.week}>
                <span className={`chip chip--${state === 'overdue' ? 'overdue' : state === 'soon' ? 'soon' : ''}`}>{state === 'overdue' ? 'Overdue' : `Due ${fmtDate(due)}`}</span>{' '}
                <strong>Week {localWeek(cohort, w.week)}</strong> <span className="small muted">{w.homework.slice(0, 90)}{w.homework.length > 90 ? '…' : ''}</span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 14 }}><Link href="/schedule">Open my schedule</Link></p>
        </section>
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <section className="card">
          <p className="eyebrow">Recordings</p>
          {toWatch.length > 0 ? (
            <>
              <p style={{ margin: 0 }}><strong>{toWatch.length}</strong> recording{toWatch.length === 1 ? '' : 's'} to catch up on.</p>
              <p className="small muted" style={{ margin: '6px 0 12px' }}>
                {toWatch.slice(0, 3).map((r) => `Week ${localWeek(cohort, r.week)}`).join(', ')}{toWatch.length > 3 ? '…' : ''}
              </p>
            </>
          ) : latest ? (
            <p style={{ margin: '0 0 12px' }}>Latest: Week {localWeek(cohort, latest.week)}, {latest.title}.</p>
          ) : (
            <p className="muted" style={{ margin: '0 0 12px' }}>Every live session is recorded. Recordings show up here after class.</p>
          )}
          <Link className="btn btn--ghost btn--sm" href="/live">Open live sessions</Link>
        </section>

        <section className="card">
          <p className="eyebrow">Office hours</p>
          {booked ? (
            <>
              <p style={{ margin: 0 }}><strong>{fmtZoned(new Date(booked.starts_at), tz)}</strong></p>
              <p className="small muted" style={{ margin: '4px 0 12px' }}>{booked.minutes} minutes one-on-one{booked.topic ? ` · ${booked.topic}` : ''}</p>
            </>
          ) : (
            <p className="muted" style={{ margin: '0 0 12px' }}>Book a one-on-one with your instructor to go over your mix, your setup or anything you’re stuck on.</p>
          )}
          <Link className="btn btn--ghost btn--sm" href="/office-hours">{booked ? 'Manage booking' : 'Book a time'}</Link>
        </section>
      </div>

      {(anns ?? []).length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <p className="eyebrow">Announcements</p>
          <div className="stack">
            {((anns ?? []) as Announcement[]).map((a) => (
              <div key={a.id}>
                <strong>{a.title}</strong> <span className="small muted">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <p className="small" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{a.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
