'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { sendEmail, siteUrl } from '@/lib/email';
import { isMethod, isPlan, money, parseDollars, planInstallments, standing } from '@/lib/pricing';
import { fmtDate, todayLocal } from '@/lib/schedule';
import type { Enrollment, Payment } from '@/lib/types';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const none = (v: string) => (v === '' ? null : v);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Only allow sending the instructor back to a page inside /admin. */
function back(f: FormData, fallback = '/admin/payments'): string {
  const r = str(f, 'return', 200);
  return r.startsWith('/admin/') && !r.includes('//') && !r.includes(':') ? r : fallback;
}
/** Adds ?key to a path while keeping any #anchor at the end. */
function tag(url: string, key: string): string {
  const [path, hash] = url.split('#');
  return `${path}${path.includes('?') ? '&' : '?'}${key}${hash ? `#${hash}` : ''}`;
}

export async function saveEnrollment(f: FormData) {
  const { supabase } = await requireInstructor();
  const to = back(f);
  const id = str(f, 'student_id', 40);
  const plan = str(f, 'plan', 10);
  const firstDue = str(f, 'first_due', 10);
  const total = parseDollars(str(f, 'total', 12));
  if (!id || !isPlan(plan) || !DATE.test(firstDue) || !total) redirect(tag(to, 'err=plan'));
  // The default number of payments depends on the student's track (6 in person, 3 online).
  const { data: st } = await supabase.from('profiles').select('cohort_id').eq('id', id).maybeSingle();
  const { data: co } = st?.cohort_id ? await supabase.from('cohorts').select('format').eq('id', st.cohort_id).maybeSingle() : { data: null };
  const installments = plan === 'full' ? 1 : Math.max(1, Math.min(24, Math.round(Number(str(f, 'installments', 2))) || planInstallments(plan, co?.format === 'online' ? 'online' : 'in_person')));
  const { error } = await supabase
    .from('enrollments')
    .upsert({ student_id: id, plan, total_cents: total, installments, first_due: firstDue, note: none(str(f, 'note', 500)), updated_at: new Date().toISOString() }, { onConflict: 'student_id' });
  if (error) redirect(tag(to, 'err=plan'));
  revalidatePath('/admin/payments');
  revalidatePath('/tuition');
  redirect(tag(to, 'ok=plan'));
}

export async function recordPayment(f: FormData) {
  const { supabase, profile } = await requireInstructor();
  const to = back(f);
  const id = str(f, 'student_id', 40);
  const cents = parseDollars(str(f, 'amount', 12));
  const paidOn = str(f, 'paid_on', 10);
  const method = str(f, 'method', 10);
  if (!id || !cents || !DATE.test(paidOn) || !isMethod(method)) redirect(tag(to, 'err=payment'));
  const { error } = await supabase.from('payments').insert({ student_id: id, amount_cents: cents, paid_on: paidOn, method, note: none(str(f, 'note', 300)), recorded_by: profile.id });
  if (error) redirect(tag(to, 'err=payment'));

  if (f.get('receipt') === '1') {
    const [{ data: st }, { data: enr }, { data: pays }] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', id).single(),
      supabase.from('enrollments').select('*').eq('student_id', id).maybeSingle(),
      supabase.from('payments').select('amount_cents').eq('student_id', id),
    ]);
    if (st?.email) {
      const paid = ((pays ?? []) as Pick<Payment, 'amount_cents'>[]).reduce((a, p) => a + p.amount_cents, 0);
      let tail = '';
      if (enr) {
        const s = standing(enr as Enrollment, paid, todayLocal());
        tail = s.balance === 0
          ? `\n\nYour tuition is paid in full. Thank you!`
          : `\n\nPaid so far: ${money(s.paid)} of ${money(s.total)}. Remaining balance: ${money(s.balance)}.${s.next ? ` Next payment: ${money(s.next.cents)} due ${fmtDate(s.next.due, { year: 'numeric' })}.` : ''}`;
      }
      await sendEmail(
        st.email as string,
        `Payment received: ${money(cents)}`,
        `Hi ${((st.full_name as string) || '').split(' ')[0] || 'there'},\n\nWe received your payment of ${money(cents)} on ${fmtDate(paidOn, { year: 'numeric' })}.${tail}\n\nSee your tuition: ${siteUrl()}/tuition`,
      );
    }
  }
  revalidatePath('/admin/payments');
  revalidatePath('/tuition');
  redirect(tag(to, 'ok=payment'));
}

export async function deletePayment(f: FormData) {
  const { supabase } = await requireInstructor();
  await supabase.from('payments').delete().eq('id', str(f, 'id', 40));
  revalidatePath('/admin/payments');
  revalidatePath('/tuition');
  redirect(tag(back(f), 'ok=deleted'));
}

export async function saveSquareLinks(f: FormData) {
  const { supabase } = await requireInstructor();
  const rows: { key: string; value: string; updated_at: string }[] = [];
  for (const key of ['square_link_full', 'square_link_monthly', 'square_link_online_full', 'square_link_online_monthly']) {
    const v = str(f, key, 500);
    if (v) {
      try {
        if (new URL(v).protocol !== 'https:') throw new Error('not https');
      } catch {
        redirect('/admin/payments?err=link');
      }
    }
    rows.push({ key, value: v, updated_at: new Date().toISOString() });
  }
  await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  revalidatePath('/tuition');
  redirect('/admin/payments?ok=links');
}
