import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import { loadCurriculum, wordsFor } from '@/lib/online';
import type { Week } from '@/lib/types';
import { saveWeek } from '../actions';

export const metadata = { title: 'Curriculum' };

export default async function Curriculum({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; track?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const track = q.track === 'online' ? 'online' : 'in_person';
  const { weeks, projects: P } = await loadCurriculum(supabase, track);
  const words = wordsFor(track);

  return (
    <>
      <h1 className="page-title">Curriculum</h1>
      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link className={`btn btn--sm ${track === 'in_person' ? '' : 'btn--ghost'}`} href="/admin/curriculum">In person · 26 weeks</Link>
        <Link className={`btn btn--sm ${track === 'online' ? '' : 'btn--ghost'}`} href="/admin/curriculum?track=online">Online · 13 weeks</Link>
      </p>
      <p className="sub">
        {track === 'online' ? 'This is what online (3-month) students see.' : 'Edit any week of the in-person (6-month) course.'} Students see changes right away on their Classes and Schedule pages. Weeks with no homework text don’t show up as homework.
      </p>
      {track === 'online' && (
        <div className="notice">
          The online course is the same course as the in-person one, in half the time: each online week covers two in-person weeks (online week 1 = in-person weeks 1 and 2, and so on). To change it, edit the in-person weeks and the online weeks update automatically.
        </div>
      )}
      {q.ok && <div className="notice notice--ok">Week {q.ok} saved.</div>}
      {q.err && <div className="notice notice--err">That didn’t save.</div>}
      {(weeks as Week[]).map((w) => (
        <details className="week" key={w.week} id={`w${w.week}`} open={q.ok === String(w.week)}>
          <summary style={{ cursor: 'pointer' }}>
            <span className="week__n">Week {w.week}</span> <span className="week__title">{w.title}</span>{' '}
            <span className="small muted">{P.filter((p) => p.week === w.week).map((p) => ` · ${p.title}`)}</span>
          </summary>
          {track === 'online' ? (
            <div className="stack" style={{ marginTop: 14 }}>
              <div><label>{words.inClass}</label><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{w.in_class || '—'}</p></div>
              <div><label>{words.labLong}</label><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{w.lab || '—'}</p></div>
              <div><label>Homework</label><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{w.homework || '—'}</p></div>
              <p className="small muted">Covers in-person weeks {2 * w.week - 1} and {2 * w.week}. <Link href={`/admin/curriculum#w${2 * w.week - 1}`}>Edit in the in-person course</Link></p>
            </div>
          ) : (
          <form action={saveWeek} className="stack" style={{ marginTop: 14 }}>
            <input type="hidden" name="week" value={w.week} />
            <input type="hidden" name="track" value={track} />
            <div className="row">
              <div><label>Title</label><input name="title" type="text" defaultValue={w.title} required /></div>
              <div><label>Section heading</label><input name="phase" type="text" defaultValue={w.phase} required /></div>
            </div>
            <div><label>{words.inClass}</label><textarea name="in_class" defaultValue={w.in_class} /></div>
            <div><label>{words.labLong}</label><textarea name="lab" defaultValue={w.lab} /></div>
            <div><label>Homework</label><textarea name="homework" defaultValue={w.homework} /></div>
            <div style={{ maxWidth: 260 }}>
              <label>Homework due (days after that week’s class)</label>
              <input name="homework_due_days" type="number" min={0} max={30} defaultValue={w.homework_due_days} />
              <p className="small muted" style={{ margin: '4px 0 0' }}>7 = next class. 0 = due at that class.</p>
            </div>
            <button className="btn btn--sm" type="submit">Save week {w.week}</button>
          </form>
          )}
        </details>
      ))}
    </>
  );
}
