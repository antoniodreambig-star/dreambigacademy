'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOnlineStudent } from '@/lib/auth';
import { notifyAddress } from '@/lib/consents';
import { sendEmail, siteUrl } from '@/lib/email';
import { fmtZoned } from '@/lib/schedule';
import type { OfficeHour } from '@/lib/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function bookSlot(f: FormData) {
  const { supabase, profile } = await requireOnlineStudent();
  const id = String(f.get('id') ?? '');
  if (!UUID.test(id)) redirect('/office-hours?err=gone');
  const topic = String(f.get('topic') ?? '').trim().slice(0, 300);
  const { data, error } = await supabase.rpc('book_office_hour', { p_id: id, p_topic: topic });
  const result = error ? 'save' : String(data);
  if (result !== 'ok') redirect(`/office-hours?err=${result}`);

  // Let the instructor know.
  const { data: slot } = await supabase.from('office_hours').select('*').eq('id', id).maybeSingle();
  const s = slot as OfficeHour | null;
  if (s) {
    await sendEmail(
      notifyAddress(),
      `Office hours booked: ${profile.full_name || profile.email}`,
      `${profile.full_name || profile.email} booked office hours on ${fmtZoned(new Date(s.starts_at), 'America/Chicago')} (Killeen time), ${s.minutes} minutes.${topic ? `\n\nTopic: ${topic}` : ''}\n\n${siteUrl()}/admin/office-hours`,
    );
  }
  revalidatePath('/office-hours');
  revalidatePath('/home');
  redirect('/office-hours?ok=booked');
}

export async function cancelSlot(f: FormData) {
  const { supabase } = await requireOnlineStudent();
  const id = String(f.get('id') ?? '');
  if (!UUID.test(id)) redirect('/office-hours');
  const { data, error } = await supabase.rpc('cancel_office_hour', { p_id: id });
  if (error || data !== 'ok') redirect(`/office-hours?err=${error ? 'save' : String(data)}`);
  revalidatePath('/office-hours');
  revalidatePath('/home');
  redirect('/office-hours?ok=canceled');
}
