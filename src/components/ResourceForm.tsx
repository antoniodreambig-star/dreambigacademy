'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addResource } from '@/app/(app)/resources/actions';

const MAX = 50 * 1024 * 1024;

export default function ResourceForm({ weeks }: { weeks: { week: number; title: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file');
    fd.delete('file');
    setErr('');
    setBusy(true);
    const link = String(fd.get('url') ?? '').trim();
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX) {
        setBusy(false);
        return setErr('Files must be under 50 MB. For bigger files, paste a Drive or Dropbox link.');
      }
      const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
      const path = `${fd.get('week') || 'general'}/${Date.now()}-${safe}`;
      const { error } = await createClient().storage.from('resources').upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (error) {
        setBusy(false);
        return setErr('The upload didn’t go through. Try again.');
      }
      fd.set('file_path', path);
    } else if (!link) {
      setBusy(false);
      return setErr('Add a link or choose a file.');
    }
    await addResource(fd);
  }

  return (
    <form onSubmit={onSubmit} className="card stack">
      <h2>Add a resource</h2>
      {err && <div className="notice notice--err" role="alert">{err}</div>}
      <div className="row">
        <div><label htmlFor="r-title">Title</label><input id="r-title" name="title" type="text" required maxLength={160} /></div>
        <div>
          <label htmlFor="r-week">Belongs to</label>
          <select id="r-week" name="week" defaultValue="">
            <option value="">Whole course</option>
            {weeks.map((w) => <option key={w.week} value={w.week}>Week {w.week}: {w.title}</option>)}
          </select>
        </div>
      </div>
      <div><label htmlFor="r-desc">Description (optional)</label><textarea id="r-desc" name="description" maxLength={600} /></div>
      <div className="row">
        <div><label htmlFor="r-url">Link (video, Drive, article…)</label><input id="r-url" name="url" type="text" placeholder="https://" /></div>
        <div><label htmlFor="r-file">Or upload a file (up to 50 MB)</label><input id="r-file" name="file" type="file" /></div>
      </div>
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add resource'}</button>
    </form>
  );
}
