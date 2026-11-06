'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStudent } from '@/lib/auth';

export async function submitHomework(formData: FormData) {
  const { supabase, profile } = await requireStudent();
  const week = Number(formData.get('week'));
  if (!Number.isInteger(week) || week < 1 || week > 26) redirect('/schedule');
  const note = String(formData.get('note') ?? '').trim().slice(0, 2000) || null;
  let link = String(formData.get('link') ?? '').trim().slice(0, 500) || null;
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;

  const row: Record<string, unknown> = { student_id: profile.id, week, note, link, submitted_at: new Date().toISOString() };

  // The browser uploads the file straight to storage; we only accept a path inside this student's own folder.
  const filePath = String(formData.get('file_path') ?? '');
  if (filePath) {
    if (!filePath.startsWith(`${profile.id}/week-${week}/`) || filePath.includes('..')) redirect(`/schedule?err=upload#w${week}`);
    row.file_path = filePath;
  }

  const { error } = await supabase.from('submissions').upsert(row, { onConflict: 'student_id,week' });
  if (error) redirect(`/schedule?err=save#w${week}`);
  revalidatePath('/schedule');
  revalidatePath('/home');
  redirect(`/schedule?ok=1#w${week}`);
}

export async function undoHomework(formData: FormData) {
  const { supabase, profile } = await requireStudent();
  const week = Number(formData.get('week'));
  await supabase.from('submissions').delete().eq('student_id', profile.id).eq('week', week);
  revalidatePath('/schedule');
  revalidatePath('/home');
  redirect(`/schedule#w${week}`);
}
