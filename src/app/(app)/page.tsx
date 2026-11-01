import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { classDate, currentWeek, dueDate, fmtDate, fmtTime, hasHomework, hwState, todayLocal } from '@/lib/schedule';
import type { Announcement, Cohort, Submission, Week } from '@/lib/types';

export const metadata = { title: 'Home' };

export default async function Home() {
  const { supabase, profile } = await requireProfile();
  if (profile.role === 'instructor') redirect('/admin');

  const first = (profile.full_name || '').split(' ')[0] || 'there';
  if (!profile.cohort_id) {
    return (
      <>
        <h1 className="page-title">Welcome, {first}</h1>
        <div className="card">
          <p>You’re signed in, but you haven’t been placed in a class yet. Your instructor will add you to a class and your schedule will show up here.</p>
        </div>
      </>
    );
  }

  const [{ data: cohort }, { data: weeks }, { data: subs }, { data: anns }] = await Promise.all([
    supabase.from('cohorts').select('*').eq('id', profile.cohort_id).single(),
    supabase.from('weeks').select('*').order('week'),
    supabase.from('submissions').select('*').eq('student_id', profile.id),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
  ]);
  const c = cohort as Cohort;
  const W = (weeks ?? []) as Week[];
  const S = new Map(((subs ?? []) as Submission[]).map((s) => [s.week, s]));
  const today = todayLocal();
  const cw = currentWeek(c, today);

  const nextClass = W.find((w) => classDate(c, w.week) >= today);
  const homework = W.filter((w) => hasHomework(w))
    .map((w) => ({ w, state: hwState(c, w, S.get(w.week), today), due: dueDate(c, w) }))
    .filter((x) => x.state === 'overdue' || x.state === 'soon' || x.state === 'upcoming')
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  const doneCount = [...S.keys()].length;
  const totalHw = W.filter((w) => hasHomework(w)).length;

  return (
    <>
      <h1 className="page-title">Hi {first}</h1>
      <p className="sub">
        {c.name} ·{' '}
        {cw === 0 ? `Classes start ${fmtDate(c.start_date, { year: 'numeric' })}` : cw > 26 ? 'Course complete' : `Week ${cw} of 26`}
      </p>

      <div className="grid grid--2">
        <section className="card card--dark card--photo">
          <p className="eyebrow">Next class</p>
          {nextClass ? (
            <>
              <h2 style={{ fontSize: '1.7rem' }}>
                Week {nextClass.week}: {nextClass.title}
              </h2>
              <p className="muted" style={{ marginTop: 8 }}>
                {fmtDate(classDate(c, nextClass.week), { year: 'numeric' })} at {fmtTime(c.class_start)} · {c.class_hours} hours · Dream Big Studios, Studio A
              </p>
              {nextClass.lab && (
                <p className="small muted">
                  <strong>Lab this week:</strong> {nextClass.lab}
                </p>
              )}
              <Link className="btn btn--sm" href="/classes">
                See the week
              </Link>
            </>
          ) : (
            <h2>All classes are done. Great work.</h2>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">Homework</p>
          <p className="stat">
            {doneCount}
            <span className="muted" style={{ fontSize: '1rem', fontFamily: 'var(--body)', fontWeight: 600 }}> of {totalHw} turned in</span>
          </p>
          <div className="stack" style={{ marginTop: 14 }}>
            {homework.length === 0 && <p className="muted">Nothing due right now.</p>}
            {homework.map(({ w, state, due }) => (
              <div key={w.week}>
                <span className={`chip chip--${state === 'overdue' ? 'overdue' : state === 'soon' ? 'soon' : ''}`}>
                  {state === 'overdue' ? 'Overdue' : `Due ${fmtDate(due)}`}
                </span>{' '}
                <strong>Week {w.week}</strong> <span className="small muted">{w.homework.slice(0, 90)}{w.homework.length > 90 ? '…' : ''}</span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 14 }}>
            <Link href="/schedule">Open my schedule</Link>
          </p>
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
