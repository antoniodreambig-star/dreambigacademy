import { requireOwner } from '@/lib/auth';
import { addInstructor, removeInstructor } from './actions';

export const metadata = { title: 'Instructors' };

interface Row {
  email: string;
  is_owner: boolean;
  full_name: string | null;
  joined: boolean;
}

const ERR: Record<string, string> = {
  email: 'Enter a valid email address.',
  save: 'That didn’t save. Make sure the database update for instructors has been run, then try again.',
  remove: 'That instructor couldn’t be removed. The main account can’t be removed.',
};

export default async function Instructors({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase } = await requireOwner();
  const q = await searchParams;
  const { data } = await supabase.rpc('list_instructors');
  const rows = (data ?? []) as Row[];

  return (
    <div className="narrow">
      <h1 className="page-title">Instructors</h1>
      <p className="sub">Only the main account can see this page. Other instructors can’t add or remove instructors.</p>
      {q.ok && <div className="notice notice--ok">{q.ok === 'removed' ? 'Instructor removed.' : 'Instructor added.'}</div>}
      {q.err && <div className="notice notice--err">{ERR[q.err] ?? ERR.save}</div>}

      <form action={addInstructor} className="card stack">
        <div>
          <label htmlFor="ie">Instructor’s email</label>
          <input id="ie" name="email" type="email" required autoComplete="off" />
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            They sign in at the login page with this email and tap “Email me a link”. If they already have a student account, they become an instructor right away.
          </p>
        </div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
          <input type="checkbox" name="notify" value="1" defaultChecked style={{ width: 20, height: 20 }} /> Email them how to sign in
        </label>
        <button className="btn" type="submit">Add instructor</button>
      </form>

      <div className="stack" style={{ marginTop: 20 }}>
        {rows.map((r) => (
          <div className="card" key={r.email} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div>
              <strong>{r.full_name || r.email}</strong>{' '}
              <span className={`chip${r.joined ? '' : ' chip--soon'}`}>{r.is_owner ? 'Main account' : r.joined ? 'Instructor' : 'Hasn’t signed in yet'}</span>
              {r.full_name && <div className="small muted">{r.email}</div>}
            </div>
            {!r.is_owner && (
              <form action={removeInstructor}>
                <input type="hidden" name="email" value={r.email} />
                <button className="btn btn--danger btn--sm" type="submit">Remove</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
