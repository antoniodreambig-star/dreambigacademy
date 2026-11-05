import AuthShell from '@/components/AuthShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { fmtDate, todayLocal } from '@/lib/schedule';
import { MONTHLY_CENTS, MONTHLY_COUNT, TUITION_CENTS, money } from '@/lib/pricing';
import type { Cohort } from '@/lib/types';
import { submitApplication } from './actions';

export const metadata = { title: 'Apply · Dream Big Academy' };
export const dynamic = 'force-dynamic';

const ERR: Record<string, string> = {
  name: 'Please enter your full name.',
  email: 'Please enter a valid email address.',
  birth: 'Please enter your date of birth.',
  age: 'The Academy is for students 16 and older. Check back when you turn 16.',
  guardian: 'Applicants under 18 need a parent or guardian’s name and email.',
  plan: 'Choose how you’d like to pay.',
  save: 'That didn’t save. Please try again, or text the studio.',
};

export default async function Apply({ searchParams }: { searchParams: Promise<{ err?: string; done?: string }> }) {
  const q = await searchParams;

  if (q.done) {
    return (
      <AuthShell>
        <div className="card stack" style={{ maxWidth: 560 }}>
          <div>
            <p className="eyebrow">Dream Big Studios Academy</p>
            <h1 className="page-title">Application received</h1>
          </div>
          <p>Thanks for applying. We’ll email you soon about next steps. If you’re under 18, we’ll also email your parent or guardian a consent form to sign.</p>
          <a className="btn btn--ghost" href="https://dreambigctx.com">Back to dreambigctx.com</a>
        </div>
      </AuthShell>
    );
  }

  // Upcoming classes, if the server key is set. Applicants aren't signed in, so this uses the server-side client.
  let cohorts: Cohort[] = [];
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin.from('cohorts').select('*').eq('active', true).gte('start_date', todayLocal()).order('start_date');
    cohorts = (data ?? []) as Cohort[];
  }

  return (
    <AuthShell>
      <div className="card stack" style={{ maxWidth: 560 }}>
        <div>
          <p className="eyebrow">Dream Big Studios Academy</p>
          <h1 className="page-title">Apply to the Academy</h1>
          <p className="muted">
            A six-month, in-person course in recording, mixing and mastering with Pro Tools. One three-hour class a week at the studio in Killeen, TX. Students must be 16 or older.
          </p>
        </div>
        {q.err && <div className="notice notice--err" role="alert">{ERR[q.err] ?? ERR.save}</div>}
        <form action={submitApplication} className="stack">
          <input type="hidden" name="t" value={Date.now()} />
          {/* Spam trap: real people never see or fill this in. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor="company">Company</label>
            <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" type="text" required autoComplete="name" /></div>
          <div className="row">
            <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" autoComplete="tel" /></div>
          </div>
          <div>
            <label htmlFor="birth_date">Date of birth</label>
            <input id="birth_date" name="birth_date" type="date" required />
            <p className="small muted" style={{ margin: '4px 0 0' }}>Only used to check the age requirement. If you’re 16 or 17, a parent or guardian signs a consent form.</p>
          </div>

          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: 6 }}>If you’re under 18: parent or guardian</legend>
            <div><label htmlFor="guardian_name">Parent / guardian name</label><input id="guardian_name" name="guardian_name" type="text" /></div>
            <div className="row">
              <div><label htmlFor="guardian_email">Their email</label><input id="guardian_email" name="guardian_email" type="email" /></div>
              <div><label htmlFor="guardian_phone">Their phone</label><input id="guardian_phone" name="guardian_phone" type="tel" /></div>
            </div>
          </fieldset>

          <div><label htmlFor="experience">Any experience with music or recording? (optional)</label><textarea id="experience" name="experience" maxLength={2000} /></div>
          <div><label htmlFor="goals">What do you want to get out of the Academy? (optional)</label><textarea id="goals" name="goals" maxLength={2000} /></div>

          {cohorts.length > 0 && (
            <div>
              <label htmlFor="cohort_id">Which start date works for you? (optional)</label>
              <select id="cohort_id" name="cohort_id" defaultValue="">
                <option value="">Whichever is next</option>
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name} · starts {fmtDate(c.start_date, { year: 'numeric' })}</option>)}
              </select>
            </div>
          )}

          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: 6 }}>How would you like to pay?</legend>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}>
              <input type="radio" name="plan" value="full" required style={{ width: 20, height: 20 }} />
              Pay in full: {money(TUITION_CENTS)}
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}>
              <input type="radio" name="plan" value="monthly" style={{ width: 20, height: 20 }} />
              Monthly: {money(MONTHLY_CENTS)} a month for {MONTHLY_COUNT} months
            </label>
          </fieldset>

          <div><label htmlFor="referral">How did you hear about us? (optional)</label><input id="referral" name="referral" type="text" maxLength={300} /></div>
          <button className="btn" type="submit" style={{ width: '100%' }}>Submit application</button>
          <p className="small muted" style={{ margin: 0 }}>Submitting an application doesn’t enroll you or charge you anything.</p>
        </form>
      </div>
    </AuthShell>
  );
}
