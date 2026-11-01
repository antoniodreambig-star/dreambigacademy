import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, classDate, dueDate, fmtDate, fmtTime, hasHomework, todayLocal } from '@/lib/schedule';
import { sendEmail, siteUrl } from '@/lib/email';
import type { Cohort, Profile, Submission, Week } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Runs once a day (see vercel.json). Emails each student who has homework due today or tomorrow, or class tomorrow.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });

  const today = todayLocal();
  const tomorrow = addDays(today, 1);
  const [{ data: cohorts }, { data: students }, { data: weeks }, { data: subs }] = await Promise.all([
    admin.from('cohorts').select('*').eq('active', true),
    admin.from('profiles').select('*').eq('role', 'student'),
    admin.from('weeks').select('*').order('week'),
    admin.from('submissions').select('student_id, week'),
  ]);
  const W = (weeks ?? []) as Week[];
  const done = new Set(((subs ?? []) as Pick<Submission, 'student_id' | 'week'>[]).map((s) => `${s.student_id}:${s.week}`));
  let sent = 0;

  for (const p of (students ?? []) as Profile[]) {
    const c = ((cohorts ?? []) as Cohort[]).find((x) => x.id === p.cohort_id);
    if (!c) continue;
    const lines: string[] = [];
    for (const w of W) {
      if (hasHomework(w) && !done.has(`${p.id}:${w.week}`)) {
        const due = dueDate(c, w);
        if (due === today) lines.push(`Homework due TODAY (Week ${w.week}): ${w.homework}`);
        else if (due === tomorrow) lines.push(`Homework due tomorrow (Week ${w.week}): ${w.homework}`);
      }
      if (classDate(c, w.week) === tomorrow) lines.push(`Class tomorrow, ${fmtDate(tomorrow)} at ${fmtTime(c.class_start)}: Week ${w.week}, ${w.title}`);
    }
    if (lines.length && (await sendEmail(p.email, 'Dream Big Academy reminder', `Hi ${(p.full_name || '').split(' ')[0] || 'there'},\n\n${lines.join('\n\n')}\n\nTurn homework in: ${siteUrl()}/schedule`))) sent++;
  }
  return Response.json({ ok: true, sent });
}
