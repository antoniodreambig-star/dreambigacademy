'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { sendEmail, siteUrl } from '@/lib/email';

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);

export async function addInstructor(f: FormData) {
  const { supabase } = await requireOwner();
  const email = str(f, 'email').toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect('/admin/instructors?err=email');
  const { error } = await supabase.rpc('add_instructor', { em: email });
  if (error) redirect('/admin/instructors?err=save');
  if (f.get('notify') === '1') {
    await sendEmail(
      email,
      'You’ve been added as an instructor at Dream Big Academy',
      `Hi,\n\nYou now have instructor access to the Dream Big Academy app. Go to the link below, enter this email address and tap “Email me a link”. The first time, you’ll pick a username and password for future sign-ins:\n\n${siteUrl()}/login`,
    );
  }
  revalidatePath('/admin/instructors');
  redirect('/admin/instructors?ok=added');
}

export async function removeInstructor(f: FormData) {
  const { supabase } = await requireOwner();
  const email = str(f, 'email').toLowerCase();
  const { error } = await supabase.rpc('remove_instructor', { em: email });
  if (error) redirect('/admin/instructors?err=remove');
  revalidatePath('/admin/instructors');
  redirect('/admin/instructors?ok=removed');
}
