import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import Nav from '@/components/Nav';

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
        { href: '/admin/cohorts', label: 'Cohorts' },
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
          <Nav items={items} />
        </div>
      </header>
      <main>
        <div className="wrap">{children}</div>
      </main>
    </>
  );
}
