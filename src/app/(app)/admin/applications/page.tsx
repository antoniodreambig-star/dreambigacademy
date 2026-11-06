import Link from 'next/link';
import { requireInstructor } from '@/lib/auth';
import { consentLink } from '@/lib/consents';
import { PLAN_LABEL, MONTHLY_CENTS, MONTHLY_COUNT, TUITION_CENTS, money } from '@/lib/pricing';
import { fmtDate } from '@/lib/schedule';
import type { Application, Cohort, GuardianConsent } from '@/lib/types';
import { requestConsent } from '../students/[id]/consent-actions';
import { addStudent, decideApplication, deleteApplication } from './actions';

export const metadata = { title: 'Applications' };

const TABS: [string, string][] = [['new', 'New'], ['accepted', 'Accepted'], ['waitlist', 'Waitlist'], ['declined', 'Declined'], ['all', 'All']];
const OK: Record<string, string> = { consent: 'Consent link sent to the guardian.', accept: 'Accepted. They’re on the invite list and can sign in.', waitlist: 'Moved to the waitlist.', decline: 'Declined.', reopen: 'Moved back to New.', deleted: 'Deleted.', added: 'Added. You can find them under New.' };
const ERR: Record<string, string> = {
  name: 'Enter their full name.',
  email: 'Enter a valid email address.',
  dob: 'Enter the date of birth as a full date, or leave it blank.',
  age: 'The Academy is for students 16 and older.',
  dupe: 'Someone with that email is already on this list. Look for them under All.',
  add: 'That didn’t save. If you haven’t yet run the database update for adding students (10_add_students.sql), run it first, then try again.',
};
const age = (birth: string) => {
  const t = new Date();
  const b = new Date(`${birth}T12:00:00Z`);
  return t.getFullYear() - b.getUTCFullYear() - (t.getMonth() < b.getUTCMonth() || (t.getMonth() === b.getUTCMonth() && t.getDate() < b.getUTCDate()) ? 1 : 0);
};

export default async function Applications({ searchParams }: { searchParams: Promise<{ s?: string; ok?: string; err?: string; mail?: string }> }) {
  const { supabase } = await requireInstructor();
  const q = await searchParams;
  const { data: ownerFlag } = await supabase.rpc('is_owner');
  const isOwner = ownerFlag === true;
  const tab = TABS.some(([k]) => k === q.s) ? (q.s as string) : 'new';
  const [{ data: apps }, { data: cohorts }, { data: consents }] = await Promise.all([
    supabase.from('applications').select('*').order('created_at', { ascending: false }),
    supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
    supabase.from('guardian_consents').select('*').order('requested_at', { ascending: false }),
  ]);
  const A = (apps ?? []) as Application[];
  const C = (cohorts ?? []) as Cohort[];
  const consentBy = new Map<string, GuardianConsent>();
  ((consents ?? []) as GuardianConsent[]).forEach((c) => { if (!consentBy.has(c.student_email)) consentBy.set(c.student_email, c); });
  const count = (k: string) => (k === 'all' ? A.length : A.filter((a) => a.status === k).length);
  const list = tab === 'all' ? A : A.filter((a) => a.status === tab);

  return (
    <>
      <h1 className="page-title">Applications</h1>
      <p className="sub">People who applied on the public form{isOwner ? ', plus anyone you add yourself' : ''}. Accepting adds them to your invite list (and emails a consent link to the guardian of anyone under 18).</p>
      {q.ok && OK[q.ok] && <div className="notice notice--ok">{OK[q.ok]}</div>}
      {q.mail === 'off' && <div className="notice notice--err">The email didn’t go out (email isn’t set up, or there’s no guardian email). Copy the private link and text it to them.</div>}
      {q.err && <div className="notice notice--err">{ERR[q.err] ?? 'That didn’t save. Please try again.'}</div>}


      {isOwner && (
        <details className="card fold" style={{ marginBottom: 16 }} open={q.err === 'name' || q.err === 'email' || q.err === 'dob' || q.err === 'age' || q.err === 'add'}>
          <summary style={{ fontWeight: 800, cursor: 'pointer' }}>Add a student</summary>
          <form action={addStudent} className="stack" style={{ marginTop: 14 }}>
            <p className="small muted" style={{ margin: 0 }}>Only the main account sees this. Pick a label and they’re filed under that tab.</p>
            <div className="row">
              <div><label htmlFor="as-name">Full name</label><input id="as-name" name="full_name" type="text" required maxLength={120} autoComplete="off" /></div>
              <div><label htmlFor="as-email">Email</label><input id="as-email" name="email" type="email" required autoComplete="off" /></div>
            </div>
            <div className="row">
              <div><label htmlFor="as-phone">Phone (optional)</label><input id="as-phone" name="phone" type="tel" autoComplete="off" /></div>
              <div><label htmlFor="as-dob">Date of birth (optional)</label><input id="as-dob" name="birth_date" type="date" /></div>
            </div>
            <div className="row">
              <div>
                <label htmlFor="as-label">Label</label>
                <select id="as-label" name="label" defaultValue="waitlist">
                  <option value="new">New (decide later)</option>
                  <option value="waitlist">Waitlisted</option>
                  <option value="accept">Accepted (adds them to the invite list)</option>
                  <option value="decline">Declined</option>
                </select>
              </div>
              <div>
                <label htmlFor="as-cohort">Class</label>
                <select id="as-cohort" name="cohort_id" defaultValue="">
                  <option value="">None yet</option>
                  {C.map((c) => <option key={c.id} value={c.id}>{c.name} (starts {fmtDate(c.start_date, { year: 'numeric' })})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="as-plan">Payment plan</label>
              <select id="as-plan" name="plan" defaultValue="monthly">
                <option value="monthly">Monthly: {money(MONTHLY_CENTS)} × {MONTHLY_COUNT}</option>
                <option value="full">Pay in full: {money(TUITION_CENTS)}</option>
              </select>
            </div>
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 700, marginBottom: 6 }}>If they’re under 18: parent or guardian (optional)</legend>
              <div><label htmlFor="as-gn">Parent / guardian name</label><input id="as-gn" name="guardian_name" type="text" /></div>
              <div className="row">
                <div><label htmlFor="as-ge">Their email</label><input id="as-ge" name="guardian_email" type="email" /></div>
                <div><label htmlFor="as-gp">Their phone</label><input id="as-gp" name="guardian_phone" type="tel" /></div>
              </div>
            </fieldset>
            <div><label htmlFor="as-note">Message to include in the email (optional)</label><textarea id="as-note" name="decision_note" maxLength={2000} /></div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
              <input type="checkbox" name="notify" value="1" style={{ width: 20, height: 20 }} /> Also email them about their label (Accepted, Waitlisted or Declined)
            </label>
            <button className="btn" type="submit" style={{ alignSelf: 'flex-start' }}>Add student</button>
          </form>
        </details>
      )}

      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map(([k, label]) => (
          <Link key={k} className={`btn btn--sm ${tab === k ? '' : 'btn--ghost'}`} href={`/admin/applications?s=${k}`}>{label} ({count(k)})</Link>
        ))}
      </p>
      <p className="small muted">Share this link on your website for the Apply button: <strong>{(process.env.NEXT_PUBLIC_SITE_URL || 'https://app.dreambigctx.com').replace(/\/$/, '')}/apply</strong></p>

      {list.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Nothing here yet.</p></div>}
      {list.map((a) => {
        const consent = consentBy.get(a.email);
        const cohort = C.find((c) => c.id === a.cohort_id);
        return (
          <section className="card stack" key={a.id} style={{ marginBottom: 16 }}>
            <div>
              <p className="eyebrow">
                {a.status === 'new' ? 'New' : a.status === 'accepted' ? 'Accepted' : a.status === 'waitlist' ? 'Waitlist' : 'Declined'} · applied {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <h2 style={{ marginBottom: 2 }}>{a.full_name} {a.under_18 && <span className="chip chip--soon">Under 18</span>}</h2>
              <p className="muted" style={{ margin: 0 }}>{a.email}{a.phone ? ` · ${a.phone}` : ''}{a.birth_date ? ` · age ${age(a.birth_date)}` : ''}</p>
            </div>

            {a.under_18 && (
              <p style={{ margin: 0 }}>
                <strong>Guardian:</strong> {a.guardian_name || '—'}{a.guardian_email ? ` · ${a.guardian_email}` : ''}{a.guardian_phone ? ` · ${a.guardian_phone}` : ''}
              </p>
            )}
            <p style={{ margin: 0 }}>
              <strong>Wants to pay:</strong> {a.plan ? `${PLAN_LABEL[a.plan]} (${a.plan === 'full' ? money(TUITION_CENTS) : `${money(MONTHLY_CENTS)} × ${MONTHLY_COUNT}`})` : '—'}
              {cohort && <> · <strong>Preferred start:</strong> {cohort.name} ({fmtDate(cohort.start_date, { year: 'numeric' })})</>}
            </p>
            {a.experience && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><strong>Experience:</strong> {a.experience}</p>}
            {a.goals && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><strong>Goals:</strong> {a.goals}</p>}
            {a.referral && <p style={{ margin: 0 }}><strong>Heard about us:</strong> {a.referral}</p>}
            {a.decision_note && <p className="small muted" style={{ margin: 0 }}>Your note: {a.decision_note}</p>}

            {a.status === 'accepted' && a.under_18 && (
              <div className="stack">
                <p style={{ margin: 0 }}>
                  <strong>Guardian consent:</strong>{' '}
                  {consent?.status === 'signed' ? <span className="chip chip--done">Signed by {consent.signed_name}</span> : <span className="chip chip--soon">Waiting</span>}
                </p>
                {consent && consent.status !== 'signed' && (
                  <>
                    <div><label htmlFor={`cl${a.id}`}>Private link (text it if the email didn’t arrive)</label><input id={`cl${a.id}`} type="text" readOnly value={consentLink(consent.token)} /></div>
                    <form action={requestConsent}>
                      <input type="hidden" name="student_email" value={a.email} />
                      <input type="hidden" name="student_name" value={a.full_name} />
                      <input type="hidden" name="guardian_name" value={consent.guardian_name} />
                      <input type="hidden" name="guardian_email" value={consent.guardian_email ?? ''} />
                      <button className="btn btn--sm" type="submit">Email the guardian the link again</button>
                    </form>
                  </>
                )}
              </div>
            )}

            {(a.status === 'new' || a.status === 'waitlist') && (
              <details className="fold" open={a.status === 'new'}>
                <summary>Decide</summary>
                <form action={decideApplication} className="stack">
                  <input type="hidden" name="id" value={a.id} />
                  <div className="row">
                    <div>
                      <label>Class</label>
                      <select name="cohort_id" defaultValue={a.cohort_id ?? C[0]?.id ?? ''}>
                        <option value="">None yet</option>
                        {C.map((c) => <option key={c.id} value={c.id}>{c.name} (starts {fmtDate(c.start_date, { year: 'numeric' })})</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Payment plan</label>
                      <select name="plan" defaultValue={a.plan ?? 'monthly'}>
                        <option value="monthly">Monthly: {money(MONTHLY_CENTS)} × {MONTHLY_COUNT}</option>
                        <option value="full">Pay in full: {money(TUITION_CENTS)}</option>
                      </select>
                    </div>
                  </div>
                  <div><label>Message to include in the email (optional)</label><textarea name="decision_note" maxLength={2000} /></div>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
                    <input type="checkbox" name="notify" value="1" defaultChecked style={{ width: 20, height: 20 }} /> Email the applicant{a.under_18 ? ' (and their guardian)' : ''}
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn--sm" type="submit" name="decision" value="accept">Accept</button>
                    {a.status === 'new' && <button className="btn btn--ghost btn--sm" type="submit" name="decision" value="waitlist">Waitlist</button>}
                    <button className="btn btn--danger btn--sm" type="submit" name="decision" value="decline">Decline</button>
                  </div>
                </form>
              </details>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(a.status === 'accepted' || a.status === 'declined') && (
                <form action={decideApplication}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn btn--ghost btn--sm" type="submit" name="decision" value="reopen">Move back to New</button>
                </form>
              )}
              <form action={deleteApplication}>
                <input type="hidden" name="id" value={a.id} />
                <button className="btn btn--danger btn--sm" type="submit">Delete</button>
              </form>
            </div>
          </section>
        );
      })}
    </>
  );
}
