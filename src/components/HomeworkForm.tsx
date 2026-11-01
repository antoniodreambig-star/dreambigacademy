'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { submitHomework } from '@/app/(app)/schedule/actions';

const MAX = 50 * 1024 * 1024;

/** Files go straight from the browser to storage, so big mixes work (the server only gets the file's path). */
export default function HomeworkForm({ week, userId }: { week: number; userId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file');
    fd.delete('file');
    setErr('');
    setBusy(true);
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX) {
        setBusy(false);
        return setErr('That file is over 50 MB. Share a Drive or Dropbox link instead, or export an MP3.');
      }
      const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
      const path = `${userId}/week-${week}/${Date.now()}-${safe}`;
      const { error } = await createClient().storage.from('homework').upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (error) {
        setBusy(false);
        return setErr('The upload didn’t go through. Check your connection and try again.');
      }
      fd.set('file_path', path);
    }
    await submitHomework(fd);
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <input type="hidden" name="week" value={week} />
      {err && <div className="notice notice--err" role="alert">{err}</div>}
      <div><label htmlFor={`n${week}`}>Note (optional)</label><textarea id={`n${week}`} name="note" /></div>
      <div className="row">
        <div><label htmlFor={`l${week}`}>Link (Drive, Dropbox…)</label><input id={`l${week}`} name="link" type="text" placeholder="https://" /></div>
        <div><label htmlFor={`f${week}`}>Or upload a file (up to 50 MB)</label><input id={`f${week}`} name="file" type="file" /></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Upload a mix as an MP3 or M4A and your instructor can listen in the app and leave comments at exact moments in the song.
      </p>
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Mark as turned in'}</button>
    </form>
  );
}
