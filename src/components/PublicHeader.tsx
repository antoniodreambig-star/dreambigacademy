'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Top bar for pages anyone can see (not signed in). The signed-in bar lives in the (app) layout. */
export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Close the menu after navigating, and when Escape is pressed.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="top">
      <div className="wrap top__in top__in--pub">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          Dream Big <span>Academy</span>
        </Link>
        <nav className="pubnav" aria-label="Main">
          <div id="pubnav-links" className="pubnav__links" data-open={open}>
            <a href="https://dreambigctx.com/academy/">About the Academy</a>
            <a href="https://dreambigctx.com">Dream Big Studios</a>
            <Link href="/login">Log in</Link>
          </div>
          <Link className="pubnav__apply" href="/apply">
            Apply
          </Link>
          <button
            type="button"
            className="pubnav__toggle"
            aria-expanded={open}
            aria-controls="pubnav-links"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>
      </div>
    </header>
  );
}
