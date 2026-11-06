import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_TZ, meetingFor, setupProgress } from '@/lib/online';
import { TZ, addDays, classDate, daysBetween, dueDate, fmtDate, fmtTime, fmtZoned, hasHomework, sessionTimes, todayLocal } from '@/lib/schedule';
import { sendEmail, siteUrl } from '@/lib/email';
import type { Cohort, OfficeHour, OnlineProfile, OnlineSession, Profile, Submission, Week } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Runs once a day (see vercel.json). Emails each student who has homework due today or tomorrow, or class tomorrow.
// Online students also get their live-session link (today / tomorrow), a setup reminder before the course starts,
// and a reminder for office hours they booked.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });

  const today = todayLocal();
  const tomorrow = addDays(today, 1);
  const now = Date.now();
  const [{ data: cohorts }, { data: students }, { data: weeks }, { data: onlineWeeks }, { data: subs }, { data: sessions }, { data: onlineProfiles }, { data: slots }] = await Promise.all([
    admin.from('cohorts').select('*').eq('active', true),
    admin.from('profiles').select('*').eq('role', 'student'),
    admin.from('weeks').select('*').order('week'),
    admin.from('online_weeks').select('*').order('week'),
    admin.from('submissions').select('student_id, week'),
    admin.from('online_sessions').select('*'),
    admin.from('online_profiles').select('*'),
    admin.from('office_hours').select('*').not('booked_by', 'is', null).gt('starts_at', new Date(now).toISOString()).lt('starts_at', new Date(now + 26 * 3_600_000).toISOString()),
  ]);
  const W = (weeks ?? []) as Week[];
  const OW = (onlineWeeks ?? []) as Week[];
  const done = new Set(((subs ?? []) as Pick<Submission, 'student_id' | 'week'>[]).map((s) => `${s.student_id}:${s.week}`));
  const sessionBy = new Map(((sessions ?? []) as OnlineSession[]).map((o) => [`${o.cohort_id}:${o.week}`, o]));
  const profileBy = new Map(((onlineProfiles ?? []) as OnlineProfile[]).map((o) => [o.student_id, o]));
  const slotsBy = new Map<string, OfficeHour[]>();
  for (const s of (slots ?? []) as OfficeHour[]) if (s.booked_by) slotsBy.set(s.booked_by, [...(slotsBy.get(s.booked_by) ?? []), s]);
  let sent = 0;

  for (const p of (students ?? []) as Profile[]) {
    const c = ((cohorts ?? []) as Cohort[]).find((x) => x.id === p.cohort_id);
    if (!c) continue;
    const online = c.format === 'online';
    const lines: string[] = [];
    const op = profileBy.get(p.id) ?? null;
    const tz = op?.time_zone || DEFAULT_TZ;

    for (const w of online ? OW : W) {
      if (hasHomework(w) && !done.has(`${p.id}:${w.week}`)) {
        const due = dueDate(c, w);
        if (due === today) lines.push(`Homework due TODAY (Week ${w.week}): ${w.homework}`);
        else if (due === tomorrow) lines.push(`Homework due tomorrow (Week ${w.week}): ${w.homework}`);
      }
      if (!online) {
        if (classDate(c, w.week) === tomorrow) lines.push(`Class tomorrow, ${fmtDate(tomorrow)} at ${fmtTime(c.class_start)}: Week ${w.week}, ${w.title}`);
        continue;
      }
      // Online: the live session, in the student's own time zone, with the join link.
      const ov = sessionBy.get(`${c.id}:${w.week}`) ?? null;
      const t = sessionTimes(c, w.week, ov);
      if (t.canceled && (t.date === today || t.date === tomorrow)) {
        lines.push(`Live session canceled (Week ${w.week}, ${w.title}).${ov?.topic_note ? ` ${ov.topic_note}` : ''}`);
        continue;
      }
      if (t.date === today || t.date === tomorrow) {
        const link = meetingFor(c, ov);
        lines.push(
          `Live session ${t.date === today ? 'TODAY' : 'tomorrow'}: Week ${w.week}, ${w.title}\n${fmtZoned(t.start, tz)}${tz !== TZ ? ` (${fmtZoned(t.start, TZ)})` : ''}${link.url ? `\nJoin: ${link.url}${link.passcode ? ` (passcode ${link.passcode})` : ''}` : ''}${ov?.topic_note ? `\nBefore you join: ${ov.topic_note}` : ''}`,
        );
      }
    }

    if (online) {
      // Nudge to finish the setup checklist a week and two days before the first session.
      const untilStart = daysBetween(today, c.start_date);
      if ((untilStart === 7 || untilStart === 2) && !setupProgress(op).complete) {
        lines.push(`Your first live session is ${untilStart === 2 ? 'in 2 days' : 'a week away'}. Finish the setup checklist so you’re ready: ${siteUrl()}/setup`);
      }
      for (const s of slotsBy.get(p.id) ?? []) lines.push(`Office hours booked: ${fmtZoned(new Date(s.starts_at), tz)} (${s.minutes} minutes).`);
    }

    if (lines.length && (await sendEmail(p.email, 'Dream Big Academy reminder', `Hi ${(p.full_name || '').split(' ')[0] || 'there'},\n\n${lines.join('\n\n')}\n\n${online ? `Live sessions and recordings: ${siteUrl()}/live\n` : ''}Turn homework in: ${siteUrl()}/schedule`))) sent++;
  }
  return Response.json({ ok: true, sent });
}
