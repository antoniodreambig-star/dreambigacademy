'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim().slice(0, 1000) || null : null;
};

export async function saveProfile(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const patch: Record<string, string | null> = {
    full_name: s(formData, 'full_name'),
    phone: s(formData, 'phone'),
    experience: s(formData, 'experience'),
    bio: s(formData, 'bio'),
    goals: s(formData, 'goals'),
    parent_name: s(formData, 'parent_name'),
    parent_phone: s(formData, 'parent_phone'),
    parent_email: s(formData, 'parent_email'),
  };

  const file = formData.get('avatar');
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) redirect('/profile?err=photo');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: true });
    if (error) redirect('/profile?err=photo');
    patch.avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id);
  if (error) redirect('/profile?err=save');
  revalidatePath('/', 'layout');
  redirect('/profile?saved=1');
}
