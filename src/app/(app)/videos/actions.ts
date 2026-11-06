'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { normalizeUrl } from '@/lib/video';

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
const BACK = '/videos/manage';
const done = () => {
  revalidatePath('/videos');
  revalidatePath(BACK);
};

export async function addVideo(f: FormData) {
  const { supabase, profile } = await requireInstructor();
  const title = str(f, 'title', 160);
  const url = normalizeUrl(str(f, 'url', 500));
  if (!title || !url) redirect(`${BACK}?err=video`);
  const { data, error } = await supabase
    .from('videos')
    .insert({ title, url, description: str(f, 'description', 800) || null, created_by: profile.id })
    .select('id')
    .single();
  if (error || !data) redirect(`${BACK}?err=db`);
  const ids = f.getAll('filter').map(String).filter(Boolean);
  if (ids.length) await supabase.from('video_filter_links').insert(ids.map((filter_id) => ({ video_id: data.id, filter_id })));
  done();
  redirect(`${BACK}?ok=added`);
}

export async function updateVideo(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'id', 40);
  const title = str(f, 'title', 160);
  const url = normalizeUrl(str(f, 'url', 500));
  if (!id || !title || !url) redirect(`${BACK}?err=video`);
  const { error } = await supabase.from('videos').update({ title, url, description: str(f, 'description', 800) || null }).eq('id', id);
  if (error) redirect(`${BACK}?err=db`);
  await supabase.from('video_filter_links').delete().eq('video_id', id);
  const ids = f.getAll('filter').map(String).filter(Boolean);
  if (ids.length) await supabase.from('video_filter_links').insert(ids.map((filter_id) => ({ video_id: id, filter_id })));
  done();
  redirect(`${BACK}?ok=saved`);
}

export async function deleteVideo(f: FormData) {
  const { supabase } = await requireInstructor();
  await supabase.from('videos').delete().eq('id', str(f, 'id', 40));
  done();
  redirect(`${BACK}?ok=deleted`);
}

export async function addFilter(f: FormData) {
  const { supabase } = await requireInstructor();
  const name = str(f, 'name', 40);
  if (!name) redirect(`${BACK}?err=filter`);
  const { error } = await supabase.from('video_filters').insert({ name });
  if (error) redirect(`${BACK}?err=${error.code === '23505' ? 'dupe' : 'db'}`);
  done();
  redirect(`${BACK}?ok=filter`);
}

export async function renameFilter(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'id', 40);
  const name = str(f, 'name', 40);
  if (!id || !name) redirect(`${BACK}?err=filter`);
  const { error } = await supabase.from('video_filters').update({ name }).eq('id', id);
  if (error) redirect(`${BACK}?err=${error.code === '23505' ? 'dupe' : 'db'}`);
  done();
  redirect(`${BACK}?ok=filter`);
}

export async function deleteFilter(f: FormData) {
  const { supabase } = await requireInstructor();
  await supabase.from('video_filters').delete().eq('id', str(f, 'id', 40));
  done();
  redirect(`${BACK}?ok=filter`);
}
