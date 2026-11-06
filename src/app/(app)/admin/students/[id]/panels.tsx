import type { SupabaseClient } from '@supabase/supabase-js';
import PaymentForm from '@/components/PaymentFields';
import { consentLink } from '@/lib/consents';
import { METHOD_LABEL, PLAN_LABEL, STATE_CHIP, STATE_LABEL, dueSchedule, isMethod, isPlan, money, standing, termsFor, type Format } from '@/lib/pricing';
import { fmtDate } from '@/lib/schedule';
import type { Cohort, Enrollment, GuardianConsent, Payment, Profile } from '@/lib/types';
import { deletePayment, saveEnrollment } from '../../payments/actions';
import { requestConsent } from './consent-actions';

const dateLong = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function PlanForm({ student, enr, defaultPlan, defaultFirstDue, returnTo, format }: { student: Profile; enr: Enrollment | null; defaultPlan: string; defaultFirstDue: string; returnTo: string; format: Format }) {
  const t = termsFor(format);
  const wanted = enr?.plan ?? (isPlan(defaultPlan) ? defaultPlan : 'monthly');
  // Online may be pay-in-full only; keep "monthly" available if this student is already on it.
  const showMonthly = t.allowMonthly || enr?.plan === 'monthly';
  const plan = wanted === 'monthly' && !showMonthly ? 'full' : wanted;
  return (
    <form action={saveEnrollment} className="stack">
      <input type="hidden" name="student_id" value={student.id} />
      <input type="hidden" name="return" value={returnTo} />
      <div className="row">
        <div>
          <label>Plan</label>
          <select name="plan" defaultValue={plan}>
            {showMonthly && <option value="monthly">{PLAN_LABEL.monthly}: {money(t.monthlyCents)} a month × {t.monthlyCount}</option>}
            <option value="full">{PLAN_LABEL.full}: {money(t.total)}</option>
          </select>
        </div>
        <div><label>Total tuition ($)</label><input name="total" type="text" inputMode="decimal" defaultValue={String((enr?.total_cents ?? t.total) / 100)} required /></div>
      </div>
      <div className="row">
        <div><label>First payment due</label><input name="first_due" type="date" defaultValue={enr?.first_due ?? defaultFirstDue} required /></div>
        <div><label>Number of monthly payments</label><input name="installments" type="number" min={1} max={24} defaultValue={enr?.plan === 'monthly' ? enr.installments : t.monthlyCount} /></div>
      </div>
      <div><label>Note (optional, only you see this)</label><input name="note" type="text" maxLength={500} defaultValue={enr?.note ?? ''} placeholder="Sponsor, discount, scholarship…" /></div>
      <p className="small muted" style={{ margin: 0 }}>{format === 'online' ? 'Online-only course. ' : ''}Change the total for a discount or scholarship. “Number of monthly payments” is ignored for Pay in full.</p>
      <button className="btn btn--sm" type="submit">{enr ? 'Update plan' : 'Set up payment plan'}</button>
    </form>
  );
}

export async function TuitionPanel({ supabase, student, cohort, today }: { supabase: SupabaseClient; student: Profile; cohort: Cohort | null; today: string }) {
  const [{ data: e }, { data: p }, { data: inv }] = await Promise.all([
    supabase.from('enrollments').select('*').eq('student_id', student.id).maybeSingle(),
    supabase.from('payments').select('*').eq('student_id', student.id).order('paid_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('invites').select('plan, format').eq('email', student.email).maybeSingle(),
  ]);
  const enr = (e as Enrollment | null) ?? null;
  const pays = (p ?? []) as Payment[];
  const returnTo = `/admin/students/${student.id}#tuition`;
  const format: Format = cohort ? cohort.format : inv?.format === 'online' ? 'online' : 'in_person';
  const paid = pays.reduce((a, x) => a + x.amount_cents, 0);

  if (!enr) {
    return (
      <>
        <h2 className="phase" id="tuition">Tuition</h2>
        <div className="card stack">
          <p className="muted" style={{ margin: 0 }}>No payment plan yet. Set one up to start tracking payments.</p>
          <PlanForm student={student} enr={null} defaultPlan={(inv?.plan as string) ?? 'monthly'} defaultFirstDue={cohort?.start_date ?? today} returnTo={returnTo} format={format} />
        </div>
      </>
    );
  }

  const s = standing(enr, paid, today);
  const sched = dueSchedule(enr);
  return (
    <>
      <h2 className="phase" id="tuition">Tuition</h2>
      <div className="card stack">
        <p style={{ margin: 0 }}>
          <span className={`chip ${STATE_CHIP[s.state]}`}>{STATE_LABEL[s.state]}</span>{' '}
          <strong>{PLAN_LABEL[enr.plan]}</strong> · {money(s.paid)} paid of {money(s.total)} · <strong>{money(s.balance)}</strong> left
          {s.overdue > 0 && <> · <strong>{money(s.overdue)} past due</strong></>}
          {s.next && <> · next {money(s.next.cents)} on {fmtDate(s.next.due, { year: 'numeric' })}</>}
        </p>
        {enr.note && <p className="small muted" style={{ margin: 0 }}>Note: {enr.note}</p>}

        <div className="tablewrap">
          <table>
            <thead><tr><th>Payment</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {sched.map((i) => (
                <tr key={i.n}>
                  <td>{enr.installments === 1 ? 'Full tuition' : `#${i.n} of ${enr.installments}`}</td>
                  <td>{fmtDate(i.due, { year: 'numeric' })}</td>
                  <td>{money(i.cents)}</td>
                  <td>{i.through <= paid ? <span className="chip chip--done">Paid</span> : i.due < today ? <span className="chip chip--overdue">Past due</span> : <span className="chip">Upcoming</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="fold" open={pays.length === 0}>
          <summary>Record a payment</summary>
          <PaymentForm studentId={student.id} defaultAmount={s.next ? String(s.next.cents / 100) : ''} returnTo={returnTo} />
        </details>

        {pays.length > 0 && (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th><th /></tr></thead>
              <tbody>
                {pays.map((x) => (
                  <tr key={x.id}>
                    <td>{fmtDate(x.paid_on, { year: 'numeric' })}</td>
                    <td>{money(x.amount_cents)}</td>
                    <td>{isMethod(x.method) ? METHOD_LABEL[x.method] : x.method}</td>
                    <td>{x.note || '—'}</td>
                    <td>
                      <form action={deletePayment}>
                        <input type="hidden" name="id" value={x.id} />
                        <input type="hidden" name="return" value={returnTo} />
                        <button className="btn btn--danger btn--sm" type="submit">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="fold">
          <summary>Change the plan</summary>
          <PlanForm student={student} enr={enr} defaultPlan={enr.plan} defaultFirstDue={enr.first_due} returnTo={returnTo} format={format} />
        </details>
      </div>
    </>
  );
}

export async function ConsentPanel({ supabase, student, mailOff }: { supabase: SupabaseClient; student: Profile; mailOff: boolean }) {
  const { data } = await supabase.from('guardian_consents').select('*').eq('student_email', student.email).order('requested_at', { ascending: false }).limit(1).maybeSingle();
  const c = (data as GuardianConsent | null) ?? null;
  const needed = student.under_18 || !!c || !!student.parent_email;

  return (
    <>
      <h2 className="phase" id="consent">Guardian consent</h2>
      <div className="card stack">
        {c?.status === 'signed' ? (
          <>
            <p style={{ margin: 0 }}>
              <span className="chip chip--done">Signed</span> by <strong>{c.signed_name}</strong> ({c.relationship || 'guardian'}) on {c.signed_at ? dateLong(c.signed_at) : ''}.
            </p>
            <p className="small" style={{ margin: 0 }}>
              Guardian phone: {c.phone || '—'} · Emergency contact: {c.emergency_name || '—'}{c.emergency_phone ? `, ${c.emergency_phone}` : ''} · Photo/video release: {c.media_ok ? 'yes' : 'no'} · Wording version {c.version || '—'}
            </p>
          </>
        ) : c ? (
          <>
            <p style={{ margin: 0 }}>
              <span className="chip chip--soon">Waiting</span> for {c.guardian_name || 'the guardian'} to sign{c.last_sent_at ? ` · link emailed ${dateLong(c.last_sent_at)}` : ' · link not emailed yet'}.
            </p>
            {mailOff && <div className="notice notice--err" style={{ margin: 0 }}>The email didn’t go out (no guardian email, or email isn’t set up). Copy the link below and text it to them.</div>}
            <div>
              <label htmlFor="clink">Private link for the guardian</label>
              <input id="clink" type="text" readOnly value={consentLink(c.token)} />
            </div>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>{needed ? 'No consent request sent yet.' : 'Only needed for students under 18.'}</p>
        )}

        {c?.status !== 'signed' && (
          <details className="fold" open={needed && !c}>
            <summary>{c ? 'Resend or change the guardian’s details' : 'Send a consent link to a parent or guardian'}</summary>
            <form action={requestConsent} className="stack">
              <input type="hidden" name="student_id" value={student.id} />
              <div className="row">
                <div><label>Guardian name</label><input name="guardian_name" type="text" defaultValue={c?.guardian_name || student.parent_name || ''} /></div>
                <div><label>Guardian email</label><input name="guardian_email" type="email" defaultValue={c?.guardian_email || student.parent_email || ''} /></div>
              </div>
              <button className="btn btn--sm" type="submit">{c ? 'Save and email the link again' : 'Create link and email it'}</button>
            </form>
          </details>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          If you collect a paper form instead, tick “Parent consent signed” under Placement above. Signing online ticks it for you.
        </p>
      </div>
    </>
  );
}
