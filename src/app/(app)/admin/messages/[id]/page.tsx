import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import Thread from '@/components/Thread';
import type { Message } from '@/lib/types';

export default async function AdminThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireInstructor();
  const { data: student } = await supabase.from('profiles').select('id, full_name, email').eq('id', id).eq('role', 'student').single();
  if (!student) notFound();
  const [{ data: msgs }, { data: instructors }] = await Promise.all([
    supabase.from('messages').select('*').eq('thread_student_id', id).order('created_at'),
    supabase.from('profiles').select('id, full_name').eq('role', 'instructor'),
  ]);
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('thread_student_id', id).eq('sender_id', id).is('read_at', null);

  const names: Record<string, string> = { [id]: (student.full_name as string) || (student.email as string) };
  (instructors ?? []).forEach((i) => (names[i.id as string] = (i.full_name as string) || 'Instructor'));

  return (
    <div className="narrow">
      <p><Link href="/admin/messages">← All messages</Link></p>
      <h1 className="page-title">{(student.full_name as string) || (student.email as string)}</h1>
      <p className="sub"><Link href={`/admin/students/${id}`}>View profile and homework</Link></p>
      <div className="card">
        <Thread threadStudentId={id} meId={profile.id} initial={(msgs ?? []) as Message[]} names={names} />
      </div>
    </div>
  );
}
