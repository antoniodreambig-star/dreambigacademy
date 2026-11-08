import { MODULE_SPAN } from './modules';
import type { Cohort, Format, OnlineSession, Submission, Week } from './types';

export const TZ = 'America/Chicago';
const DAY = 86_400_000;

/** 'YYYY-MM-DD' + n days (calendar math, no time zones involved). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + n * DAY;
  return new Date(t).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const f = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((f(b) - f(a)) / DAY);
}

/** Today's date in Killeen, as 'YYYY-MM-DD'. */
export function todayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function fmtDate(date: string, opts?: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
}

/**
 * The curriculum weeks a class covers. A module class covers its module's weeks (e.g. Module B in person =
 * weeks 9-16). Older full-course classes (no module) cover the whole curriculum. Week numbers stay global
 * so homework and attendance keep their week numbers from one module to the next.
 */
export interface WeekSpan {
  first: number;
  last: number;
  count: number;
}
export function weekSpan(c: Pick<Cohort, 'format' | 'module'>): WeekSpan {
  const f: Format = c.format === 'online' ? 'online' : 'in_person';
  const m = c.module ? MODULE_SPAN[f][c.module] : null;
  const first = m ? m.first : 1;
  const last = m ? m.last : f === 'online' ? ONLINE_WEEKS : IN_PERSON_WEEKS;
  return { first, last, count: last - first + 1 };
}

/** Only the weeks that belong to this class. */
export function weeksFor<T extends { week: number }>(c: Pick<Cohort, 'format' | 'module'>, list: T[]): T[] {
  const s = weekSpan(c);
  return list.filter((w) => w.week >= s.first && w.week <= s.last);
}

/** "Week 3" as the student counts it: Module B's first class is its Week 1, not Week 9. */
export const localWeek = (c: Pick<Cohort, 'format' | 'module'>, week: number): number => week - weekSpan(c).first + 1;

export function classDate(cohort: Pick<Cohort, 'start_date' | 'format' | 'module'>, week: number): string {
  return addDays(cohort.start_date, (week - weekSpan(cohort).first) * 7);
}

export function dueDate(cohort: Pick<Cohort, 'start_date' | 'format' | 'module'>, w: Pick<Week, 'week' | 'homework_due_days'>): string {
  return addDays(classDate(cohort, w.week), w.homework_due_days);
}

export type HwState = 'done' | 'overdue' | 'soon' | 'upcoming' | 'later';

/** later = the homework hasn't been assigned yet (its class hasn't happened). */
export function hwState(cohort: Cohort, w: Week, sub: Submission | undefined, today: string): HwState {
  if (sub) return 'done';
  const cls = classDate(cohort, w.week);
  if (today < cls) return 'later';
  const due = dueDate(cohort, w);
  if (due < today) return 'overdue';
  if (daysBetween(today, due) <= 3) return 'soon';
  return 'upcoming';
}

export function hasHomework(w: Week): boolean {
  return w.homework.trim().length > 0;
}

/** Whole-curriculum length (26 weeks). Online is the in-person class streamed live, so it has the same weeks. Classes run one 8-week module at a time; see weekSpan(). */
export const IN_PERSON_WEEKS = 26;
export const ONLINE_WEEKS = IN_PERSON_WEEKS;
export const courseWeeks = (format: Format | null | undefined): number => (format === 'online' ? ONLINE_WEEKS : IN_PERSON_WEEKS);


/** 0 = not started yet, first..last = the current week, last+1 = finished (using the curriculum week numbers for this class). */
export function currentWeek(cohort: Pick<Cohort, 'start_date' | 'format' | 'module'>, today: string): number {
  const s = weekSpan(cohort);
  const n = Math.floor(daysBetween(cohort.start_date, today) / 7) + 1;
  if (n < 1) return 0;
  return Math.min(s.last + 1, s.first + n - 1);
}

// ------------------------------------------------------------- time zones --
// Class times are set in Killeen time (America/Chicago). Online students can live anywhere,
// so their live sessions are shown in their own time zone.

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz.length > 0 && tz.length <= 64;
  } catch {
    return false;
  }
}

/** How far ahead of UTC a time zone is at a given moment, in milliseconds (Chicago in winter = -6 hours). */
function zoneOffsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asIfUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return asIfUtc - (at.getTime() - at.getMilliseconds());
}

/** 'YYYY-MM-DD' + 'HH:MM' on the wall clock of `tz` → the real moment in time. */
export function zonedTimeToUtc(date: string, time: string, tz: string = TZ): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let t = wall - zoneOffsetMs(new Date(wall), tz);
  const again = zoneOffsetMs(new Date(t), tz);
  if (wall - again !== t) t = wall - again; // daylight-saving edge
  return new Date(t);
}

/** "Sat, Nov 14, 10:00 AM CST" in the given time zone. */
export function fmtZoned(at: Date, tz: string, opts?: Intl.DateTimeFormatOptions): string {
  return at.toLocaleString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', ...opts });
}

/** "10:00 AM CST" */
export function fmtZonedTime(at: Date, tz: string): string {
  return at.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

export interface SessionTimes {
  /** The class date in Killeen, after any one-off reschedule. */
  date: string;
  start: Date;
  end: Date;
  rescheduled: boolean;
  canceled: boolean;
}

/** When one online session really starts and ends, including a one-off reschedule or cancellation. */
export function sessionTimes(cohort: Pick<Cohort, 'start_date' | 'class_start' | 'class_hours' | 'format' | 'module'>, week: number, ov?: Pick<OnlineSession, 'date_override' | 'time_override' | 'canceled'> | null): SessionTimes {
  const date = ov?.date_override || classDate(cohort, week);
  const time = ov?.time_override || cohort.class_start;
  const start = zonedTimeToUtc(date, time.slice(0, 5), TZ);
  const end = new Date(start.getTime() + Math.round(cohort.class_hours * 60) * 60_000);
  return { date, start, end, rescheduled: !!(ov?.date_override || ov?.time_override), canceled: !!ov?.canceled };
}
