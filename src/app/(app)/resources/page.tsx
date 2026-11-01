import { requireProfile } from '@/lib/auth';
import ResourceForm from '@/components/ResourceForm';
import type { Resource, Week } from '@/lib/types';
import { deleteResource } from './actions';

export const metadata = { title: 'Resources' };

export default async function Resources({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const q = await searchParams;
  const instructor = profile.role === 'instructor';
  const [{ data: res }, { data: weeks }] = await Promise.all([
    supabase.from('resources').select('*').order('created_at', { ascending: true }),
    supabase.from('weeks').select('week,title').order('week'),
  ]);
  const R = (res ?? []) as Resource[];
  const W = (weeks ?? []) as Pick<Week, 'week' | 'title'>[];

  const urls = new Map<string, string>();
  for (const r of R) {
    if (r.file_path) {
      const { data } = await supabase.storage.from('resources').createSignedUrl(r.file_path, 3600);
      if (data?.signedUrl) urls.set(r.id, data.signedUrl);
    }
  }

  const groups: { title: string; list: Resource[] }[] = [
    { title: 'Whole course', list: R.filter((r) => r.week === null) },
    ...W.map((w) => ({ title: `Week ${w.week}: ${w.title}`, list: R.filter((r) => r.week === w.week) })),
  ].filter((g) => g.list.length > 0);

  return (
    <>
      <h1 className="page-title">Resources</h1>
      <p className="sub">Session files, handouts, videos and reading for the course.</p>
      {q.ok && <div className="notice notice--ok">Added.</div>}
      {q.err && <div className="notice notice--err">That didn’t save. Add a title and a link or file.</div>}

      {groups.length === 0 && <div className="card"><p className="muted">{instructor ? 'Nothing here yet. Add the first resource below.' : 'Your instructor hasn’t added any resources yet.'}</p></div>}
      {groups.map((g) => (
        <section key={g.title} style={{ marginBottom: 22 }}>
          <h2 className="phase" style={{ marginTop: 0 }}>{g.title}</h2>
          {g.list.map((r) => {
            const href = r.url ?? urls.get(r.id);
            return (
              <article key={r.id} className="week" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <strong>
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}
                  </strong>{' '}
                  <span className="chip">{r.file_path ? 'File' : 'Link'}</span>
                  {r.description && <p className="small" style={{ margin: '6px 0 0' }}>{r.description}</p>}
                </div>
                {instructor && (
                  <form action={deleteResource}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn--ghost btn--sm" type="submit">Remove</button>
                  </form>
                )}
              </article>
            );
          })}
        </section>
      ))}

      {instructor && <ResourceForm weeks={W} />}
    </>
  );
}
