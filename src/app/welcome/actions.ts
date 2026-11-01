'use server';

import { redirect } from 'next/navigation';
import { requireProfileRaw } from '@/lib/auth';

export async function saveCredentials(formData: FormData) {
  const { supabase, profile } = await requireProfileRaw();
  const edit = formData.get('edit') === '1';
  const back = (err: string) => redirect(`/welcome?${edit ? 'edit=1&' : ''}err=${err}`);

  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!/^[a-z0-9_.]{3,24}$/.test(username)) back('username');
  // On the first visit a password is required; when editing, blank means "keep my current one".
  const changingPassword = !edit || password.length > 0;
  if (changingPassword) {
    if (password.length < 8) back('short');
    if (password !== confirm) back('match');
  }

  if (username !== profile.username) {
    const { error } = await supabase.from('profiles').update({ username }).eq('id', profile.id);
    if (error) back(error.code === '23505' ? 'taken' : 'save');
  }
  if (changingPassword) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) back(/different|same/i.test(error.message) ? 'same' : 'password');
  }
  redirect(edit ? '/profile?saved=1' : '/');
}
