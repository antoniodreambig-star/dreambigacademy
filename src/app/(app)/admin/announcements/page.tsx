import { requireInstructor } from '@/lib/auth';
import type { Announcement, Cohort } from '@/lib/types';
import { deleteAnnouncement, postAnnouncement } from '../actions';

export const metadata = { title: 'Announcements' };

export default async function Announcements({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const [{ data: anns }, { data: cohorts }] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
  ]);
  const C = (cohorts ?? []) as Cohort[];

  return (
    <div className="narrow">
      <h1 className="page-title">Announcements</h1>
      <p className="sub">Show up on students’ Home page. You can email them too.</p>
      {q.ok && <div className="notice notice--ok">Posted.</div>}
      {q.err && <div className="notice notice--err">Add a title and a message.</div>}
      <form action={postAnnouncement} className="card stack">
        <div><label htmlFor="at">Title</label><input id="at" name="title" type="text" required /></div>
        <div><label htmlFor="ab">Message</label><textarea id="ab" name="body" required /></div>
        <div>
          <label htmlFor="ac">Who sees it</label>
          <select id="ac" name="cohort_id" defaultValue="">
            <option value="">Everyone</option>
            {C.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
          <input type="checkbox" name="notify" value="1" style={{ width: 20, height: 20 }} /> Also email them
        </label>
        <button className="btn" type="submit">Post</button>
      </form>
      <div className="stack" style={{ marginTop: 20 }}>
        {((anns ?? []) as Announcement[]).map((a) => (
          <div className="card" key={a.id}>
            <strong>{a.title}</strong> <span className="small muted">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {C.find((c) => c.id === a.cohort_id)?.name ?? 'Everyone'}</span>
            <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 10px' }}>{a.body}</p>
            <form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn btn--danger btn--sm" type="submit">Delete</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
