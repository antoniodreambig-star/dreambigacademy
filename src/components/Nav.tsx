'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Item {
  href: string;
  label: string;
  badge?: number;
  /** 'more' items sit under a "More" menu on desktop. On phones every item is in one list. */
  group?: 'more';
}

export default function Nav({ items }: { items: Item[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const unread = items.reduce((n, i) => n + (i.badge ?? 0), 0);

  const primary = items.filter((i) => i.group !== 'more');
  const more = items.filter((i) => i.group === 'more');
  const isActive = (href: string) => (href === '/home' || href === '/admin' ? path === href : path.startsWith(href));
  const moreActive = more.some((i) => isActive(i.href));

  // Close menus after navigating, on Escape, and when clicking elsewhere.
  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open && !moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setMoreOpen(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (moreOpen && moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, moreOpen]);

  const link = (i: Item) => (
    <Link key={i.href} href={i.href} aria-current={isActive(i.href) ? 'page' : undefined} className={i.href === '/profile' ? 'nav__profile' : undefined}>
      {i.label}
      {!!i.badge && (
        <span className="dot" aria-label={`${i.badge} unread`}>
          {i.badge}
        </span>
      )}
    </Link>
  );

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
        {primary.map(link)}
        {more.length > 0 && (
          <div className="nav__more" ref={moreRef} data-open={moreOpen}>
            <button type="button" className="nav__morebtn" aria-expanded={moreOpen} aria-haspopup="true" data-active={moreActive} onClick={() => setMoreOpen((o) => !o)}>
              More <i className="nav__chev" aria-hidden="true" />
            </button>
            <div className="nav__moremenu">{more.map(link)}</div>
          </div>
        )}
        <form action="/auth/signout" method="post">
          <button className="signout" type="submit">
            Sign out
          </button>
        </form>
      </nav>
    </>
  );
}
