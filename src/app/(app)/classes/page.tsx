import { requireProfile } from '@/lib/auth';
import { classDate, currentWeek, fmtDate, todayLocal } from '@/lib/schedule';
import type { Attendance, Cohort, Project, Week } from '@/lib/types';

const ATT = { present: ['Present', 'chip--done'], late: ['Late', 'chip--soon'], absent: ['Absent', 'chip--overdue'], excused: ['Excused', ''] } as const;

export const metadata = { title: 'Classes' };

export default async function Classes() {
  const { supabase, profile } = await requireProfile();
  const [{ data: weeks }, { data: projects }, { data: attRows }, cohortRes] = await Promise.all([
    supabase.from('weeks').select('*').order('week'),
    supabase.from('projects').select('*'),
    supabase.from('attendance').select('*').eq('student_id', profile.id),
    profile.cohort_id ? supabase.from('cohorts').select('*').eq('id', profile.cohort_id).single() : Promise.resolve({ data: null }),
  ]);
  const cohort = cohortRes.data as Cohort | null;
  const W = (weeks ?? []) as Week[];
  const P = (projects ?? []) as Project[];
  const A = new Map(((attRows ?? []) as Attendance[]).map((a) => [a.week, a.status]));
  const today = todayLocal();
  const now = cohort ? currentWeek(cohort, today) : 0;

  let lastPhase = '';
  return (
    <>
      <h1 className="page-title">Classes</h1>
      <p className="sub">26 weeks. Each week has class, lab time in Studio B, and homework.</p>
      {W.map((w) => {
        const header = w.phase !== lastPhase ? <h2 className="phase" key={`p-${w.phase}`}>{w.phase}</h2> : null;
        lastPhase = w.phase;
        const projs = P.filter((p) => p.week === w.week);
        return (
          <div key={w.week}>
            {header}
            <article className={`week${now === w.week ? ' is-now' : ''}`}>
              <div className="week__head">
                <span className="week__n">Week {w.week}</span>
                <span className="week__title">{w.title}</span>
                {now === w.week && <span className="chip chip--soon">This week</span>}
                {A.get(w.week) && <span className={`chip ${ATT[A.get(w.week)!][1]}`}>{ATT[A.get(w.week)!][0]}</span>}
                {cohort && <span className="week__date">{fmtDate(classDate(cohort, w.week))}</span>}
              </div>
              {w.in_class || w.lab || w.homework ? (
                <div className="week__cols">
                  <div><h5>In class</h5><p>{w.in_class || '—'}</p></div>
                  <div><h5>Lab</h5><p>{w.lab || '—'}</p></div>
                  <div><h5>Homework</h5><p>{w.homework || '—'}</p></div>
                </div>
              ) : (
                <p className="muted small" style={{ margin: '8px 0 0' }}>The outline for this week is coming soon.</p>
              )}
              {projs.map((p) => (
                <div className="project" key={p.key}>
                  <h4>{p.title} (due week {p.week})</h4>
                  <ul>{p.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                </div>
              ))}
            </article>
          </div>
        );
      })}
    </>
  );
}
