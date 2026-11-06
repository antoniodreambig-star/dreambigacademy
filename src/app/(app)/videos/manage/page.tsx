import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import { addFilter, addVideo, deleteFilter, deleteVideo, renameFilter, updateVideo } from '../actions';

export const metadata = { title: 'Manage videos' };

interface Vid { id: string; title: string; url: string; description: string | null }
interface Fil { id: string; name: string }

const OK: Record<string, string> = { added: 'Video added.', saved: 'Video updated.', deleted: 'Video removed.', filter: 'Filters updated.' };
const ERR: Record<string, string> = {
  video: 'Add a title and a valid video link (for example a YouTube or Vimeo link).',
  filter: 'Enter a filter name.',
  dupe: 'You already have a filter with that name.',
  db: 'That didn’t save. Make sure the database update for the video library (09_video_library.sql) has been run, then try again.',
};

export default async function ManageVideos({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const [{ data: vids, error }, { data: fils }, { data: links }] = await Promise.all([
    supabase.from('videos').select('id,title,url,description').order('created_at', { ascending: false }),
    supabase.from('video_filters').select('id,name').order('name'),
    supabase.from('video_filter_links').select('video_id,filter_id'),
  ]);
  const V = (vids ?? []) as Vid[];
  const F = (fils ?? []) as Fil[];
  const has = (v: string, f: string) => (links ?? []).some((l) => l.video_id === v && l.filter_id === f);

  const FilterChecks = ({ videoId }: { videoId?: string }) =>
    F.length === 0 ? (
      <p className="small muted" style={{ margin: 0 }}>No filters yet. Create some in the Filters section below, then tick them here.</p>
    ) : (
      <div style={{ display: 'flex', gap: '8px 18px', flexWrap: 'wrap' }}>
        {F.map((f) => (
          <label key={f.id} className="check" style={{ fontWeight: 700 }}>
            <input type="checkbox" name="filter" value={f.id} defaultChecked={videoId ? has(videoId, f.id) : false} /> {f.name}
          </label>
        ))}
      </div>
    );

  return (
    <div className="narrow">
      <p><Link href="/videos">← Video Library</Link></p>
      <h1 className="page-title">Manage videos</h1>
      <p className="sub">Add video links for students to watch. Students and instructors watch them on the Video Library page. Only instructors can add or change videos.</p>
      {q.ok && <div className="notice notice--ok">{OK[q.ok] ?? 'Saved.'}</div>}
      {q.err && <div className="notice notice--err">{ERR[q.err] ?? ERR.db}</div>}
      {error && <div className="notice notice--err">{ERR.db}</div>}

      <h2 className="phase" style={{ marginTop: 0 }}>Add a video</h2>
      <form action={addVideo} className="card stack">
        <div><label htmlFor="vt">Title</label><input id="vt" name="title" type="text" required maxLength={160} /></div>
        <div>
          <label htmlFor="vu">Video link</label>
          <input id="vu" name="url" type="text" required placeholder="https://www.youtube.com/watch?v=…" />
          <p className="small muted" style={{ margin: '4px 0 0' }}>YouTube and Vimeo videos play right on the page. Any other link opens in a new tab.</p>
        </div>
        <div><label htmlFor="vd">Description (optional)</label><textarea id="vd" name="description" maxLength={800} /></div>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: 6 }}>Filters</legend>
          <FilterChecks />
        </fieldset>
        <button className="btn" type="submit">Add video</button>
      </form>

      <h2 className="phase">Filters</h2>
      <div className="card stack">
        <p className="small muted" style={{ margin: 0 }}>Filters appear as buttons at the top of the Video Library, such as “Mixing,” “Vocals,” or “Pro Tools basics.” A video can have more than one.</p>
        <form action={addFilter} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="fn" style={{ position: 'absolute', left: -9999 }}>New filter name</label>
          <input id="fn" name="name" type="text" required maxLength={40} placeholder="New filter name" style={{ flex: '1 1 220px' }} />
          <button className="btn" type="submit">Create filter</button>
        </form>
        {F.map((f) => (
          <div key={f.id} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <form action={renameFilter} style={{ display: 'flex', gap: 8, flex: '1 1 240px' }}>
              <input type="hidden" name="id" value={f.id} />
              <label htmlFor={`fr-${f.id}`} style={{ position: 'absolute', left: -9999 }}>Filter name</label>
              <input id={`fr-${f.id}`} name="name" type="text" defaultValue={f.name} required maxLength={40} />
              <button className="btn btn--ghost btn--sm" type="submit">Rename</button>
            </form>
            <form action={deleteFilter}>
              <input type="hidden" name="id" value={f.id} />
              <button className="btn btn--danger btn--sm" type="submit">Delete</button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="phase">All videos ({V.length})</h2>
      <div className="stack">
        {V.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>No videos yet.</p></div>}
        {V.map((v) => (
          <details key={v.id} className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{v.title}</summary>
            <form action={updateVideo} className="stack" style={{ marginTop: 14 }}>
              <input type="hidden" name="id" value={v.id} />
              <div><label htmlFor={`t-${v.id}`}>Title</label><input id={`t-${v.id}`} name="title" type="text" defaultValue={v.title} required maxLength={160} /></div>
              <div><label htmlFor={`u-${v.id}`}>Video link</label><input id={`u-${v.id}`} name="url" type="text" defaultValue={v.url} required /></div>
              <div><label htmlFor={`d-${v.id}`}>Description</label><textarea id={`d-${v.id}`} name="description" defaultValue={v.description ?? ''} maxLength={800} /></div>
              <FilterChecks videoId={v.id} />
              <button className="btn btn--sm" type="submit" style={{ alignSelf: 'flex-start' }}>Save changes</button>
            </form>
            <form action={deleteVideo} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={v.id} />
              <button className="btn btn--danger btn--sm" type="submit">Delete video</button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
