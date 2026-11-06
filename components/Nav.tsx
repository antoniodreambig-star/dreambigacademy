'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Item {
  href: string;
  label: string;
  badge?: number;
}

export default function Nav({ items }: { items: Item[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const unread = items.reduce((n, i) => n + (i.badge ?? 0), 0);

  // Close the menu after navigating, and when Escape is pressed.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="pubnav__toggle"
        aria-expanded={open}
        aria-controls="app-nav"
        aria-label={open ? 'Close menu' : unread ? `Open menu (${unread} unread)` : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
        {unread > 0 && !open && <i className="pubnav__pip" aria-hidden="true" />}
      </button>
      <nav id="app-nav" className="nav" aria-label="Main" data-open={open}>
        {items.map((i) => {
          const active = i.href === '/home' || i.href === '/admin' ? path === i.href : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined}>
              {i.label}
              {!!i.badge && (
                <span className="dot" aria-label={`${i.badge} unread`}>
                  {i.badge}
                </span>
              )}
            </Link>
          );
        })}
        <form action="/auth/signout" method="post">
          <button className="signout" type="submit">
            Sign out
          </button>
        </form>
      </nav>
    </>
  );
}
