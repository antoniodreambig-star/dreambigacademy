import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import PaymentForm from '@/components/PaymentFields';
import { PLAN_LABEL, STATE_CHIP, STATE_LABEL, money, standing, termsFor } from '@/lib/pricing';
import { fmtDate, todayLocal } from '@/lib/schedule';
import type { Cohort, Enrollment, Payment, Profile } from '@/lib/types';
import { saveSquareLinks } from './actions';

export const metadata = { title: 'Payments' };

const MSG: Record<string, string> = { payment: 'Payment recorded.', plan: 'Payment plan saved.', links: 'Square links saved.', deleted: 'Payment deleted.' };

export default async function Payments({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const [{ data: students }, { data: enrs }, { data: pays }, { data: cohorts }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
    supabase.from('enrollments').select('*'),
    supabase.from('payments').select('*'),
    supabase.from('cohorts').select('*'),
    supabase.from('app_settings').select('key, value').in('key', ['square_link_full', 'square_link_monthly', 'square_link_online_full', 'square_link_online_monthly']),
  ]);
  const today = todayLocal();
  const E = new Map(((enrs ?? []) as Enrollment[]).map((e) => [e.student_id, e]));
  const paidBy = new Map<string, number>();
  ((pays ?? []) as Payment[]).forEach((p) => paidBy.set(p.student_id, (paidBy.get(p.student_id) ?? 0) + p.amount_cents));
  const C = (cohorts ?? []) as Cohort[];
  const links = new Map(((settings ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));

  const rows = ((students ?? []) as Profile[]).map((p) => {
    const e = E.get(p.id);
    return { p, e, s: e ? standing(e, paidBy.get(p.id) ?? 0, today) : null };
  });
  const total = rows.reduce((a, r) => a + (r.s?.total ?? 0), 0);
  const collected = rows.reduce((a, r) => a + (r.s?.paid ?? 0), 0);
  const overdue = rows.reduce((a, r) => a + (r.s?.overdue ?? 0), 0);
  const noPlan = rows.filter((r) => !r.e).length;
  // Past-due students first, then due soon, then everyone else.
  const order = { overdue: 0, soon: 1, current: 2, paid: 3 } as const;
  rows.sort((a, b) => (a.s ? order[a.s.state] : 4) - (b.s ? order[b.s.state] : 4));

  return (
    <>
      <h1 className="page-title">Payments</h1>
      <p className="sub">Who has paid, who owes, and what’s due next. Record each payment when it comes in (Square, cash, Zelle…).</p>
      {q.ok && MSG[q.ok] && <div className="notice notice--ok">{MSG[q.ok]}</div>}
      {q.err && <div className="notice notice--err">{q.err === 'link' ? 'Square links must start with https://' : 'That didn’t save. Check the amount and date and try again.'}</div>}

      <div className="grid grid--3" style={{ marginBottom: 16 }}>
        <section className="card"><p className="eyebrow">Collected</p><h2 style={{ margin: 0 }}>{money(collected)}</h2><p className="small muted" style={{ margin: 0 }}>of {money(total)} expected</p></section>
        <section className="card"><p className="eyebrow">Outstanding</p><h2 style={{ margin: 0 }}>{money(Math.max(0, total - collected))}</h2></section>
        <section className="card"><p className="eyebrow">Past due</p><h2 style={{ margin: 0 }}>{money(overdue)}</h2>{noPlan > 0 && <p className="small muted" style={{ margin: 0 }}>{noPlan} student{noPlan === 1 ? '' : 's'} with no plan yet</p>}</section>
      </div>

      <section className="card">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Student</th><th>Plan</th><th>Paid</th><th>Balance</th><th>Next due</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="muted">No students yet.</td></tr>}
              {rows.map(({ p, e, s }) => {
                const cohort = C.find((c) => c.id === p.cohort_id);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/students/${p.id}#tuition`} style={{ textDecoration: 'none' }}><strong>{p.full_name || p.email}</strong></Link>
                      {cohort && <><br /><span className="small muted">{cohort.name}{cohort.format === 'online' ? ' · online' : ''}</span></>}
                    </td>
                    <td>{e ? PLAN_LABEL[e.plan] : <span className="muted">—</span>}</td>
                    <td>{s ? money(s.paid) : '—'}</td>
                    <td>{s ? money(s.balance) : '—'}</td>
                    <td>{s?.next ? `${money(s.next.cents)} · ${fmtDate(s.next.due)}` : '—'}</td>
                    <td>{s ? <span className={`chip ${STATE_CHIP[s.state]}`}>{STATE_LABEL[s.state]}</span> : <Link className="chip" href={`/admin/students/${p.id}#tuition`}>Set up plan</Link>}</td>
                    <td>
                      {e && s && s.balance > 0 && (
                        <details className="fold">
                          <summary>Record payment</summary>
                          <PaymentForm studentId={p.id} defaultAmount={s.next ? String(s.next.cents / 100) : ''} returnTo="/admin/payments" />
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack" style={{ marginTop: 16 }}>
        <h2>Square payment links</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Create a payment link in Square, paste it here, and students see a “Pay with Square” button on their Tuition page. Each course has its own links because the prices differ: in person is {money(termsFor('in_person').total)} in full or {money(termsFor('in_person').monthlyCents)} a month; online is {money(termsFor('online').total)} in full{termsFor('online').allowMonthly ? ` or about ${money(termsFor('online').monthlyCents)} a month` : ''}. An online student never sees the in-person links.
        </p>
        <form action={saveSquareLinks} className="stack">
          <h3 style={{ fontSize: '1.05rem' }}>In person</h3>
          <div><label htmlFor="slf">Pay-in-full link ({money(termsFor('in_person').total)})</label><input id="slf" name="square_link_full" type="url" placeholder="https://square.link/u/…" defaultValue={links.get('square_link_full') ?? ''} /></div>
          <div><label htmlFor="slm">Monthly payment link ({money(termsFor('in_person').monthlyCents)})</label><input id="slm" name="square_link_monthly" type="url" placeholder="https://square.link/u/…" defaultValue={links.get('square_link_monthly') ?? ''} /></div>
          <h3 style={{ fontSize: '1.05rem' }}>Online only</h3>
          <div><label htmlFor="solf">Pay-in-full link ({money(termsFor('online').total)})</label><input id="solf" name="square_link_online_full" type="url" placeholder="https://square.link/u/…" defaultValue={links.get('square_link_online_full') ?? ''} /></div>
          {termsFor('online').allowMonthly && (
            <div><label htmlFor="solm">Monthly payment link (about {money(termsFor('online').monthlyCents)})</label><input id="solm" name="square_link_online_monthly" type="url" placeholder="https://square.link/u/…" defaultValue={links.get('square_link_online_monthly') ?? ''} /></div>
          )}
          <button className="btn btn--sm" type="submit">Save links</button>
        </form>
      </section>
    </>
  );
}
