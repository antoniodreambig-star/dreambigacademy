'use client';

import { useMemo, useState } from 'react';
import { parseVideo } from '@/lib/video';

export interface LibVideo {
  id: string;
  title: string;
  url: string;
  description: string | null;
  filterIds: string[];
}
export interface LibFilter {
  id: string;
  name: string;
}

export default function VideoLibrary({ videos, filters }: { videos: LibVideo[]; filters: LibFilter[] }) {
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    videos.forEach((v) => v.filterIds.forEach((id) => c.set(id, (c.get(id) ?? 0) + 1)));
    return c;
  }, [videos]);
  const usable = filters.filter((f) => (counts.get(f.id) ?? 0) > 0);
  const nameOf = (id: string) => filters.find((f) => f.id === id)?.name;

  const needle = q.trim().toLowerCase();
  const shown = videos.filter(
    (v) => (active === 'all' || v.filterIds.includes(active)) && (!needle || `${v.title} ${v.description ?? ''}`.toLowerCase().includes(needle)),
  );

  return (
    <div>
      <div className="vtools">
        <div className="vsearch" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <label htmlFor="vq" style={{ position: 'absolute', left: -9999 }}>Search videos</label>
          <input id="vq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos…" />
        </div>
      </div>
      {usable.length > 0 && (
        <div className="vfilters" role="group" aria-label="Filter videos">
          <button type="button" className="vchip" aria-pressed={active === 'all'} onClick={() => setActive('all')}>
            All<small>{videos.length}</small>
          </button>
          {usable.map((f) => (
            <button key={f.id} type="button" className="vchip" aria-pressed={active === f.id} onClick={() => setActive(f.id)}>
              {f.name}
              <small>{counts.get(f.id)}</small>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>{videos.length === 0 ? 'No videos yet. Check back soon.' : 'No videos match. Try another filter or search.'}</p>
        </div>
      ) : (
        <div className="vgrid">
          {shown.map((v) => {
            const info = parseVideo(v.url);
            return (
              <article className="vcard" key={v.id}>
                {playing === v.id && info.embed ? (
                  <iframe
                    className="vframe"
                    src={info.embed}
                    title={v.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : info.embed ? (
                  <button type="button" className="vthumb" onClick={() => setPlaying(v.id)} aria-label={`Play ${v.title}`}>
                    {info.thumb && /* eslint-disable-next-line @next/next/no-img-element */ <img src={info.thumb} alt="" loading="lazy" />}
                    <span className="vplay"><i /></span>
                  </button>
                ) : (
                  <a className="vthumb" href={v.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${v.title} (opens in a new tab)`}>
                    <span className="vplay"><i /></span>
                  </a>
                )}
                <div className="vbody">
                  <h3>{v.title}</h3>
                  {v.description && <p className="small muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{v.description}</p>}
                  {!info.embed && (
                    <p className="small" style={{ margin: '8px 0 0' }}>
                      <a href={v.url} target="_blank" rel="noopener noreferrer">Watch on the original site ↗</a>
                    </p>
                  )}
                  {v.filterIds.length > 0 && (
                    <div className="vtags">
                      {v.filterIds.map((id) => nameOf(id) && <span className="chip" key={id}>{nameOf(id)}</span>)}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
