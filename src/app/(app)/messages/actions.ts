'use server';

import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, siteUrl } from '@/lib/email';

/** Saves a message in a student's thread and emails the other person. */
export async function sendMessage(threadStudentId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim().slice(0, 4000);
  if (!text) return { ok: false, error: 'Write a message first.' };
  const { supabase, profile } = await requireProfile();

  // Students can only write in their own thread (the database enforces this too).
  const thread = profile.role === 'student' ? profile.id : threadStudentId;
  const { error } = await supabase.from('messages').insert({ thread_student_id: thread, sender_id: profile.id, body: text });
  if (error) return { ok: false, error: 'That message didn’t send. Please try again.' };

  const admin = createAdminClient();
  if (admin) {
    const who = profile.full_name || profile.email;
    if (profile.role === 'student') {
      const { data: inst } = await admin.from('profiles').select('email').eq('role', 'instructor');
      const to = (inst ?? []).map((i) => i.email as string);
      if (to.length) await sendEmail(to, `Academy message from ${who}`, `${who} wrote:\n\n${text}\n\nReply: ${siteUrl()}/admin/messages/${thread}`);
    } else {
      const { data: st } = await admin.from('profiles').select('email').eq('id', thread).single();
      if (st?.email) await sendEmail(st.email as string, 'New message from your Academy instructor', `${who} wrote:\n\n${text}\n\nReply: ${siteUrl()}/messages`);
    }
  }
  return { ok: true };
}

const NO_DELETE = 'That couldn’t be deleted. You may not have permission, or the database update for deleting messages hasn’t been run yet.';

/** Instructors can delete messages they sent; the main account can delete any message. The database enforces this. */
export async function deleteMessage(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== 'instructor') return { ok: false, error: 'Only instructors can delete messages.' };
  const { data, error } = await supabase.from('messages').delete().eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: NO_DELETE };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Deletes a student's whole conversation. Main account only (the database enforces this). */
export async function deleteThread(studentId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== 'instructor') return { ok: false, error: 'Only instructors can delete messages.' };
  const { data, error } = await supabase.from('messages').delete().eq('thread_student_id', studentId).select('id');
  if (error || !data?.length) return { ok: false, error: NO_DELETE };
  revalidatePath('/', 'layout');
  return { ok: true };
}
