'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOnlineStudent } from '@/lib/auth';
import { notifyAddress } from '@/lib/consents';
import { sendEmail, siteUrl } from '@/lib/email';
import { DEFAULT_TZ, SETUP_ITEMS, setupProgress } from '@/lib/online';
import { isValidTimeZone } from '@/lib/schedule';

const str = (f: FormData, k: string, max = 120) => String(f.get(k) ?? '').trim().slice(0, max);
const none = (v: string) => (v === '' ? null : v);

/** Saves the student's time zone, gear and setup checklist. */
export async function saveSetup(f: FormData) {
  const { supabase, profile } = await requireOnlineStudent();
  const tzRaw = str(f, 'time_zone', 64);
  const time_zone = isValidTimeZone(tzRaw) ? tzRaw : DEFAULT_TZ;

  const setup: Record<string, boolean> = {};
  for (const i of SETUP_ITEMS) if (f.get(`chk_${i.key}`) === '1') setup[i.key] = true;
  const complete = setupProgress({ setup }).complete;

  const { data: before } = await supabase.from('online_profiles').select('setup_done_at').eq('student_id', profile.id).maybeSingle();
  const wasDone = (before?.setup_done_at as string | null | undefined) ?? null;

  const { error } = await supabase.from('online_profiles').upsert(
    {
      student_id: profile.id,
      time_zone,
      location: none(str(f, 'location')),
      daw: none(str(f, 'daw')),
      os: none(str(f, 'os')),
      interface: none(str(f, 'interface')),
      mic: none(str(f, 'mic')),
      headphones: none(str(f, 'headphones')),
      monitors: none(str(f, 'monitors')),
      internet: none(str(f, 'internet')),
      setup,
      setup_done_at: complete ? wasDone ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id' },
  );
  if (error) redirect('/setup?err=1');

  // Tell the instructor the first time a student finishes the checklist.
  if (complete && !wasDone) {
    await sendEmail(notifyAddress(), `Setup complete: ${profile.full_name || profile.email}`, `${profile.full_name || profile.email} finished the online setup checklist.\n\nSee their gear and time zone: ${siteUrl()}/admin/students/${profile.id}`);
  }
  revalidatePath('/setup');
  revalidatePath('/home');
  revalidatePath('/live');
  redirect('/setup?ok=1');
}
