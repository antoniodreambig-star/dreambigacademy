import { requireStudent } from '@/lib/auth';
import { METHOD_LABEL, MONTHLY_CENTS, MONTHLY_COUNT, PLAN_LABEL, STATE_CHIP, STATE_LABEL, TUITION_CENTS, dueSchedule, isMethod, money, standing } from '@/lib/pricing';
import { fmtDate, todayLocal } from '@/lib/schedule';
import type { Enrollment, Payment } from '@/lib/types';

export const metadata = { title: 'Tuition' };

export default async function Tuition() {
  const { supabase, profile } = await requireStudent();
  const [{ data: e }, { data: p }, { data: st }] = await Promise.all([
    supabase.from('enrollments').select('*').eq('student_id', profile.id).maybeSingle(),
    supabase.from('payments').select('*').eq('student_id', profile.id).order('paid_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('app_settings').select('key, value').in('key', ['square_link_full', 'square_link_monthly']),
  ]);
  const enr = (e as Enrollment | null) ?? null;
  const pays = (p ?? []) as Payment[];
  const links = new Map(((st ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  const today = todayLocal();

  if (!enr) {
    return (
      <>
        <h1 className="page-title">Tuition</h1>
        <div className="card stack">
          <p style={{ margin: 0 }}>Your payment plan hasn’t been set up yet. Your instructor will set it up soon and it will show up here.</p>
          <p className="small muted" style={{ margin: 0 }}>Tuition is {money(TUITION_CENTS)}, paid in full, or {money(MONTHLY_CENTS)} a month for {MONTHLY_COUNT} months.</p>
        </div>
      </>
    );
  }

  const paid = pays.reduce((a, x) => a + x.amount_cents, 0);
  const s = standing(enr, paid, today);
  const sched = dueSchedule(enr);
  const link = (enr.plan === 'full' ? links.get('square_link_full') : links.get('square_link_monthly')) || links.get('square_link_monthly') || links.get('square_link_full') || '';

  return (
    <>
      <h1 className="page-title">Tuition</h1>
      <p className="sub">{PLAN_LABEL[enr.plan]} plan · {money(s.total)} total</p>

      <div className="grid grid--3" style={{ marginBottom: 16 }}>
        <section className="card"><p className="eyebrow">Paid</p><h2 style={{ margin: 0 }}>{money(s.paid)}</h2></section>
        <section className="card"><p className="eyebrow">Balance</p><h2 style={{ margin: 0 }}>{money(s.balance)}</h2></section>
        <section className="card">
          <p className="eyebrow">Status</p>
          <p style={{ margin: 0 }}><span className={`chip ${STATE_CHIP[s.state]}`}>{STATE_LABEL[s.state]}</span></p>
          {s.overdue > 0 && <p className="small" style={{ margin: '6px 0 0' }}><strong>{money(s.overdue)}</strong> is past due.</p>}
        </section>
      </div>

      {s.next && (
        <section className="card stack" style={{ marginBottom: 16 }}>
          <div>
            <p className="eyebrow">Next payment</p>
            <h2 style={{ margin: 0 }}>{money(s.next.cents)} <span className="muted small">due {fmtDate(s.next.due, { year: 'numeric' })}</span></h2>
          </div>
          {link ? (
            <>
              <p style={{ margin: 0 }}><a className="btn" href={link} target="_blank" rel="noopener noreferrer">Pay with Square</a></p>
              <p className="small muted" style={{ margin: 0 }}>After you pay, your instructor records it here, usually within a day. You’ll get a receipt by email.</p>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>Ask your instructor how to pay. Once they record your payment it shows up here.</p>
          )}
        </section>
      )}

      <h2 className="phase">Payment schedule</h2>
      <div className="card tablewrap">
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

      <h2 className="phase">Payments received</h2>
      <div className="card tablewrap">
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Method</th></tr></thead>
          <tbody>
            {pays.length === 0 && <tr><td colSpan={3} className="muted">No payments yet.</td></tr>}
            {pays.map((x) => (
              <tr key={x.id}>
                <td>{fmtDate(x.paid_on, { year: 'numeric' })}</td>
                <td>{money(x.amount_cents)}</td>
                <td>{isMethod(x.method) ? METHOD_LABEL[x.method] : x.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
