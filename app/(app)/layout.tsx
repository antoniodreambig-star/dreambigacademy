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

  const items = isInstructor
    ? [
        { href: '/admin', label: 'Students' },
        { href: '/admin/applications', label: 'Applications', badge: newApps },
        { href: '/admin/messages', label: 'Messages', badge: count ?? 0 },
        { href: '/admin/attendance', label: 'Attendance' },
        { href: '/admin/payments', label: 'Payments' },
        { href: '/resources', label: 'Resources' },
        { href: '/admin/cohorts', label: 'Classes' },
        { href: '/admin/curriculum', label: 'Curriculum' },
        { href: '/admin/announcements', label: 'Announcements' },
        { href: '/profile', label: 'Profile' },
      ]
    : [
        { href: '/home', label: 'Home' },
        { href: '/classes', label: 'Classes' },
        { href: '/schedule', label: 'Schedule' },
        { href: '/resources', label: 'Resources' },
        { href: '/tuition', label: 'Tuition' },
        { href: '/messages', label: 'Messages', badge: count ?? 0 },
        { href: '/profile', label: 'Profile' },
      ];

  return (
    <>
      <header className="top">
        <div className="wrap top__in">
          <Link className="brand" href={isInstructor ? '/admin' : '/home'}>
            Dream Big <span>Academy</span>
          </Link>
          <Link href="/profile" aria-label="Your profile" title="Your profile" style={{ marginLeft: 'auto', display: 'inline-flex' }}>
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
