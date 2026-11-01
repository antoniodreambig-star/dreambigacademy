import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, classDate, dueDate, hasHomework } from '@/lib/schedule';
import type { Cohort, Submission, Week } from '@/lib/types';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line: string) => (line.length <= 73 ? line : line.match(/.{1,73}/g)!.join('\r\n '));
const compact = (d: string) => d.replace(/-/g, '');

const TZ_BLOCK = [
  'BEGIN:VTIMEZONE',
  'TZID:America/Chicago',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0500',
  'TZNAME:CDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0600',
  'TZNAME:CST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, '');
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response('Not found', { status: 404 });
  const admin = createAdminClient();
  if (!admin) return new Response('Calendar feed is not set up.', { status: 503 });

  const { data: p } = await admin.from('profiles').select('id, cohort_id, full_name').eq('calendar_token', token).single();
  if (!p || !p.cohort_id) return new Response('Not found', { status: 404 });
  const [{ data: cohort }, { data: weeks }, { data: subs }] = await Promise.all([
    admin.from('cohorts').select('*').eq('id', p.cohort_id).single(),
    admin.from('weeks').select('*').order('week'),
    admin.from('submissions').select('week').eq('student_id', p.id),
  ]);
  if (!cohort) return new Response('Not found', { status: 404 });
  const c = cohort as Cohort;
  const done = new Set(((subs ?? []) as Pick<Submission, 'week'>[]).map((s) => s.week));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const [sh, sm] = c.class_start.split(':').map(Number);
  const endMin = sh * 60 + sm + Math.round(c.class_hours * 60);
  const hh = (n: number) => String(Math.floor(n / 60) % 24).padStart(2, '0') + String(n % 60).padStart(2, '0') + '00';

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dream Big Studios//Academy//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:Dream Big Academy (${esc(c.name)})`, 'X-WR-TIMEZONE:America/Chicago', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H', ...TZ_BLOCK];

  for (const w of (weeks ?? []) as Week[]) {
    const d = classDate(c, w.week);
    lines.push(
      'BEGIN:VEVENT',
      `UID:class-${c.id}-w${w.week}@app.dreambigctx.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Chicago:${compact(d)}T${hh(sh * 60 + sm)}`,
      `DTEND;TZID=America/Chicago:${compact(d)}T${hh(endMin)}`,
      fold(`SUMMARY:Academy Week ${w.week}: ${esc(w.title)}`),
      fold(`DESCRIPTION:${esc(`In class: ${w.in_class || 'Outline coming soon'}\nLab: ${w.lab || '-'}`)}`),
      'LOCATION:Dream Big Studios\\, 1507 W Stan Schleuter Loop\\, Suite 101\\, Killeen\\, TX 76549',
      'END:VEVENT',
    );
    if (hasHomework(w) && !done.has(w.week)) {
      const due = dueDate(c, w);
      lines.push(
        'BEGIN:VEVENT',
        `UID:hw-${c.id}-w${w.week}@app.dreambigctx.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compact(due)}`,
        `DTEND;VALUE=DATE:${compact(addDays(due, 1))}`,
        fold(`SUMMARY:Homework due: Week ${w.week}`),
        fold(`DESCRIPTION:${esc(w.homework)}`),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Homework due tomorrow', 'TRIGGER:-P1D', 'END:VALARM',
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=900' },
  });
}
