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

  // New applications waiting for a decision (instructor only).
  let newApps = 0;
  if (isInstructor) {
    const { count: n } = await supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'new');
    newApps = n ?? 0;
  }

  // Only the owner account sees the Instructors page (false if the database update hasn't been run yet).
  let isOwner = false;
  if (isInstructor) {
    const { data } = await supabase.rpc('is_owner');
    isOwner = data === true;
  }

  // Items with a `group` sit under a dropdown of that name on desktop and under a heading on phones.
  const items = isInstructor
    ? [
        { href: '/admin', label: 'Students', group: 'People' },
        { href: '/admin/applications', label: 'Applications', badge: newApps, group: 'People' },
        ...(isOwner ? [{ href: '/admin/instructors', label: 'Instructors', group: 'People' }] : []),
        { href: '/admin/cohorts', label: 'Classes', group: 'Course' },
        { href: '/admin/curriculum', label: 'Curriculum', group: 'Course' },
        { href: '/admin/attendance', label: 'Attendance', group: 'Course' },
        { href: '/resources', label: 'Resources', group: 'Content' },
        { href: '/videos', label: 'Videos', group: 'Content' },
        { href: '/admin/announcements', label: 'Announcements', group: 'Content' },
        { href: '/admin/messages', label: 'Messages', badge: count ?? 0 },
        { href: '/admin/payments', label: 'Payments' },
        { href: '/profile', label: 'Profile' },
      ]
    : [
        { href: '/home', label: 'Home' },
        { href: '/classes', label: 'Classes', group: 'Learn' },
        { href: '/schedule', label: 'Schedule', group: 'Learn' },
        { href: '/resources', label: 'Resources', group: 'Learn' },
        { href: '/videos', label: 'Videos', group: 'Learn' },
        { href: '/messages', label: 'Messages', badge: count ?? 0 },
        { href: '/tuition', label: 'Tuition' },
        { href: '/profile', label: 'Profile' },
      ];

  return (
    <>
      <header className="top">
        <div className="wrap top__in top__in--app">
          <Link className="brand" href={isInstructor ? '/admin' : '/home'}>
            Dream Big <span>Academy</span>
          </Link>
          <Link href="/profile" aria-label="Your profile" title="Your profile" className="top__avatar">
            <Avatar name={profile.full_name} url={profile.avatar_url} small />
          </Link>
          <Nav items={items} />
        </div>
      </header>
      <main>
        <div className="wrap">
          {!isInstructor && profile.under_18 && !profile.consent_signed && (
            <div className="notice notice--err" role="status">
              Your parent or guardian still needs to sign the consent form before you can take part. Ask your instructor to resend the link.
            </div>
          )}
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
