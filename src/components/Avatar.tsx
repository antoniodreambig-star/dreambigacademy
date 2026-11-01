'use client';

import { useState } from 'react';

export default function Avatar({ name, url, large, small }: { name?: string | null; url?: string | null; large?: boolean; small?: boolean }) {
  const [broken, setBroken] = useState(false);
  const cls = `avatar${large ? ' avatar--lg' : ''}${small ? ' avatar--sm' : ''}`;
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={url} alt="" onError={() => setBroken(true)} />;
  }
  const initials = (name || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={cls} aria-hidden="true">
      {initials}
    </span>
  );
}
