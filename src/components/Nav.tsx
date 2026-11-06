'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Item {
  href: string;
  label: string;
  badge?: number;
}

export default function Nav({ items }: { items: Item[] }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
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
  );
}
