'use client';

import { useRef, useState } from 'react';
import { addComment, deleteComment } from '@/app/(app)/feedback/actions';

export interface FbComment {
  id: string;
  at_seconds: number | null;
  body: string;
  author_name: string;
  author_role: string;
  mine: boolean;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function AudioFeedback({
  submissionId,
  src,
  comments,
  returnTo,
  isInstructor,
}: {
  submissionId: string;
  src: string;
  comments: FbComment[];
  returnTo: string;
  isInstructor: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [at, setAt] = useState<number | null>(null);
  const sorted = [...comments].sort((a, b) => (a.at_seconds ?? 1e9) - (b.at_seconds ?? 1e9));

  function seek(t: number) {
    if (!audio.current) return;
    audio.current.currentTime = t;
    void audio.current.play();
  }

  return (
    <div className="audiofb">
      <audio ref={audio} controls preload="none" src={src} style={{ width: '100%' }} />
      {sorted.length > 0 && (
        <ul className="audiofb__list">
          {sorted.map((c) => (
            <li key={c.id}>
              {c.at_seconds !== null ? (
                <button type="button" className="audiofb__ts" onClick={() => seek(c.at_seconds!)} title="Jump to this moment">
                  {mmss(c.at_seconds)}
                </button>
              ) : (
                <span className="audiofb__ts audiofb__ts--none">note</span>
              )}
              <span>
                <strong>{c.author_name}{c.author_role === 'instructor' ? ' (instructor)' : ''}:</strong> {c.body}
              </span>
              {(c.mine || isInstructor) && (
                <form action={deleteComment}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button className="audiofb__x" type="submit" aria-label="Delete comment">×</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <form action={addComment} className="stack audiofb__form">
        <input type="hidden" name="submission_id" value={submissionId} />
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" name="at_seconds" value={at ?? ''} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAt(Math.floor(audio.current?.currentTime ?? 0))}>
            {at === null ? 'Pin comment to current time' : `Pinned at ${mmss(at)}, tap to re-pin`}
          </button>
          {at !== null && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAt(null)}>Remove pin</button>
          )}
        </div>
        <textarea name="body" required maxLength={2000} placeholder="Pause the song where you hear it, pin the time, then write your comment." />
        <button className="btn btn--sm" type="submit">Add comment</button>
      </form>
    </div>
  );
}
