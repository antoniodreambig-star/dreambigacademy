import { requireStudent } from '@/lib/auth';
import { classDate, dueDate, fmtDate, fmtTime, hasHomework, hwState, todayLocal, type HwState } from '@/lib/schedule';
import { siteUrl } from '@/lib/email';
import type { Cohort, Project, Submission, SubmissionComment, Week } from '@/lib/types';
import HomeworkForm from '@/components/HomeworkForm';
import AudioFeedback, { type FbComment } from '@/components/AudioFeedback';
import { undoHomework } from './actions';

const isAudio = (p: string | null) => !!p && /\.(mp3|wav|m4a|aac|ogg|oga|flac|aif|aiff)$/i.test(p);

export const metadata = { title: 'Schedule' };

const LABEL: Record<HwState, string> = { done: 'Turned in', overdue: 'Overdue', soon: 'Due soon', upcoming: 'Upcoming', later: 'Not assigned yet' };

export default async function Schedule({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase, profile } = await requireStudent();
  const q = await searchParams;
  if (!profile.cohort_id) {
    return (
      <>
        <h1 className="page-title">Schedule</h1>
        <div className="card"><p>Your instructor hasn’t placed you in a class yet. Your classes and due dates will appear here.</p></div>
      </>
    );
  }
  const [{ data: cohort }, { data: weeks }, { data: subs }, { data: projects }] = await Promise.all([
    supabase.from('cohorts').select('*').eq('id', profile.cohort_id).single(),
    supabase.from('weeks').select('*').order('week'),
    supabase.from('submissions').select('*').eq('student_id', profile.id),
    supabase.from('projects').select('*'),
  ]);
  const c = cohort as Cohort;
  const W = (weeks ?? []) as Week[];
  const S = new Map(((subs ?? []) as Submission[]).map((s) => [s.week, s]));
  const P = (projects ?? []) as Project[];
  const today = todayLocal();

  // Signed links for uploaded files.
  const urls = new Map<string, string>();
  for (const s of S.values()) {
    if (s.file_path) {
      const { data } = await supabase.storage.from('homework').createSignedUrl(s.file_path, 3600);
      if (data?.signedUrl) urls.set(s.file_path, data.signedUrl);
    }
  }

  const ids = [...S.values()].map((s) => s.id);
  const { data: cmts } = ids.length ? await supabase.from('submission_comments').select('*').in('submission_id', ids).order('created_at') : { data: [] };
  const comments = new Map<string, FbComment[]>();
  for (const c of (cmts ?? []) as SubmissionComment[]) {
    const list = comments.get(c.submission_id) ?? [];
    list.push({ id: c.id, at_seconds: c.at_seconds, body: c.body, author_name: c.author_name || 'Someone', author_role: c.author_role, mine: c.author_id === profile.id });
    comments.set(c.submission_id, list);
  }

  const items = W.filter(hasHomework).map((w) => ({ w, s: S.get(w.week), state: hwState(c, w, S.get(w.week), today), due: dueDate(c, w) }));
  const groups: { title: string; list: typeof items; open?: boolean }[] = [
    { title: 'Needs attention', list: items.filter((i) => i.state === 'overdue' || i.state === 'soon').sort((a, b) => a.due.localeCompare(b.due)) },
    { title: 'Coming up', list: items.filter((i) => i.state === 'upcoming').sort((a, b) => a.due.localeCompare(b.due)) },
    { title: 'Turned in', list: items.filter((i) => i.state === 'done').sort((a, b) => b.w.week - a.w.week) },
    { title: 'Not assigned yet', list: items.filter((i) => i.state === 'later') },
  ];
  const upcoming = W.filter((w) => classDate(c, w.week) >= today).slice(0, 4);
  const feed = `${siteUrl()}/api/calendar/${profile.calendar_token}.ics`;

  return (
    <>
      <h1 className="page-title">Schedule and homework</h1>
      <p className="sub">{c.name}: class starts {fmtTime(c.class_start)}, {c.class_hours} hours.</p>
      {q.ok && <div className="notice notice--ok">Homework turned in. Nice work.</div>}
      {q.err && <div className="notice notice--err">That didn’t go through ({q.err === 'size' ? 'file is over 25 MB' : 'please try again'}).</div>}

      <div className="grid grid--2" style={{ marginBottom: 20 }}>
        <section className="card">
          <p className="eyebrow">Next classes</p>
          <div className="stack">
            {upcoming.length === 0 && <p className="muted">No more classes on the calendar.</p>}
            {upcoming.map((w) => (
              <div key={w.week}>
                <strong>{fmtDate(classDate(c, w.week))}</strong> · Week {w.week}: {w.title}
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <p className="eyebrow">Put it on your phone</p>
          <p className="small">Add this link to Google Calendar or Apple Calendar (“subscribe from URL”). Classes and due dates stay up to date by themselves.</p>
          <input type="text" readOnly value={feed} aria-label="Calendar feed link" onFocus={undefined} style={{ fontSize: 13 }} />
        </section>
      </div>

      {groups.map((g) =>
        g.list.length === 0 ? null : (
          <section key={g.title} style={{ marginBottom: 24 }}>
            <h2 className="phase" style={{ marginTop: 0 }}>{g.title}</h2>
            {g.list.map(({ w, s, state, due }) => {
              const proj = P.find((p) => p.week === w.week);
              return (
                <article key={w.week} id={`w${w.week}`} className={`week hw hw--${state}`}>
                  <div className="hw__top">
                    <span className="week__n">Week {w.week}</span>
                    <span className={`chip chip--${state}`}>{LABEL[state]}</span>
                    <span className="small muted">Due {fmtDate(due, { year: 'numeric' })}</span>
                  </div>
                  <p style={{ marginBottom: 8 }}>{w.homework}</p>
                  {proj && (
                    <details className="fold" style={{ marginBottom: 10 }}>
                      <summary>{proj.title}: what to hand in</summary>
                      <ul className="small">{proj.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                    </details>
                  )}
                  {s ? (
                    <>
                      <p className="small muted" style={{ marginBottom: 4 }}>
                        Turned in {new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {s.note ? ` · “${s.note}”` : ''}
                      </p>
                      <p className="small" style={{ marginBottom: 6 }}>
                        {s.link && <><a href={s.link} target="_blank" rel="noopener noreferrer">Your link</a>{' '}</>}
                        {s.file_path && urls.get(s.file_path) && <a href={urls.get(s.file_path)} target="_blank" rel="noopener noreferrer">Your file</a>}
                      </p>
                      {isAudio(s.file_path) && urls.get(s.file_path!) && (
                        <AudioFeedback submissionId={s.id} src={urls.get(s.file_path!)!} comments={comments.get(s.id) ?? []} returnTo={`/schedule#w${w.week}`} isInstructor={false} />
                      )}
                      {s.feedback && <div className="feedback"><strong>Feedback from your instructor:</strong><br />{s.feedback}</div>}
                      <form action={undoHomework} style={{ marginTop: 10 }}>
                        <input type="hidden" name="week" value={w.week} />
                        <button className="btn btn--ghost btn--sm" type="submit">Undo turn-in</button>
                      </form>
                    </>
                  ) : state === 'later' ? (
                    <p className="small muted" style={{ margin: 0 }}>This opens after the Week {w.week} class on {fmtDate(classDate(c, w.week))}.</p>
                  ) : (
                    <details className="fold">
                      <summary>Turn it in</summary>
                      <HomeworkForm week={w.week} userId={profile.id} />
                    </details>
                  )}
                </article>
              );
            })}
          </section>
        ),
      )}
    </>
  );
}
