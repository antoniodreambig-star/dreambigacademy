'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { sendEmail, siteUrl } from '@/lib/email';
import { DEFAULT_TZ, cleanUrl } from '@/lib/online';
import { ONLINE_WEEKS, TZ, fmtZoned, sessionTimes } from '@/lib/schedule';
import type { Cohort, OnlineSession } from '@/lib/types';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const none = (v: string) => (v === '' ? null : v);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Saves what you want students to know about one online session, and optionally emails the class. */
export async function saveSession(f: FormData) {
  const { supabase } = await requireInstructor();
  const cohortId = str(f, 'cohort_id', 40);
  const week = Number(f.get('week'));
  const back = (qs: string) => `/admin/online?cohort=${encodeURIComponent(cohortId)}&${qs}#w${week}`;
  if (!cohortId || !Number.isInteger(week) || week < 1 || week > ONLINE_WEEKS) redirect('/admin/online');

  const { data: co } = await supabase.from('cohorts').select('*').eq('id', cohortId).eq('format', 'online').maybeSingle();
  const cohort = co as Cohort | null;
  if (!cohort) redirect('/admin/online');

  const dateRaw = str(f, 'date_override', 10);
  const timeRaw = str(f, 'time_override', 5);
  if ((dateRaw && !DATE.test(dateRaw)) || (timeRaw && !TIME.test(timeRaw))) redirect(back('err=date'));
  for (const k of ['meeting_url', 'recording_url', 'slides_url']) {
    if (str(f, k, 500) && !cleanUrl(str(f, k, 500))) redirect(back(`err=${k}`));
  }

  const { data: prevRow } = await supabase.from('online_sessions').select('*').eq('cohort_id', cohortId).eq('week', week).maybeSingle();
  const prev = (prevRow as OnlineSession | null) ?? null;

  const row = {
    cohort_id: cohortId,
    week,
    meeting_url: cleanUrl(str(f, 'meeting_url', 500)),
    date_override: dateRaw || null,
    // A new time only makes sense with its date; if you set just a time, it applies to the normal date.
    time_override: timeRaw ? `${timeRaw}:00` : null,
    canceled: f.get('canceled') === '1',
    topic_note: none(str(f, 'topic_note', 1000)),
    recording_url: cleanUrl(str(f, 'recording_url', 500)),
    recording_note: none(str(f, 'recording_note', 2000)),
    slides_url: cleanUrl(str(f, 'slides_url', 500)),
    posted_at: cleanUrl(str(f, 'recording_url', 500)) ? prev?.posted_at ?? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('online_sessions').upsert(row, { onConflict: 'cohort_id,week' });
  if (error) redirect(back('err=save'));

  // Optional email to everyone in the class, in each student's own time zone.
  let mail = '';
  if (f.get('notify') === '1') {
    const { data: wk } = await supabase.from('weeks').select('title').eq('week', week).maybeSingle();
    const title = (wk?.title as string | undefined) ?? '';
    const newRecording = !!row.recording_url && row.recording_url !== (prev?.recording_url ?? null);
    const nowCanceled = row.canceled && !prev?.canceled;
    const moved = !row.canceled && (row.date_override !== (prev?.date_override ?? null) || row.time_override !== (prev?.time_override ?? null)) && (row.date_override || row.time_override);

    const [{ data: students }, { data: zones }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').eq('role', 'student').eq('cohort_id', cohortId),
      supabase.from('online_profiles').select('student_id, time_zone'),
    ]);
    const zoneOf = new Map(((zones ?? []) as { student_id: string; time_zone: string }[]).map((z) => [z.student_id, z.time_zone]));
    const times = sessionTimes(cohort, week, row);
    let sent = 0;
    let total = 0;
    for (const st of (students ?? []) as { id: string; email: string; full_name: string | null }[]) {
      const tz = zoneOf.get(st.id) || DEFAULT_TZ;
      const hi = `Hi ${(st.full_name || '').split(' ')[0] || 'there'},\n\n`;
      let subject = '';
      let body = '';
      if (nowCanceled) {
        subject = `Live session canceled: Week ${week}`;
        body = `${hi}The Week ${week} live session (${title}) is canceled.${row.topic_note ? `\n\n${row.topic_note}` : ''}\n\nSee your schedule: ${siteUrl()}/live`;
      } else if (moved) {
        subject = `Live session time changed: Week ${week}`;
        body = `${hi}The Week ${week} live session (${title}) has a new time:\n\n${fmtZoned(times.start, tz)}${tz !== TZ ? ` (${fmtZoned(times.start, TZ)})` : ''}\n\nJoin from your Live sessions page: ${siteUrl()}/live`;
      } else if (newRecording) {
        subject = `Recording posted: Week ${week}`;
        body = `${hi}The recording for Week ${week} (${title}) is up. Missed it live? Watch it, then tap “I watched it” so your instructor knows you’re caught up.\n\n${siteUrl()}/live#w${week}${row.recording_note ? `\n\nNotes:\n${row.recording_note}` : ''}`;
      } else {
        continue;
      }
      total++;
      if (await sendEmail(st.email, subject, body)) sent++;
    }
    mail = total === 0 ? '&mail=none' : `&mail=${sent}of${total}`;
  }

  revalidatePath('/live');
  revalidatePath('/home');
  revalidatePath('/schedule');
  redirect(back(`ok=1${mail}`));
}
