import AuthShell from '@/components/AuthShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, fmtDate, todayLocal } from '@/lib/schedule';
import Link from 'next/link';
import { money, termsFor } from '@/lib/pricing';
import { TIME_ZONES } from '@/lib/online';
import { ENROLL_CUTOFF_DAYS, MODULES, MODULE_KEYS, isModule, type ModuleKey } from '@/lib/modules';
import type { Cohort, Format } from '@/lib/types';
import { submitApplication } from './actions';

export const metadata = {
  title: 'Apply to the Audio Engineering Academy in Killeen, TX',
  alternates: { canonical: '/apply' },
  robots: { index: true, follow: true },
  description: 'Apply to a Dream Big Studios Audio Engineering Academy module: recording, mixing and mastering in Pro Tools. Three standalone modules, in person in Killeen, TX, or online. Ages 16+.',
  // The card people see when the apply link is shared. Image: public/share-apply.png.
  openGraph: {
    type: 'website',
    siteName: 'Dream Big Academy',
    title: 'Apply to the Dream Big Academy',
    description: 'Learn recording, mixing and mastering in Pro Tools at Dream Big Studios: in person in Killeen, TX, or online. Ages 16+.',
    images: [{ url: '/share-apply.png', width: 1200, height: 630, alt: 'Apply to the Dream Big Academy' }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'Apply to the Dream Big Academy', description: 'Learn recording, mixing and mastering in Pro Tools: in person in Killeen, TX, or online. Ages 16+.', images: ['/share-apply.png'] },
};
export const dynamic = 'force-dynamic';

const ERR: Record<string, string> = {
  name: 'Please enter your full name.',
  email: 'Please enter a valid email address.',
  birth: 'Please enter your date of birth.',
  age: 'The Academy is for students 16 and older. Check back when you turn 16.',
  guardian: 'Applicants under 18 need a parent or guardian’s name and email.',
  plan: 'Choose how you’d like to pay.',
  module: 'Choose which module you’d like to take.',
  tz: 'Choose your time zone so we can show your live sessions at the right time.',
  save: 'That didn’t save. Please try again, or text the studio.',
};

export default async function Apply({ searchParams }: { searchParams: Promise<{ err?: string; done?: string; track?: string; module?: string }> }) {
  const q = await searchParams;
  const pickedModule: ModuleKey | null = isModule(q.module) ? q.module : null;
  const format: Format | null = q.track === 'online' ? 'online' : q.track === 'in_person' ? 'in_person' : null;

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

  // First step: pick a track. WordPress can link straight to /apply?track=online or /apply?track=in_person.
  if (!format) {
    const inP = termsFor('in_person');
    const onl = termsFor('online');
    return (
      <AuthShell>
        <div className="stack" style={{ maxWidth: 760, width: '100%' }}>
          <div>
            <p className="eyebrow">Dream Big Studios Academy</p>
            <h1 className="page-title">Apply to the Academy</h1>
            <p className="muted">Learn to record, mix and master in Pro Tools. The Academy is three standalone modules. Take any one on its own, and sign up for another later if you want to keep going. Pick how you want to learn. Students must be 16 or older.</p>
          </div>
          {q.err && <div className="notice notice--err" role="alert">{ERR[q.err] ?? ERR.save}</div>}
          <div className="grid grid--2">
            <section className="card stack">
              <p className="eyebrow" style={{ margin: 0 }}>In person</p>
              <p className="stat" style={{ margin: 0 }}>{money(inP.total)} <span className="small muted">per module</span></p>
              <p style={{ margin: 0 }}>Each module is {inP.length}: one three-hour class a week at the studio in Killeen, TX, with hands-on lab time.</p>
              <p className="small muted" style={{ margin: 0 }}>Pay in full, or {money(inP.monthlyCents)} a month for {inP.monthlyCount} months.</p>
              <Link className="btn" href="/apply?track=in_person">Apply in person</Link>
            </section>
            <section className="card stack">
              <p className="eyebrow" style={{ margin: 0 }}>Online only</p>
              <p className="stat" style={{ margin: 0 }}>{money(onl.total)} <span className="small muted">per module</span></p>
              <p style={{ margin: 0 }}>Each module is {onl.length}: {onl.classes} live video sessions from anywhere, recordings of every session, office hours, and homework feedback.</p>
              <p className="small muted" style={{ margin: 0 }}>{onl.allowMonthly ? `Or ${onl.monthlyCount} monthly payments totaling ${money(onl.total)}.` : 'Paid in full.'}</p>
              <Link className="btn" href="/apply?track=online">Apply online</Link>
            </section>
          </div>
        </div>
      </AuthShell>
    );
  }
  const online = format === 'online';
  const terms = termsFor(format);

  // Upcoming classes, if the server key is set. Applicants aren't signed in, so this uses the server-side client.
  let cohorts: Cohort[] = [];
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin.from('cohorts').select('*').eq('active', true).eq('format', format).gte('start_date', addDays(todayLocal(), ENROLL_CUTOFF_DAYS)).order('start_date');
    cohorts = (data ?? []) as Cohort[];
  }

  return (
    <AuthShell>
      <div className="card stack" style={{ maxWidth: 560 }}>
        <div>
          <p className="eyebrow">Dream Big Studios Academy</p>
          <h1 className="page-title">Apply to the Academy</h1>
          <p className="muted">
            {online
              ? `An eight-week online module in recording, mixing and mastering with Pro Tools: you join the in-person class live on video, one three-hour class a week, with recordings, office hours and feedback on your homework. You’ll need a computer, Pro Tools, a microphone and headphones. Each module stands on its own. Students must be 16 or older.`
              : `An eight-week, in-person module in recording, mixing and mastering with Pro Tools: one three-hour class a week at the studio in Killeen, TX. Each module stands on its own. Students must be 16 or older.`}
          </p>
          <p className="small" style={{ margin: 0 }}><Link href="/apply">{online ? 'Looking for the in-person modules?' : 'Looking for the online modules?'}</Link></p>
        </div>
        {q.err && <div className="notice notice--err" role="alert">{ERR[q.err] ?? ERR.save}</div>}
        <form action={submitApplication} className="stack">
          <input type="hidden" name="t" value={Date.now()} />
          <input type="hidden" name="format" value={format} />
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

          {online && (
            <div className="row">
              <div>
                <label htmlFor="time_zone">Your time zone</label>
                <select id="time_zone" name="time_zone" required defaultValue="">
                  <option value="" disabled>Choose one…</option>
                  {TIME_ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              </div>
              <div><label htmlFor="location">City and country (optional)</label><input id="location" name="location" type="text" maxLength={120} autoComplete="off" /></div>
            </div>
          )}

          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: 6 }}>Which module would you like to take?</legend>
            {MODULE_KEYS.map((k) => (
              <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 600 }}>
                <input type="radio" name="module" value={k} required defaultChecked={pickedModule === k} style={{ width: 20, height: 20, marginTop: 2 }} />
                <span>
                  Module {MODULES[k].letter}: {MODULES[k].name}
                  <span className="small muted" style={{ display: 'block', fontWeight: 400 }}>{MODULES[k].blurb}</span>
                </span>
              </label>
            ))}
            <p className="small muted" style={{ margin: 0 }}>Each module is its own short course, enrolled and paid for on its own. You don’t need to take the others.</p>
          </fieldset>

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
              <p className="small muted" style={{ margin: '0 0 4px' }}>Applications close {ENROLL_CUTOFF_DAYS} days before a module starts.</p>
              <select id="cohort_id" name="cohort_id" defaultValue="">
                <option value="">Whichever is next</option>
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.module ? `Module ${MODULES[c.module].letter} · ` : ''}{c.name} · starts {fmtDate(c.start_date, { year: 'numeric' })}</option>)}
              </select>
            </div>
          )}

          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: 6 }}>How would you like to pay for this module?</legend>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}>
              <input type="radio" name="plan" value="full" required style={{ width: 20, height: 20 }} />
              Pay in full: {money(terms.total)}
            </label>
            {terms.allowMonthly && (
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}>
                <input type="radio" name="plan" value="monthly" style={{ width: 20, height: 20 }} />
                Monthly: {money(terms.monthlyCents)} a month for {terms.monthlyCount} months
              </label>
            )}
          </fieldset>

          <div><label htmlFor="referral">How did you hear about us? (optional)</label><input id="referral" name="referral" type="text" maxLength={300} /></div>
          <button className="btn" type="submit" style={{ width: '100%' }}>Submit application</button>
          <p className="small muted" style={{ margin: 0 }}>Submitting an application doesn’t enroll you or charge you anything.</p>
        </form>
      </div>
    </AuthShell>
  );
}
