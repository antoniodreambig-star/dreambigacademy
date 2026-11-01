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

  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > 25 * 1024 * 1024) redirect(`/schedule?err=size#w${week}`);
    const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
    const path = `${profile.id}/week-${week}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from('homework').upload(path, file, { contentType: file.type || 'application/octet-stream' });
    if (error) redirect(`/schedule?err=upload#w${week}`);
    row.file_path = path;
  }

  const { error } = await supabase.from('submissions').upsert(row, { onConflict: 'student_id,week' });
  if (error) redirect(`/schedule?err=save#w${week}`);
  revalidatePath('/schedule');
  revalidatePath('/');
  redirect(`/schedule?ok=1#w${week}`);
}

export async function undoHomework(formData: FormData) {
  const { supabase, profile } = await requireStudent();
  const week = Number(formData.get('week'));
  await supabase.from('submissions').delete().eq('student_id', profile.id).eq('week', week);
  revalidatePath('/schedule');
  revalidatePath('/');
  redirect(`/schedule#w${week}`);
}
