import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import type { Message, Profile } from '@/lib/types';

export const metadata = { title: 'Messages' };

export default async function Inbox() {
  const { supabase } = await requireInstructor();
  const [{ data: students }, { data: msgs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  const M = (msgs ?? []) as Message[];
  const rows = ((students ?? []) as Profile[])
    .map((p) => {
      const mine = M.filter((m) => m.thread_student_id === p.id);
      return { p, last: mine[0], unread: mine.filter((m) => !m.read_at && m.sender_id === p.id).length };
    })
    .sort((a, b) => (b.last?.created_at ?? '').localeCompare(a.last?.created_at ?? ''));

  return (
    <>
      <h1 className="page-title">Messages</h1>
      <p className="sub">One conversation per student.</p>
      <div className="card">
        {rows.length === 0 && <p className="muted">No students yet.</p>}
        {rows.map(({ p, last, unread }) => (
          <Link key={p.id} href={`/admin/messages/${p.id}`} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none', color: 'inherit' }}>
            <Avatar name={p.full_name} url={p.avatar_url} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong>{p.full_name || p.email}</strong>{unread > 0 && <span className="dot">{unread}</span>}
              <br /><span className="small muted">{last ? last.body.slice(0, 90) : 'No messages yet'}</span>
            </span>
            {last && <span className="small muted">{new Date(last.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
