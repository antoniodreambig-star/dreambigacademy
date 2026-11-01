'use server';

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
