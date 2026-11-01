'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';

export async function addResource(f: FormData) {
  const { supabase } = await requireInstructor();
  const title = String(f.get('title') ?? '').trim().slice(0, 160);
  const description = String(f.get('description') ?? '').trim().slice(0, 600) || null;
  const weekRaw = String(f.get('week') ?? '');
  const week = weekRaw ? Number(weekRaw) : null;
  let url = String(f.get('url') ?? '').trim().slice(0, 500) || null;
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  const file_path = String(f.get('file_path') ?? '') || null;
  if (!title || (!url && !file_path) || (week !== null && !(week >= 1 && week <= 26))) redirect('/resources?err=1');
  const { error } = await supabase.from('resources').insert({ title, description, week, url, file_path });
  if (error) redirect('/resources?err=1');
  revalidatePath('/resources');
  redirect('/resources?ok=1');
}

export async function deleteResource(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = String(f.get('id') ?? '');
  const { data } = await supabase.from('resources').select('file_path').eq('id', id).single();
  if (data?.file_path) await supabase.storage.from('resources').remove([data.file_path]);
  await supabase.from('resources').delete().eq('id', id);
  revalidatePath('/resources');
  redirect('/resources');
}
