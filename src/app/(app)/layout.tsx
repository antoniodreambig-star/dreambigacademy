import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import Nav from '@/components/Nav';
import SiteFooter from '@/components/SiteFooter';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireProfile();
  const isInstructor = profile.role === 'instructor';

  // Unread messages: for a student, replies in their thread; for the instructor, anything a student sent.
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .neq('sender_id', profile.id);

  const items = isInstructor
    ? [
        { href: '/admin', label: 'Students' },
        { href: '/admin/messages', label: 'Messages', badge: count ?? 0 },
        { href: '/admin/attendance', label: 'Attendance' },
        { href: '/resources', label: 'Resources' },
        { href: '/admin/cohorts', label: 'Classes' },
        { href: '/admin/curriculum', label: 'Curriculum' },
        { href: '/admin/announcements', label: 'Announcements' },
        { href: '/profile', label: 'Profile' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/classes', label: 'Classes' },
        { href: '/schedule', label: 'Schedule' },
        { href: '/resources', label: 'Resources' },
        { href: '/messages', label: 'Messages', badge: count ?? 0 },
        { href: '/profile', label: 'Profile' },
      ];

  return (
    <>
      <header className="top">
        <div className="wrap top__in">
          <Link className="brand" href={isInstructor ? '/admin' : '/'}>
            Dream Big <span>Academy</span>
          </Link>
          <Link href="/profile" aria-label="Your profile" title="Your profile" style={{ marginLeft: 'auto', display: 'inline-flex' }}>
            <Avatar name={profile.full_name} url={profile.avatar_url} small />
          </Link>
          <Nav items={items} />
        </div>
      </header>
      <main>
        <div className="wrap">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
