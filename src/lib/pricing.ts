import { daysBetween } from './schedule';
import type { Format } from './types';

export type { Format };

/** Tuition: $1,500 paid in full, or $250 a month for 6 months (same total). Change these numbers here. */
export const TUITION_CENTS = 150_000;
export const MONTHLY_CENTS = 25_000;
export const MONTHLY_COUNT = 6;

/** Online-only course: $1,000 for the whole 3-month course. Change these numbers here. */
export const ONLINE_TUITION_CENTS = 100_000;
/** Online students can also pay the same total in 3 monthly payments. Set to false to offer pay-in-full only. */
export const ONLINE_ALLOW_MONTHLY = true;
export const ONLINE_MONTHLY_COUNT = 3;

export const isFormat = (v: unknown): v is Format => v === 'in_person' || v === 'online';
export const FORMAT_LABEL: Record<Format, string> = { in_person: 'In person', online: 'Online only' };

export type Plan = 'full' | 'monthly';
export const PLAN_LABEL: Record<Plan, string> = { full: 'Pay in full', monthly: 'Monthly' };
export const isPlan = (v: unknown): v is Plan => v === 'full' || v === 'monthly';

export interface Terms {
  format: Format;
  /** Total tuition in cents. */
  total: number;
  /** Number of payments on the monthly plan. */
  monthlyCount: number;
  /** One monthly payment, rounded (the last payment absorbs any leftover cents). */
  monthlyCents: number;
  /** Is the monthly plan offered for this track? */
  allowMonthly: boolean;
  months: number;
  /** "6 months" / "3 months" */
  length: string;
}

/** Tuition terms for a track. Anything that isn't 'online' gets the in-person terms. */
export function termsFor(format: Format | null | undefined): Terms {
  if (format === 'online') {
    return {
      format: 'online',
      total: ONLINE_TUITION_CENTS,
      monthlyCount: ONLINE_MONTHLY_COUNT,
      monthlyCents: Math.round(ONLINE_TUITION_CENTS / ONLINE_MONTHLY_COUNT),
      allowMonthly: ONLINE_ALLOW_MONTHLY,
      months: 3,
      length: '3 months',
    };
  }
  return { format: 'in_person', total: TUITION_CENTS, monthlyCount: MONTHLY_COUNT, monthlyCents: MONTHLY_CENTS, allowMonthly: true, months: 6, length: '6 months' };
}

export const planInstallments = (plan: Plan, format: Format | null | undefined = 'in_person') => (plan === 'full' ? 1 : termsFor(format).monthlyCount);

/** "$1,000 paid in full" / "$333.33 a month for 3 months" (plan text for emails and cards). */
export function planBlurb(plan: Plan, format: Format | null | undefined): string {
  const t = termsFor(format);
  return plan === 'full' ? `${money(t.total)} paid in full` : `${money(t.monthlyCents)} a month for ${t.monthlyCount} months`;
}

export const METHODS = ['square', 'cash', 'zelle', 'card', 'check', 'other'] as const;
export type Method = (typeof METHODS)[number];
export const METHOD_LABEL: Record<Method, string> = { square: 'Square', cash: 'Cash', zelle: 'Zelle', card: 'Card', check: 'Check', other: 'Other' };
export const isMethod = (v: unknown): v is Method => typeof v === 'string' && (METHODS as readonly string[]).includes(v);

/** 150000 → "$1,500", 12550 → "$125.50" */
export function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });
}

/** "$1,500", "250", "250.5" → cents. Returns null if it isn't a positive amount. */
export function parseDollars(v: string): number | null {
  const s = v.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const c = Math.round(parseFloat(s) * 100);
  return c > 0 && c <= 10_000_000 ? c : null;
}

/** 'YYYY-MM-DD' + n months, keeping the day of the month (or the last day if the month is shorter). */
export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const idx = m - 1 + n;
  const ty = y + Math.floor(idx / 12);
  const tm = ((idx % 12) + 12) % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export interface EnrollmentLike {
  plan: Plan;
  total_cents: number;
  installments: number;
  first_due: string;
}

export interface Installment {
  n: number;
  due: string;
  cents: number;
  /** Running total that must be paid by this installment's due date. */
  through: number;
}

export function dueSchedule(e: Pick<EnrollmentLike, 'total_cents' | 'installments' | 'first_due'>): Installment[] {
  const k = Math.max(1, e.installments);
  const base = Math.floor(e.total_cents / k);
  let run = 0;
  return Array.from({ length: k }, (_, i) => {
    const cents = i === k - 1 ? e.total_cents - base * (k - 1) : base;
    run += cents;
    return { n: i + 1, due: addMonths(e.first_due, i), cents, through: run };
  });
}

export type PayState = 'paid' | 'overdue' | 'soon' | 'current';

export interface Standing {
  total: number;
  paid: number;
  balance: number;
  overdue: number;
  next: { due: string; cents: number } | null;
  state: PayState;
}

export function standing(e: EnrollmentLike, paidCents: number, today: string): Standing {
  const sched = dueSchedule(e);
  const dueToDate = [...sched].filter((s) => s.due <= today).pop()?.through ?? 0;
  const balance = Math.max(0, e.total_cents - paidCents);
  const overdue = Math.max(0, Math.min(dueToDate, e.total_cents) - paidCents);
  const nextInst = sched.find((s) => s.through > paidCents);
  const next = nextInst ? { due: nextInst.due, cents: nextInst.through - Math.max(paidCents, nextInst.through - nextInst.cents) } : null;
  let state: PayState = 'current';
  if (balance === 0) state = 'paid';
  else if (overdue > 0) state = 'overdue';
  else if (next && daysBetween(today, next.due) <= 7) state = 'soon';
  return { total: e.total_cents, paid: paidCents, balance, overdue, next: balance === 0 ? null : next, state };
}

export const STATE_LABEL: Record<PayState, string> = { paid: 'Paid in full', overdue: 'Past due', soon: 'Due soon', current: 'On track' };
/** CSS chip class for each state (these chips already exist in globals.css). */
export const STATE_CHIP: Record<PayState, string> = { paid: 'chip--done', overdue: 'chip--overdue', soon: 'chip--soon', current: '' };
