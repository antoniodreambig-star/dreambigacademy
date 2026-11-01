'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, siteUrl } from '@/lib/email';

const safeBack = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
};

export async function addComment(f: FormData) {
  const { supabase, profile } = await requireProfile();
  const back = safeBack(f.get('return_to'));
  const submission_id = String(f.get('submission_id') ?? '');
  const body = String(f.get('body') ?? '').trim().slice(0, 2000);
  const atRaw = String(f.get('at_seconds') ?? '');
  const at = atRaw !== '' && Number.isFinite(Number(atRaw)) ? Math.max(0, Math.floor(Number(atRaw))) : null;
  if (!submission_id || !body) redirect(back);
  // Don't send an email for every comment: skip it if this person already commented here in the last 10 minutes.
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: recent } = await supabase.from('submission_comments').select('id', { count: 'exact', head: true }).eq('submission_id', submission_id).eq('author_id', profile.id).gte('created_at', since);
  const { data: sub } = await supabase.from('submissions').select('student_id, week').eq('id', submission_id).single();
  await supabase.from('submission_comments').insert({
    submission_id,
    author_id: profile.id,
    author_name: profile.full_name || (profile.role === 'instructor' ? 'Instructor' : 'Student'),
    author_role: profile.role,
    at_seconds: at,
    body,
  });
  const admin = createAdminClient();
  if (admin && sub && !recent) {
    const who = profile.full_name || (profile.role === 'instructor' ? 'Your instructor' : 'A student');
    if (profile.role === 'instructor') {
      const { data: st } = await admin.from('profiles').select('email').eq('id', sub.student_id).single();
      if (st?.email) await sendEmail(st.email as string, `New comment on your Week ${sub.week} homework`, `${who} commented on your Week ${sub.week} homework:\n\n${body}\n\nListen and reply: ${siteUrl()}/schedule#w${sub.week}`);
    } else {
      const { data: inst } = await admin.from('profiles').select('email').eq('role', 'instructor');
      const to = (inst ?? []).map((i) => i.email as string);
      if (to.length) await sendEmail(to, `${who} replied on Week ${sub.week} homework`, `${who} wrote:\n\n${body}\n\nOpen it: ${siteUrl()}/admin/students/${sub.student_id}#w${sub.week}`);
    }
  }
  revalidatePath('/schedule');
  revalidatePath('/admin', 'layout');
  redirect(back);
}

export async function deleteComment(f: FormData) {
  const { supabase } = await requireProfile();
  const back = safeBack(f.get('return_to'));
  await supabase.from('submission_comments').delete().eq('id', String(f.get('id') ?? ''));
  revalidatePath('/schedule');
  revalidatePath('/admin', 'layout');
  redirect(back);
}
