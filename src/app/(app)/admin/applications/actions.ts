'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { sendEmail, siteUrl } from '@/lib/email';
import { ensureConsent, sendConsentEmail } from '@/lib/consents';
import { MONTHLY_CENTS, MONTHLY_COUNT, PLAN_LABEL, TUITION_CENTS, isPlan, money } from '@/lib/pricing';
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
    const planRaw = str(f, 'plan', 10);
    const plan = isPlan(planRaw) ? planRaw : app.plan;
    const { error: invErr } = await supabase.from('invites').upsert({ email: app.email, full_name: app.full_name, cohort_id: cohort, plan }, { onConflict: 'email' });
    if (invErr) redirect('/admin/applications?err=invite');
    await supabase.from('applications').update({ status: 'accepted', decided_at: new Date().toISOString(), decision_note: note, cohort_id: cohort, plan }).eq('id', id);

    let consent: GuardianConsent | null = null;
    if (app.under_18) {
      consent = await ensureConsent(supabase, { studentEmail: app.email, studentName: app.full_name, guardianName: app.guardian_name ?? '', guardianEmail: app.guardian_email, applicationId: app.id });
      if (consent && notify) await sendConsentEmail(supabase, consent);
    }
    if (notify) {
      const price = plan === 'full' ? `${money(TUITION_CENTS)} paid in full` : `${money(MONTHLY_CENTS)} a month for ${MONTHLY_COUNT} months`;
      await sendEmail(
        app.email,
        'You’re in: Dream Big Academy',
        `Hi ${first},\n\nCongratulations, you’ve been accepted into the Dream Big Studios Audio Engineering Academy!\n\nTuition plan: ${plan ? `${PLAN_LABEL[plan]} (${price})` : price}.${note ? `\n\n${note}` : ''}${app.under_18 ? '\n\nBecause you’re under 18, we emailed your parent or guardian a consent form. It needs to be signed before you start.' : ''}\n\nTo get started, go to the link below, enter this email address and tap “Email me a link”. The first time, you’ll pick a username and password:\n\n${siteUrl()}/login`,
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
