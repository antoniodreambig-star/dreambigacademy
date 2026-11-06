'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOnlineStudent } from '@/lib/auth';
import { ONLINE_WEEKS, sessionTimes } from '@/lib/schedule';
import type { OnlineSession } from '@/lib/types';

/** "I watched the recording" for a session the student missed. Never replaces Present, Late or Excused. */
export async function markWatched(f: FormData) {
  const { supabase, profile, cohort } = await requireOnlineStudent();
  const week = Number(f.get('week'));
  if (!Number.isInteger(week) || week < 1 || week > ONLINE_WEEKS) redirect('/live');

  const { data: ov } = await supabase.from('online_sessions').select('*').eq('cohort_id', cohort.id).eq('week', week).maybeSingle();
  const o = (ov as OnlineSession | null) ?? null;
  // Only after the session is over, and only when a recording has been posted.
  if (!o?.recording_url || sessionTimes(cohort, week, o).end.getTime() > Date.now()) redirect(`/live?err=early#w${week}`);

  const { data: existing } = await supabase.from('attendance').select('status').eq('student_id', profile.id).eq('week', week).maybeSingle();
  const status = (existing?.status as string | undefined) ?? null;
  if (status && status !== 'absent' && status !== 'watched') redirect(`/live#w${week}`); // already counted as there

  const now = new Date().toISOString();
  const { error } = status
    ? await supabase.from('attendance').update({ status: 'watched', marked_at: now }).eq('student_id', profile.id).eq('week', week)
    : await supabase.from('attendance').insert({ student_id: profile.id, week, status: 'watched', marked_at: now });
  if (error) redirect(`/live?err=save#w${week}`);
  revalidatePath('/live');
  revalidatePath('/home');
  redirect(`/live?ok=1#w${week}`);
}
