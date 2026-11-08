import { createAdminClient } from '@/lib/supabase/admin';
import { meetingFor } from '@/lib/online';
import { addDays, classDate, dueDate, hasHomework, localWeek, sessionTimes, weeksFor } from '@/lib/schedule';
import type { Cohort, OfficeHour, OnlineSession, Submission, Week } from '@/lib/types';

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
  const { data: cohort } = await admin.from('cohorts').select('*').eq('id', p.cohort_id).single();
  if (!cohort) return new Response('Not found', { status: 404 });
  const c = cohort as Cohort;
  const online = c.format === 'online';
  const [{ data: weeks }, { data: subs }, { data: ovs }, { data: slots }] = await Promise.all([
    admin.from(online ? 'online_weeks' : 'weeks').select('*').order('week'),
    admin.from('submissions').select('week').eq('student_id', p.id),
    online ? admin.from('online_sessions').select('*').eq('cohort_id', c.id) : Promise.resolve({ data: [] }),
    online ? admin.from('office_hours').select('*').eq('booked_by', p.id) : Promise.resolve({ data: [] }),
  ]);
  const done = new Set(((subs ?? []) as Pick<Submission, 'week'>[]).map((s) => s.week));
  const ovBy = new Map(((ovs ?? []) as OnlineSession[]).map((o) => [o.week, o]));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const [sh, sm] = c.class_start.split(':').map(Number);
  const endMin = sh * 60 + sm + Math.round(c.class_hours * 60);
  const hh = (n: number) => String(Math.floor(n / 60) % 24).padStart(2, '0') + String(n % 60).padStart(2, '0') + '00';

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dream Big Studios//Academy//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:Dream Big Academy (${esc(c.name)})`, 'X-WR-TIMEZONE:America/Chicago', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H', ...TZ_BLOCK];

  for (const w of weeksFor(c, (weeks ?? []) as Week[])) {
    const d = classDate(c, w.week);
    if (online) {
      // Online: live sessions are exact moments in time (UTC), so every phone shows them in its own time zone.
      const ov = ovBy.get(w.week) ?? null;
      const t = sessionTimes(c, w.week, ov);
      if (!t.canceled) {
        const m = meetingFor(c, ov);
        const desc = [
          `Live session: ${w.in_class || 'Outline coming soon'}`,
          `Practice: ${w.lab || '-'}`,
          ov?.topic_note ? `Before you join: ${ov.topic_note}` : '',
          m.url ? `Join: ${m.url}${m.passcode ? ` (passcode ${m.passcode})` : ''}` : '',
          ov?.recording_url ? `Recording: ${ov.recording_url}` : '',
        ].filter(Boolean).join('\n');
        lines.push(
          'BEGIN:VEVENT',
          `UID:live-${c.id}-w${w.week}@app.dreambigctx.com`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${utc(t.start)}`,
          `DTEND:${utc(t.end)}`,
          fold(`SUMMARY:Academy live session, Week ${localWeek(c, w.week)}: ${esc(w.title)}`),
          fold(`DESCRIPTION:${esc(desc)}`),
          ...(m.url ? [fold(`LOCATION:${esc(m.url)}`), fold(`URL:${m.url}`)] : ['LOCATION:Online (see the Live sessions page)']),
          'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Live session starts in 15 minutes', 'TRIGGER:-PT15M', 'END:VALARM',
          'END:VEVENT',
        );
      }
    } else {
      lines.push(
        'BEGIN:VEVENT',
        `UID:class-${c.id}-w${w.week}@app.dreambigctx.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=America/Chicago:${compact(d)}T${hh(sh * 60 + sm)}`,
        `DTEND;TZID=America/Chicago:${compact(d)}T${hh(endMin)}`,
        fold(`SUMMARY:Academy Week ${localWeek(c, w.week)}: ${esc(w.title)}`),
        fold(`DESCRIPTION:${esc(`In class: ${w.in_class || 'Outline coming soon'}\nLab: ${w.lab || '-'}`)}`),
        'LOCATION:Dream Big Studios\\, 1507 W Stan Schlueter Loop\\, Suite 101\\, Killeen\\, TX 76549',
        'END:VEVENT',
      );
    }
    if (hasHomework(w) && !done.has(w.week)) {
      const due = dueDate(c, w);
      lines.push(
        'BEGIN:VEVENT',
        `UID:hw-${c.id}-w${w.week}@app.dreambigctx.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compact(due)}`,
        `DTEND;VALUE=DATE:${compact(addDays(due, 1))}`,
        fold(`SUMMARY:Homework due: Week ${localWeek(c, w.week)}`),
        fold(`DESCRIPTION:${esc(w.homework)}`),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Homework due tomorrow', 'TRIGGER:-P1D', 'END:VALARM',
        'END:VEVENT',
      );
    }
  }

  // Office hours this student booked.
  for (const s of (slots ?? []) as OfficeHour[]) {
    const start = new Date(s.starts_at);
    const m = s.meeting_url || meetingFor(c, null).url;
    lines.push(
      'BEGIN:VEVENT',
      `UID:oh-${s.id}@app.dreambigctx.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(new Date(start.getTime() + s.minutes * 60_000))}`,
      'SUMMARY:Academy office hours',
      fold(`DESCRIPTION:${esc([s.topic ? `Topic: ${s.topic}` : '', m ? `Join: ${m}` : ''].filter(Boolean).join('\n') || 'One-on-one with your instructor')}`),
      ...(m ? [fold(`LOCATION:${esc(m)}`), fold(`URL:${m}`)] : []),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Office hours start in 15 minutes', 'TRIGGER:-PT15M', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=900' },
  });
}
