'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/Avatar';

const MAX_SIDE = 800;

/** Resizes the chosen photo in the browser (phone photos are huge) and uploads it straight to storage. */
export default function AvatarField({ userId, name, url }: { userId: string; name: string | null; url: string | null }) {
  const [path, setPath] = useState('');
  const [preview, setPreview] = useState<string | null>(url);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    if (!file.type.startsWith('image/')) return setErr('Please choose an image file.');
    setBusy(true);
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
      if (!blob) throw new Error('resize');
      const p = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await createClient().storage.from('avatars').upload(p, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      setPath(p);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setErr('That photo didn’t upload. Try a JPG or PNG, or a different photo.');
    }
    setBusy(false);
  }

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <Avatar name={name} url={preview} large />
      <div>
        <label htmlFor="avatar">Profile photo</label>
        <input id="avatar" type="file" accept="image/*" onChange={onPick} />
        <input type="hidden" name="avatar_path" value={path} />
        {busy && <p className="small muted" style={{ margin: '6px 0 0' }}>Uploading…</p>}
        {path && !busy && <p className="small" style={{ margin: '6px 0 0', color: '#14663b' }}>Photo ready. Press “Save profile” to keep it.</p>}
        {err && <p className="small" role="alert" style={{ margin: '6px 0 0', color: '#8f1131' }}>{err}</p>}
      </div>
    </div>
  );
}
