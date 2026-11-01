import { requireInstructor } from '@/lib/auth';
import type { Project, Week } from '@/lib/types';
import { saveWeek } from '../actions';

export const metadata = { title: 'Curriculum' };

export default async function Curriculum({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const [{ data: weeks }, { data: projects }] = await Promise.all([
    supabase.from('weeks').select('*').order('week'),
    supabase.from('projects').select('*'),
  ]);
  const P = (projects ?? []) as Project[];

  return (
    <>
      <h1 className="page-title">Curriculum</h1>
      <p className="sub">Edit any week. Students see changes right away on their Classes and Schedule pages. Weeks with no homework text don’t show up as homework.</p>
      {q.ok && <div className="notice notice--ok">Week {q.ok} saved.</div>}
      {q.err && <div className="notice notice--err">That didn’t save.</div>}
      {((weeks ?? []) as Week[]).map((w) => (
        <details className="week" key={w.week} id={`w${w.week}`} open={q.ok === String(w.week)}>
          <summary style={{ cursor: 'pointer' }}>
            <span className="week__n">Week {w.week}</span> <span className="week__title">{w.title}</span>{' '}
            <span className="small muted">{P.filter((p) => p.week === w.week).map((p) => ` · ${p.title}`)}</span>
          </summary>
          <form action={saveWeek} className="stack" style={{ marginTop: 14 }}>
            <input type="hidden" name="week" value={w.week} />
            <div className="row">
              <div><label>Title</label><input name="title" type="text" defaultValue={w.title} required /></div>
              <div><label>Section heading</label><input name="phase" type="text" defaultValue={w.phase} required /></div>
            </div>
            <div><label>In class</label><textarea name="in_class" defaultValue={w.in_class} /></div>
            <div><label>Lab (Studio B)</label><textarea name="lab" defaultValue={w.lab} /></div>
            <div><label>Homework</label><textarea name="homework" defaultValue={w.homework} /></div>
            <div style={{ maxWidth: 260 }}>
              <label>Homework due (days after that week’s class)</label>
              <input name="homework_due_days" type="number" min={0} max={30} defaultValue={w.homework_due_days} />
              <p className="small muted" style={{ margin: '4px 0 0' }}>7 = next class. 0 = due at that class.</p>
            </div>
            <button className="btn btn--sm" type="submit">Save week {w.week}</button>
          </form>
        </details>
      ))}
    </>
  );
}
