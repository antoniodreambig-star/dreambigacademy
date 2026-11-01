import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { dueDate, fmtDate, hasHomework, hwState, todayLocal } from '@/lib/schedule';
import type { Cohort, Profile, Submission, Week } from '@/lib/types';
import { assignStudent, saveFeedback } from '../../actions';

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { supabase } = await requireInstructor();
  const { data: p } = await supabase.from('profiles').select('*').eq('id', id).eq('role', 'student').single();
  if (!p) notFound();
  const profile = p as Profile;
  const [{ data: cohorts }, { data: weeks }, { data: subs }] = await Promise.all([
    supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
    supabase.from('weeks').select('*').order('week'),
    supabase.from('submissions').select('*').eq('student_id', id),
  ]);
  const C = (cohorts ?? []) as Cohort[];
  const cohort = C.find((c) => c.id === profile.cohort_id) ?? null;
  const S = new Map(((subs ?? []) as Submission[]).map((s) => [s.week, s]));
  const today = todayLocal();
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
          <p className="muted" style={{ margin: 0 }}>{profile.email}{profile.phone ? ` · ${profile.phone}` : ''}</p>
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
              <label htmlFor="cohort_id">Cohort</label>
              <select id="cohort_id" name="cohort_id" defaultValue={profile.cohort_id ?? ''}>
                <option value="">None</option>
                {C.map((c) => <option key={c.id} value={c.id}>{c.name} (starts {fmtDate(c.start_date, { year: 'numeric' })})</option>)}
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

      <h2 className="phase">Homework</h2>
      {!cohort && <div className="card"><p className="muted">Place this student in a cohort to see their due dates.</p></div>}
      {cohort && ((weeks ?? []) as Week[]).filter(hasHomework).map((w) => {
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
