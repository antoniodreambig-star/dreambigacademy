'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Item {
  href: string;
  label: string;
  badge?: number;
  /** Items with the same group name share a dropdown on desktop and a heading on phones. */
  group?: string;
}

type Entry = { kind: 'link'; item: Item } | { kind: 'group'; label: string; items: Item[] };

export default function Nav({ items }: { items: Item[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false); // phone menu
  const [openGroup, setOpenGroup] = useState<string | null>(null); // desktop dropdown
  const navRef = useRef<HTMLElement>(null);
  const unread = items.reduce((n, i) => n + (i.badge ?? 0), 0);

  // Keep the order given; a group appears where its first item is.
  const entries: Entry[] = [];
  for (const item of items) {
    if (!item.group) {
      entries.push({ kind: 'link', item });
      continue;
    }
    const g = entries.find((e): e is Extract<Entry, { kind: 'group' }> => e.kind === 'group' && e.label === item.group);
    if (g) g.items.push(item);
    else entries.push({ kind: 'group', label: item.group, items: [item] });
  }

  const isActive = (href: string) =>
    href === '/home' ? path === href : href === '/admin' ? path === '/admin' || path.startsWith('/admin/students') : path.startsWith(href);

  // Close menus after navigating, on Escape, and when clicking elsewhere.
  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
  }, [path]);
  // While the phone menu is open, stop the page behind it from scrolling.
  useEffect(() => {
    document.body.classList.toggle('menu-open', open);
    return () => document.body.classList.remove('menu-open');
  }, [open]);
  useEffect(() => {
    if (!open && !openGroup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setOpenGroup(null);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (openGroup && navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, openGroup]);

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
      <nav id="app-nav" className="nav" aria-label="Main" data-open={open} ref={navRef}>
        {entries.map((e) => {
          if (e.kind === 'link') return link(e.item);
          const isOpen = openGroup === e.label;
          const badge = e.items.reduce((n, i) => n + (i.badge ?? 0), 0);
          return (
            <div key={e.label} className="nav__more nav__group" data-open={isOpen}>
              <button
                type="button"
                className="nav__morebtn"
                aria-expanded={isOpen}
                aria-haspopup="true"
                data-active={e.items.some((i) => isActive(i.href))}
                onClick={() => setOpenGroup(isOpen ? null : e.label)}
              >
                {e.label}
                {badge > 0 && (
                  <span className="dot" aria-label={`${badge} need attention`}>
                    {badge}
                  </span>
                )}
                <i className="nav__chev" aria-hidden="true" />
              </button>
              <span className="nav__grouplabel" aria-hidden="true">{e.label}</span>
              <div className="nav__moremenu">{e.items.map(link)}</div>
            </div>
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
