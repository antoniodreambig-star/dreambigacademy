'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { cleanUrl } from '@/lib/online';
import { TZ, zonedTimeToUtc, addDays } from '@/lib/schedule';

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Creates back-to-back office-hour slots, optionally repeated weekly. Times are Killeen time. */
export async function createSlots(f: FormData) {
  const { supabase } = await requireInstructor();
  const date = str(f, 'date', 10);
  const time = str(f, 'time', 5);
  const minutes = Math.round(Number(str(f, 'minutes', 3)));
  const perDay = Math.round(Number(str(f, 'slots', 2)));
  const weeks = Math.round(Number(str(f, 'weeks', 2)));
  const cohortRaw = str(f, 'cohort_id', 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) redirect('/admin/office-hours?err=when');
  if (!(minutes >= 10 && minutes <= 120) || !(perDay >= 1 && perDay <= 12) || !(weeks >= 1 && weeks <= 12)) redirect('/admin/office-hours?err=count');
  const url = str(f, 'meeting_url', 500);
  if (url && !cleanUrl(url)) redirect('/admin/office-hours?err=link');
  const cohort = UUID.test(cohortRaw) ? cohortRaw : null;

  const rows: { cohort_id: string | null; starts_at: string; minutes: number; meeting_url: string | null }[] = [];
  for (let w = 0; w < weeks; w++) {
    const day = addDays(date, w * 7);
    const first = zonedTimeToUtc(day, time, TZ).getTime();
    for (let i = 0; i < perDay; i++) {
      rows.push({ cohort_id: cohort, starts_at: new Date(first + i * minutes * 60_000).toISOString(), minutes, meeting_url: cleanUrl(url) });
    }
  }
  if (rows.some((r) => new Date(r.starts_at).getTime() <= Date.now())) redirect('/admin/office-hours?err=past');
  const { error } = await supabase.from('office_hours').insert(rows);
  if (error) redirect('/admin/office-hours?err=save');
  revalidatePath('/admin/office-hours');
  revalidatePath('/office-hours');
  redirect(`/admin/office-hours?ok=created&n=${rows.length}`);
}

export async function deleteSlot(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'id', 40);
  if (UUID.test(id)) await supabase.from('office_hours').delete().eq('id', id);
  revalidatePath('/admin/office-hours');
  revalidatePath('/office-hours');
  redirect('/admin/office-hours?ok=deleted');
}

/** Frees a booked slot so another student can take it. */
export async function releaseSlot(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'id', 40);
  if (UUID.test(id)) await supabase.from('office_hours').update({ booked_by: null, topic: null, booked_at: null }).eq('id', id);
  revalidatePath('/admin/office-hours');
  revalidatePath('/office-hours');
  redirect('/admin/office-hours?ok=released');
}
