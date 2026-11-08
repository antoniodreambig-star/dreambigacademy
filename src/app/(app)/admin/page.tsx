import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { setupProgress } from '@/lib/online';
import { classDate, currentWeek, dueDate, fmtDate, hasHomework, hwState, localWeek, todayLocal, weekSpan, weeksFor } from '@/lib/schedule';
import type { Cohort, Message, OnlineProfile, Profile, Submission, Week } from '@/lib/types';

export const metadata = { title: 'Students' };

export default async function Admin() {
  const { supabase } = await requireInstructor();
  const [{ data: cohorts }, { data: students }, { data: weeks }, { data: onlineWeeks }, { data: subs }, { data: unread }, { data: ops }] = await Promise.all([
    supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
    supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
    supabase.from('weeks').select('*').order('week'),
    supabase.from('online_weeks').select('*').order('week'),
    supabase.from('submissions').select('*'),
    supabase.from('messages').select('thread_student_id, sender_id').is('read_at', null),
    supabase.from('online_profiles').select('*'),
  ]);
  const C = (cohorts ?? []) as Cohort[];
  const WIn = ((weeks ?? []) as Week[]).filter(hasHomework);
  const WOn = ((onlineWeeks ?? []) as Week[]).filter(hasHomework);
  const OP = new Map(((ops ?? []) as OnlineProfile[]).map((o) => [o.student_id, o]));
  const S = (subs ?? []) as Submission[];
  const today = todayLocal();
  const unreadBy = new Map<string, number>();
  ((unread ?? []) as Pick<Message, 'thread_student_id' | 'sender_id'>[]).forEach((m) => {
    if (m.sender_id === m.thread_student_id) unreadBy.set(m.thread_student_id, (unreadBy.get(m.thread_student_id) ?? 0) + 1);
  });
  const P = (students ?? []) as Profile[];
  const unplaced = P.filter((p) => !p.cohort_id || !C.find((c) => c.id === p.cohort_id));

  function Table({ cohort, list }: { cohort: Cohort | null; list: Profile[] }) {
    const online = cohort?.format === 'online';
    const W = cohort ? weeksFor(cohort, online ? WOn : WIn) : [];
    return (
      <div className="tablewrap">
        <table>
          <thead><tr><th>Student</th><th>Homework in</th><th>Overdue</th><th>Last turned in</th>{online && <th>Setup</th>}{online && <th>Time zone</th>}<th>Unread</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={online ? 7 : 5} className="muted">No students yet. Add them under Classes.</td></tr>}
            {list.map((p) => {
              const mine = S.filter((s) => s.student_id === p.id);
              const byWeek = new Map(mine.map((s) => [s.week, s]));
              const overdue = cohort ? W.filter((w) => hwState(cohort, w, byWeek.get(w.week), today) === 'overdue').length : 0;
              const due = cohort ? W.filter((w) => dueDate(cohort, w) < today || byWeek.has(w.week)).length : 0;
              const last = mine.map((s) => s.submitted_at).sort().pop();
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/students/${p.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none' }}>
                      <Avatar name={p.full_name} url={p.avatar_url} />
                      <span><strong>{p.full_name || p.email}</strong><br /><span className="small muted">{p.email}</span></span>
                    </Link>
                  </td>
                  <td>{mine.length} of {Math.max(due, mine.length)}</td>
                  <td>{overdue > 0 ? <span className="chip chip--overdue">{overdue} overdue</span> : <span className="muted">0</span>}</td>
                  <td>{last ? new Date(last).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                  {online && (() => {
                    const o = OP.get(p.id) ?? null;
                    const sp = setupProgress(o);
                    return (
                      <>
                        <td>{sp.complete ? <span className="chip chip--done">Ready</span> : <span className="chip chip--soon">{sp.done} of {sp.total}</span>}</td>
                        <td className="small">{o?.time_zone ? o.time_zone.replace(/_/g, ' ') : <span className="muted">Not set</span>}</td>
                      </>
                    );
                  })()}
                  <td>{unreadBy.get(p.id) ? <Link href={`/admin/messages/${p.id}`}><span className="dot" style={{ marginLeft: 0 }}>{unreadBy.get(p.id)}</span></Link> : <span className="muted">0</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Students</h1>
      <p className="sub">Who’s on track, who’s behind, and who’s waiting on a reply.</p>
      {C.length === 0 && (
        <div className="card"><p>No class yet. <Link href="/admin/cohorts">Create your first class</Link> to set the start date and add students.</p></div>
      )}
      {C.map((c) => {
        const list = P.filter((p) => p.cohort_id === c.id);
        const cw = currentWeek(c, today);
        return (
          <section className="card" key={c.id} style={{ marginBottom: 16 }}>
            <p className="eyebrow">{cw === 0 ? `Starts ${fmtDate(c.start_date, { year: 'numeric' })}` : cw > weekSpan(c).last ? 'Finished' : `Week ${localWeek(c, cw)} of ${weekSpan(c).count} · ${c.format === 'online' ? 'live session' : 'class'} ${fmtDate(classDate(c, cw))}`}</p>
            <h2 style={{ marginBottom: 12 }}>{c.name} {c.format === 'online' && <span className="chip chip--soon">Online</span>} <span className="muted small">{list.length} of {c.seats} seats</span></h2>
            <Table cohort={c} list={list} />
          </section>
        );
      })}
      {unplaced.length > 0 && (
        <section className="card">
          <p className="eyebrow">Not in a class</p>
          <Table cohort={null} list={unplaced} />
        </section>
      )}
    </>
  );
}
