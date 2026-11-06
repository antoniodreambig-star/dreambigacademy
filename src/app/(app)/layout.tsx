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

  // Online-only students get their own menu (live sessions, set up, office hours).
  let isOnline = false;
  if (!isInstructor && profile.cohort_id) {
    const { data: co } = await supabase.from('cohorts').select('format').eq('id', profile.cohort_id).maybeSingle();
    isOnline = co?.format === 'online';
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
        { href: '/admin/online', label: 'Online classes', group: 'Course' },
        { href: '/admin/office-hours', label: 'Office hours', group: 'Course' },
        { href: '/resources', label: 'Resources', group: 'Content' },
        { href: '/videos', label: 'Videos', group: 'Content' },
        { href: '/admin/announcements', label: 'Announcements', group: 'Content' },
        { href: '/admin/messages', label: 'Messages', badge: count ?? 0 },
        { href: '/admin/payments', label: 'Payments' },
        { href: '/profile', label: 'Profile' },
      ]
    : isOnline
      ? [
          { href: '/home', label: 'Home' },
          { href: '/live', label: 'Live sessions', group: 'Learn' },
          { href: '/classes', label: 'Course', group: 'Learn' },
          { href: '/schedule', label: 'Schedule', group: 'Learn' },
          { href: '/resources', label: 'Resources', group: 'Learn' },
          { href: '/videos', label: 'Videos', group: 'Learn' },
          { href: '/office-hours', label: 'Office hours' },
          { href: '/messages', label: 'Messages', badge: count ?? 0 },
          { href: '/setup', label: 'Set up' },
          { href: '/tuition', label: 'Tuition' },
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
