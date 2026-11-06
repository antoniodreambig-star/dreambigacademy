import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { loadCurriculum, SETUP_ITEMS, setupProgress } from '@/lib/online';
import { dueDate, fmtDate, hasHomework, hwState, todayLocal } from '@/lib/schedule';
import AudioFeedback, { type FbComment } from '@/components/AudioFeedback';
import type { Attendance, Cohort, OnlineProfile, Profile, Submission, SubmissionComment } from '@/lib/types';

const isAudio = (p: string | null) => !!p && /\.(mp3|wav|m4a|aac|ogg|oga|flac|aif|aiff)$/i.test(p);
import { assignStudent, saveFeedback, saveNote } from '../../actions';
import { RULES_VERSION } from '@/lib/rules';
import { ConsentPanel, TuitionPanel } from './panels';

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; mail?: string; err?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { supabase, profile: me } = await requireInstructor();
  const { data: p } = await supabase.from('profiles').select('*').eq('id', id).eq('role', 'student').single();
  if (!p) notFound();
  const profile = p as Profile;
  const [{ data: cohorts }, { data: subs }, { data: attRows }, { data: noteRow }, { data: opRow }] = await Promise.all([
    supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
    supabase.from('submissions').select('*').eq('student_id', id),
    supabase.from('attendance').select('*').eq('student_id', id).order('week'),
    supabase.from('instructor_notes').select('body').eq('student_id', id).maybeSingle(),
    supabase.from('online_profiles').select('*').eq('student_id', id).maybeSingle(),
  ]);
  const C = (cohorts ?? []) as Cohort[];
  const cohort = C.find((c) => c.id === profile.cohort_id) ?? null;
  const online = cohort?.format === 'online';
  const { weeks: W } = await loadCurriculum(supabase, cohort?.format);
  const op = (opRow as OnlineProfile | null) ?? null;
  const prog = setupProgress(op);
  const S = new Map(((subs ?? []) as Submission[]).map((s) => [s.week, s]));
  const today = todayLocal();
  const att = (attRows ?? []) as Attendance[];
  const count = (st: string) => att.filter((a) => a.status === st).length;
  const ids = [...S.values()].map((s) => s.id);
  const { data: cmts } = ids.length ? await supabase.from('submission_comments').select('*').in('submission_id', ids).order('created_at') : { data: [] };
  const comments = new Map<string, FbComment[]>();
  for (const c of (cmts ?? []) as SubmissionComment[]) {
    const list = comments.get(c.submission_id) ?? [];
    list.push({ id: c.id, at_seconds: c.at_seconds, body: c.body, author_name: c.author_name || 'Someone', author_role: c.author_role, mine: c.author_id === me.id });
    comments.set(c.submission_id, list);
  }
  const urls = new Map<string, string>();
  for (const s of S.values()) {
    if (s.file_path) {
      const { data } = await supabase.storage.from('homework').createSignedUrl(s.file_path, 3600);
      if (data?.signedUrl) urls.set(s.file_path, data.signedUrl);
    }
  }

  return (
    <>
      <p><Link href="/admin">← All students</Link></p>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <Avatar name={profile.full_name} url={profile.avatar_url} large />
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>{profile.full_name || profile.email}</h1>
          <p className="muted" style={{ margin: 0 }}>{profile.email}{profile.phone ? ` · ${profile.phone}` : ''}{online && <> · <span className="chip chip--soon">Online</span></>}</p>
          <p style={{ margin: '8px 0 0' }}><Link className="btn btn--sm" href={`/admin/messages/${profile.id}`}>Message {(profile.full_name || '').split(' ')[0] || 'student'}</Link></p>
        </div>
      </div>
      {q.ok && <div className="notice notice--ok">Saved.</div>}

      <div className="grid grid--2">
        <section className="card stack">
          <h2>About</h2>
          <p style={{ margin: 0 }}><strong>Experience:</strong> {profile.experience || '—'}</p>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><strong>Bio:</strong> {profile.bio || '—'}</p>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><strong>Goals:</strong> {profile.goals || '—'}</p>
          <p style={{ margin: 0 }}><strong>Parent / guardian:</strong> {profile.parent_name || '—'}{profile.parent_phone ? ` · ${profile.parent_phone}` : ''}{profile.parent_email ? ` · ${profile.parent_email}` : ''}</p>
        </section>
        <section className="card">
          <h2>Placement</h2>
          <form action={assignStudent} className="stack" style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={profile.id} />
            <div>
              <label htmlFor="cohort_id">Class</label>
              <select id="cohort_id" name="cohort_id" defaultValue={profile.cohort_id ?? ''}>
                <option value="">None</option>
                {C.map((c) => <option key={c.id} value={c.id}>{c.name}{c.format === 'online' ? ' (online)' : ''} (starts {fmtDate(c.start_date, { year: 'numeric' })})</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
              <input type="checkbox" name="consent_signed" value="1" defaultChecked={profile.consent_signed} style={{ width: 20, height: 20 }} />
              Parent consent signed (16–17 year olds)
            </label>
            <button className="btn btn--sm" type="submit">Save</button>
          </form>
        </section>
      </div>

      {online && (
        <>
          <h2 className="phase" id="online">Online setup</h2>
          <div className="card stack">
            <p style={{ margin: 0 }}>
              {prog.complete ? <span className="chip chip--done">Ready</span> : <span className="chip chip--soon">{prog.done} of {prog.total} done</span>}{' '}
              <strong>Time zone:</strong> {op?.time_zone ? op.time_zone.replace(/_/g, ' ') : 'not set yet'}{op?.location ? ` · ${op.location}` : ''}
            </p>
            {op ? (
              <p className="small" style={{ margin: 0 }}>
                <strong>Pro Tools:</strong> {op.daw || '—'} · <strong>Computer:</strong> {op.os || '—'} · <strong>Interface:</strong> {op.interface || '—'} · <strong>Mic:</strong> {op.mic || '—'} · <strong>Headphones:</strong> {op.headphones || '—'} · <strong>Speakers:</strong> {op.monitors || '—'} · <strong>Internet:</strong> {op.internet || '—'}
              </p>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>They haven’t opened the setup page yet.</p>
            )}
            {!prog.complete && (
              <p className="small muted" style={{ margin: 0 }}>Still to do: {SETUP_ITEMS.filter((i) => op?.setup?.[i.key] !== true).map((i) => i.title).join(', ')}.</p>
            )}
          </div>
        </>
      )}

      <h2 className="phase" id="notes">Private notes</h2>
      <form action={saveNote} className="card stack">
        <input type="hidden" name="student_id" value={profile.id} />
        <p className="small muted" style={{ margin: 0 }}>Only you can see this. Students never do.</p>
        <textarea name="body" defaultValue={(noteRow?.body as string) ?? ''} maxLength={5000} aria-label="Private notes" style={{ minHeight: 120 }} />
        <button className="btn btn--sm" type="submit">Save notes</button>
      </form>

      <h2 className="phase">Studio rules</h2>
      <div className="card">
        {profile.rules_version === RULES_VERSION ? (
          <p style={{ margin: 0 }}>
            Signed by <strong>{profile.rules_signed_name}</strong> on {profile.rules_accepted_at ? new Date(profile.rules_accepted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}.
            {profile.under_18 && <> Under 18: guardian {profile.guardian_ack ? 'agreed' : 'has NOT agreed'}.</>}
          </p>
        ) : (
          <p style={{ margin: 0 }} className="muted">Not signed yet. They’ll be asked the next time they open the app.</p>
        )}
      </div>

      {q.err && <div className="notice notice--err">That didn’t save. Check the details and try again.</div>}
      <TuitionPanel supabase={supabase} student={profile} cohort={cohort} today={today} />
      <ConsentPanel supabase={supabase} student={profile} mailOff={q.mail === 'off'} />

      <h2 className="phase">Attendance</h2>
      <div className="card">
        <p style={{ margin: 0 }}>
          <strong>{count('present')}</strong> present · <strong>{count('late')}</strong> late · <strong>{count('absent')}</strong> absent · <strong>{count('excused')}</strong> excused{online && <> · <strong>{count('watched')}</strong> watched recording</>}
          {att.length > 0 && <span className="muted small"> (weeks marked: {att.map((a) => `${a.week}${a.status[0].toUpperCase()}`).join(', ')})</span>}
        </p>
        <p className="small muted" style={{ margin: '6px 0 0' }}>Take attendance for the whole class on the Attendance page.</p>
      </div>

      <h2 className="phase">Homework</h2>
      {!cohort && <div className="card"><p className="muted">Place this student in a class to see their due dates.</p></div>}
      {cohort && W.filter(hasHomework).map((w) => {
        const s = S.get(w.week);
        const state = hwState(cohort, w, s, today);
        return (
          <article key={w.week} id={`w${w.week}`} className={`week hw hw--${state}`}>
            <div className="hw__top">
              <span className="week__n">Week {w.week}</span>
              <span className={`chip chip--${state}`}>{state === 'done' ? 'Turned in' : state === 'overdue' ? 'Overdue' : state === 'soon' ? 'Due soon' : state === 'upcoming' ? 'Upcoming' : 'Not assigned yet'}</span>
              <span className="small muted">Due {fmtDate(dueDate(cohort, w), { year: 'numeric' })}</span>
            </div>
            <p className="small" style={{ marginBottom: 8 }}>{w.homework}</p>
            {s && (
              <>
                <p className="small" style={{ marginBottom: 6 }}>
                  Turned in {new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{s.note ? ` · “${s.note}”` : ''}{' '}
                  {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer">Link</a>}{' '}
                  {s.file_path && urls.get(s.file_path) && <a href={urls.get(s.file_path)} target="_blank" rel="noopener noreferrer">File</a>}
                </p>
                {isAudio(s.file_path) && urls.get(s.file_path!) && (
                  <AudioFeedback submissionId={s.id} src={urls.get(s.file_path!)!} comments={comments.get(s.id) ?? []} returnTo={`/admin/students/${profile.id}#w${w.week}`} isInstructor />
                )}
                <form action={saveFeedback} className="stack">
                  <input type="hidden" name="student_id" value={profile.id} />
                  <input type="hidden" name="week" value={w.week} />
                  <label htmlFor={`fb${w.week}`}>Feedback</label>
                  <textarea id={`fb${w.week}`} name="feedback" defaultValue={s.feedback ?? ''} />
                  <button className="btn btn--sm" type="submit">Save feedback</button>
                </form>
              </>
            )}
          </article>
        );
      })}
    </>
  );
}
