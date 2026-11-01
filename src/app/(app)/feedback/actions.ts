'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';

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
  await supabase.from('submission_comments').insert({
    submission_id,
    author_id: profile.id,
    author_name: profile.full_name || (profile.role === 'instructor' ? 'Instructor' : 'Student'),
    author_role: profile.role,
    at_seconds: at,
    body,
  });
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
