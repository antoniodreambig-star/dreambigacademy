import type { Cohort, Submission, Week } from './types';

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

export function classDate(cohort: Pick<Cohort, 'start_date'>, week: number): string {
  return addDays(cohort.start_date, (week - 1) * 7);
}

export function dueDate(cohort: Pick<Cohort, 'start_date'>, w: Pick<Week, 'week' | 'homework_due_days'>): string {
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

export function currentWeek(cohort: Cohort, today: string): number {
  const n = Math.floor(daysBetween(cohort.start_date, today) / 7) + 1;
  return Math.max(0, Math.min(27, n)); // 0 = not started, 27 = finished
}
