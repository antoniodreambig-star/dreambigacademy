import { requireStudent } from '@/lib/auth';
import Thread from '@/components/Thread';
import type { Message } from '@/lib/types';

export const metadata = { title: 'Messages' };

export default async function Messages() {
  const { supabase, profile } = await requireStudent();
  const [{ data: msgs }, { data: instructors }] = await Promise.all([
    supabase.from('messages').select('*').eq('thread_student_id', profile.id).order('created_at'),
    supabase.from('profiles').select('id, full_name').eq('role', 'instructor'),
  ]);
  // Opening the page marks the instructor's replies as read.
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('thread_student_id', profile.id).neq('sender_id', profile.id).is('read_at', null);

  const names: Record<string, string> = {};
  (instructors ?? []).forEach((i) => (names[i.id as string] = (i.full_name as string) || 'Instructor'));

  return (
    <div className="narrow">
      <h1 className="page-title">Messages</h1>
      <p className="sub">Questions about class, homework or your sessions? Message your instructor here. You’ll get an email when they reply.</p>
      <div className="card">
        <Thread threadStudentId={profile.id} meId={profile.id} initial={(msgs ?? []) as Message[]} names={names} />
      </div>
    </div>
  );
}
