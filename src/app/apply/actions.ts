'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { notifyAddress } from '@/lib/consents';
import { isFormat, isPlan, planBlurb, termsFor } from '@/lib/pricing';
import { isValidTimeZone, todayLocal } from '@/lib/schedule';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const none = (v: string) => (v === '' ? null : v);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Whole years between a 'YYYY-MM-DD' birth date and today. */
function ageOn(birth: string, today: string): number {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export async function submitApplication(f: FormData) {
  // Spam traps: a hidden field real people never fill in, and a form that was "filled" in under 2.5 seconds.
  const t = Number(f.get('t'));
  if (str(f, 'company', 100) || !t || Date.now() - t < 2500) redirect('/apply?done=1');

  const formatRaw = str(f, 'format', 10);
  const format = isFormat(formatRaw) ? formatRaw : 'in_person';
  const online = format === 'online';
  const go = (qs: string): never => redirect(`/apply?track=${format}&${qs}`);

  const name = str(f, 'full_name', 120);
  const email = str(f, 'email', 200).toLowerCase();
  const phone = none(str(f, 'phone', 40));
  const birth = str(f, 'birth_date', 10);
  if (name.length < 2) go('err=name');
  if (!EMAIL.test(email)) go('err=email');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) go('err=birth');

  const today = todayLocal();
  const age = ageOn(birth, today);
  if (birth > today || age > 110) go('err=birth');
  if (age < 16) go('err=age');
  const under18 = age < 18;

  const gName = none(str(f, 'guardian_name', 120));
  const gEmail = none(str(f, 'guardian_email', 200).toLowerCase());
  const gPhone = none(str(f, 'guardian_phone', 40));
  if (under18 && (!gName || !gEmail || !EMAIL.test(gEmail))) go('err=guardian');

  const planRaw = str(f, 'plan', 10);
  if (!isPlan(planRaw) || (planRaw === 'monthly' && !termsFor(format).allowMonthly)) go('err=plan');
  const plan = planRaw as 'full' | 'monthly';
  const tzRaw = str(f, 'time_zone', 64);
  if (online && !isValidTimeZone(tzRaw)) go('err=tz');
  const cohortRaw = str(f, 'cohort_id', 40);
  const cohort = /^[0-9a-f-]{36}$/i.test(cohortRaw) ? cohortRaw : null;

  const supabase = await createClient();
  const { error } = await supabase.from('applications').insert({
    full_name: name,
    email,
    phone,
    birth_date: birth,
    under_18: under18,
    guardian_name: under18 ? gName : null,
    guardian_email: under18 ? gEmail : null,
    guardian_phone: under18 ? gPhone : null,
    experience: none(str(f, 'experience', 2000)),
    goals: none(str(f, 'goals', 2000)),
    referral: none(str(f, 'referral', 300)),
    plan,
    cohort_id: cohort,
    format,
    time_zone: online ? tzRaw : null,
    location: online ? none(str(f, 'location', 120)) : null,
  });
  if (error) go('err=save');

  // Best-effort emails: a confirmation for the applicant and an alert for you.
  await Promise.all([
    sendEmail(
      email,
      'We got your Dream Big Academy application',
      `Hi ${name.split(' ')[0]},\n\nThanks for applying to the ${online ? 'online ' : ''}Dream Big Studios Audio Engineering Academy${online ? ' (3 months, live video sessions)' : ''}. We read every application and will email you soon about next steps.${under18 ? '\n\nBecause you’re under 18, we’ll also email your parent or guardian a consent form to sign.' : ''}`,
    ),
    sendEmail(
      notifyAddress(),
      `New ${online ? 'ONLINE ' : ''}Academy application: ${name}`,
      `${name} (${email}${phone ? `, ${phone}` : ''}) just applied for the ${online ? `online-only course (${tzRaw}, wants ${planBlurb(plan, 'online')})` : 'in-person course'}${under18 ? ' — under 18, guardian consent needed' : ''}.\n\nReview it under Applications in the Academy app.`,
    ),
  ]);

  redirect(`/apply?track=${format}&done=1`);
}
