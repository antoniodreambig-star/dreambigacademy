import { METHODS, METHOD_LABEL } from '@/lib/pricing';
import { todayLocal } from '@/lib/schedule';
import { recordPayment } from '@/app/(app)/admin/payments/actions';

/** The "record a payment" form, used on the Payments page and on each student's page. */
export default function PaymentForm({ studentId, defaultAmount, returnTo }: { studentId: string; defaultAmount?: string; returnTo: string }) {
  return (
    <form action={recordPayment} className="stack">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="return" value={returnTo} />
      <div className="row">
        <div><label>Amount ($)</label><input name="amount" type="text" inputMode="decimal" placeholder="250" defaultValue={defaultAmount ?? ''} required /></div>
        <div><label>Date paid</label><input name="paid_on" type="date" defaultValue={todayLocal()} required /></div>
      </div>
      <div className="row">
        <div>
          <label>How they paid</label>
          <select name="method" defaultValue="square">
            {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </select>
        </div>
        <div><label>Note (optional)</label><input name="note" type="text" maxLength={300} /></div>
      </div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
        <input type="checkbox" name="receipt" value="1" defaultChecked style={{ width: 20, height: 20 }} /> Email them a receipt
      </label>
      <button className="btn btn--sm" type="submit">Record payment</button>
    </form>
  );
}
