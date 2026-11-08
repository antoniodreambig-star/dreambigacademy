'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor, requireOwner } from '@/lib/auth';
import { sendEmail, siteUrl } from '@/lib/email';
import { ensureConsent, sendConsentEmail } from '@/lib/consents';
import { PLAN_LABEL, isFormat, isPlan, planBlurb, termsFor } from '@/lib/pricing';
import { daysBetween, isValidTimeZone, todayLocal } from '@/lib/schedule';
import { ENROLL_CUTOFF_DAYS, MODULES, isModule } from '@/lib/modules';
import type { Application, GuardianConsent } from '@/lib/types';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const none = (v: string) => (v === '' ? null : v);

export async function decideApplication(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'id', 40);
  const decision = str(f, 'decision', 10);
  const notify = f.get('notify') === '1';
  const note = none(str(f, 'decision_note', 2000));
  const { data } = await supabase.from('applications').select('*').eq('id', id).single();
  const app = data as Application | null;
  if (!app || !['accept', 'waitlist', 'decline', 'reopen'].includes(decision)) redirect('/admin/applications?err=1');
  const first = app.full_name.split(' ')[0] || 'there';

  if (decision === 'accept') {
    const cohort = none(str(f, 'cohort_id', 40));
    // TWC short-course exemption: no enrolling within 14 days of the module's start (students must have the course description and refund policy by then).
    if (cohort) {
      const { data: co } = await supabase.from('cohorts').select('start_date').eq('id', cohort).maybeSingle();
      if (co?.start_date && daysBetween(todayLocal(), co.start_date as string) < ENROLL_CUTOFF_DAYS) redirect('/admin/applications?err=late');
    }
    const planRaw = str(f, 'plan', 10);
    const format = app.format;
    // The monthly plan may not be offered for the online course.
    const picked = isPlan(planRaw) ? planRaw : app.plan;
    const plan = picked === 'monthly' && !termsFor(format).allowMonthly ? 'full' : picked;
    const { error: invErr } = await supabase.from('invites').upsert({ email: app.email, full_name: app.full_name, cohort_id: cohort, plan, format }, { onConflict: 'email' });
    if (invErr) redirect('/admin/applications?err=invite');
    await supabase.from('applications').update({ status: 'accepted', decided_at: new Date().toISOString(), decision_note: note, cohort_id: cohort, plan }).eq('id', id);

    let consent: GuardianConsent | null = null;
    if (app.under_18) {
      consent = await ensureConsent(supabase, { studentEmail: app.email, studentName: app.full_name, guardianName: app.guardian_name ?? '', guardianEmail: app.guardian_email, applicationId: app.id, format });
      if (consent && notify) await sendConsentEmail(supabase, consent);
    }
    if (notify) {
      const price = planBlurb(plan ?? 'full', format);
      const online = format === 'online';
      await sendEmail(
        app.email,
        'You’re in: Dream Big Academy',
        `Hi ${first},\n\nCongratulations, you’ve been accepted into ${app.module ? `Module ${MODULES[app.module].letter}: ${MODULES[app.module].name}` : `the ${online ? 'online ' : ''}Dream Big Studios Audio Engineering Academy`} (${online ? 'online' : 'in person'}) at the Dream Big Studios Audio Engineering Academy!\n\nTuition for this module: ${plan ? `${PLAN_LABEL[plan]} (${price})` : price}.${note ? `\n\n${note}` : ''}${app.under_18 ? '\n\nBecause you’re under 18, we emailed your parent or guardian a consent form. It needs to be signed before you start.' : ''}\n\nTo get started, go to the link below, enter this email address and tap “Email me a link”. The first time, you’ll pick a username and password:\n\n${siteUrl()}/login${online ? '\n\nOnce you’re in, open the “Set up” page. It has a checklist so you’re ready for the first live session, and you’ll find the meeting link, your schedule in your own time zone, and recordings of every session.' : ''}`,
      );
    }
  } else if (decision === 'waitlist') {
    await supabase.from('applications').update({ status: 'waitlist', decided_at: new Date().toISOString(), decision_note: note }).eq('id', id);
    if (notify) await sendEmail(app.email, 'Your Dream Big Academy application', `Hi ${first},\n\nThanks for applying. Our current class is full, so we’ve put you on the waitlist and will email you as soon as a spot opens up.${note ? `\n\n${note}` : ''}`);
  } else if (decision === 'decline') {
    await supabase.from('applications').update({ status: 'declined', decided_at: new Date().toISOString(), decision_note: note }).eq('id', id);
    if (notify) await sendEmail(app.email, 'Your Dream Big Academy application', `Hi ${first},\n\nThank you for your interest in the Academy. We aren’t able to offer you a spot in this class.${note ? `\n\n${note}` : ''}\n\nWe’d love to hear from you again for a future class.`);
  } else {
    await supabase.from('applications').update({ status: 'new', decided_at: null, decision_note: null }).eq('id', id);
  }
  revalidatePath('/admin/applications');
  revalidatePath('/', 'layout');
  redirect(`/admin/applications?s=${decision === 'reopen' ? 'new' : decision === 'accept' ? 'accepted' : decision === 'waitlist' ? 'waitlist' : 'declined'}&ok=${decision}`);
}

export async function deleteApplication(f: FormData) {
  const { supabase } = await requireInstructor();
  await supabase.from('applications').delete().eq('id', str(f, 'id', 40));
  revalidatePath('/admin/applications');
  revalidatePath('/', 'layout');
  redirect('/admin/applications?s=all&ok=deleted');
}

const ageOn = (birth: string) => {
  const t = new Date();
  const b = new Date(`${birth}T12:00:00Z`);
  return t.getFullYear() - b.getUTCFullYear() - (t.getMonth() < b.getUTCMonth() || (t.getMonth() === b.getUTCMonth() && t.getDate() < b.getUTCDate()) ? 1 : 0);
};

/** Main account only: add a person yourself and give them a label (New, Waitlist, Accepted or Declined). */
export async function addStudent(f: FormData) {
  const { supabase } = await requireOwner();
  const back = '/admin/applications';
  const name = str(f, 'full_name', 120);
  const email = str(f, 'email', 200).toLowerCase();
  if (name.length < 2) redirect(`${back}?err=name`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(`${back}?err=email`);

  const dob = str(f, 'birth_date', 10);
  let birth: string | null = null;
  let under18 = false;
  if (dob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) redirect(`${back}?err=dob`);
    const a = ageOn(dob);
    if (a < 16) redirect(`${back}?err=age`);
    birth = dob;
    under18 = a < 18;
  }

  const { data: dupe } = await supabase.from('applications').select('id').eq('email', email).limit(1);
  if (dupe && dupe.length > 0) redirect(`${back}?s=all&err=dupe`);

  const planRaw = str(f, 'plan', 10);
  const plan = isPlan(planRaw) ? planRaw : null;
  const cohort = none(str(f, 'cohort_id', 40));
  const formatRaw = str(f, 'format', 10);
  const format = isFormat(formatRaw) ? formatRaw : 'in_person';
  const moduleRaw = str(f, 'module', 1);
  const { data, error } = await supabase
    .from('applications')
    .insert({
      module: isModule(moduleRaw) ? moduleRaw : null,
      full_name: name,
      email,
      phone: none(str(f, 'phone', 40)),
      birth_date: birth,
      under_18: under18,
      guardian_name: none(str(f, 'guardian_name', 120)),
      guardian_email: none(str(f, 'guardian_email', 200).toLowerCase()),
      guardian_phone: none(str(f, 'guardian_phone', 40)),
      referral: 'Added by instructor',
      plan,
      cohort_id: cohort,
      format,
      time_zone: format === 'online' && isValidTimeZone(str(f, 'time_zone', 64)) ? str(f, 'time_zone', 64) : null,
    })
    .select('id')
    .single();
  if (error || !data) redirect(`${back}?err=add`);

  // Waitlist / Accept / Decline run through the same steps as the Decide buttons (invite list, consent link, emails).
  const label = str(f, 'label', 10);
  if (['accept', 'waitlist', 'decline'].includes(label)) {
    const d = new FormData();
    d.set('id', data.id as string);
    d.set('decision', label);
    if (cohort) d.set('cohort_id', cohort);
    if (plan) d.set('plan', plan);
    const note = str(f, 'decision_note', 2000);
    if (note) d.set('decision_note', note);
    if (f.get('notify') === '1') d.set('notify', '1');
    return decideApplication(d);
  }
  revalidatePath(back);
  revalidatePath('/', 'layout');
  redirect(`${back}?s=new&ok=added`);
}
