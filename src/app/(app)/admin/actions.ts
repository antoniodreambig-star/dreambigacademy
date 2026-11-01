'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { sendEmail, siteUrl } from '@/lib/email';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const none = (v: string) => (v === '' ? null : v);

export async function createCohort(f: FormData) {
  const { supabase } = await requireInstructor();
  const name = str(f, 'name', 80);
  const start = str(f, 'start_date', 10);
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(start)) redirect('/admin/cohorts?err=cohort');
  const day = new Date(`${start}T12:00:00Z`).getUTCDay();
  const { error } = await supabase.from('cohorts').insert({
    name,
    start_date: start,
    class_weekday: day,
    class_start: str(f, 'class_start', 5) || '10:00',
    class_hours: Number(str(f, 'class_hours', 4)) || 3,
  });
  if (error) redirect('/admin/cohorts?err=cohort');
  revalidatePath('/admin/cohorts');
  redirect('/admin/cohorts?ok=cohort');
}

export async function updateCohort(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'id', 40);
  const start = str(f, 'start_date', 10);
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(start)) redirect('/admin/cohorts?err=cohort');
  const { error } = await supabase
    .from('cohorts')
    .update({
      name: str(f, 'name', 80),
      start_date: start,
      class_weekday: new Date(`${start}T12:00:00Z`).getUTCDay(),
      class_start: str(f, 'class_start', 5) || '10:00',
      class_hours: Number(str(f, 'class_hours', 4)) || 3,
    })
    .eq('id', id);
  if (error) redirect('/admin/cohorts?err=cohort');
  revalidatePath('/', 'layout');
  redirect('/admin/cohorts?ok=updated');
}

export async function addInvite(f: FormData) {
  const { supabase } = await requireInstructor();
  const email = str(f, 'email', 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect('/admin/cohorts?err=email');
  const cohort = none(str(f, 'cohort_id', 40));
  const name = none(str(f, 'full_name', 120));
  const { error } = await supabase.from('invites').upsert({ email, full_name: name, cohort_id: cohort }, { onConflict: 'email' });
  if (error) redirect('/admin/cohorts?err=email');
  if (f.get('notify') === '1') {
    await sendEmail(
      email,
      'You’re enrolled in the Dream Big Academy',
      `Hi ${name || 'there'},\n\nYour spot in the Dream Big Studios Audio Engineering Academy is set up. Sign in with this email address (no password needed):\n\n${siteUrl()}/login\n\nYou'll see your class schedule, homework due dates and a way to message your instructor.`,
    );
  }
  revalidatePath('/admin/cohorts');
  redirect('/admin/cohorts?ok=invite');
}

export async function removeInvite(f: FormData) {
  const { supabase } = await requireInstructor();
  await supabase.from('invites').delete().eq('email', str(f, 'email', 200));
  revalidatePath('/admin/cohorts');
  redirect('/admin/cohorts');
}

export async function assignStudent(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'id', 40);
  await supabase.from('profiles').update({ cohort_id: none(str(f, 'cohort_id', 40)), consent_signed: f.get('consent_signed') === '1' }).eq('id', id);
  revalidatePath(`/admin/students/${id}`);
  revalidatePath('/admin');
  redirect(`/admin/students/${id}?ok=1`);
}

export async function saveFeedback(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'student_id', 40);
  const week = Number(f.get('week'));
  await supabase.from('submissions').update({ feedback: none(str(f, 'feedback', 3000)) }).eq('student_id', id).eq('week', week);
  revalidatePath(`/admin/students/${id}`);
  redirect(`/admin/students/${id}?ok=1#w${week}`);
}

export async function saveWeek(f: FormData) {
  const { supabase } = await requireInstructor();
  const week = Number(f.get('week'));
  if (!Number.isInteger(week) || week < 1 || week > 26) redirect('/admin/curriculum');
  const { error } = await supabase
    .from('weeks')
    .update({
      title: str(f, 'title', 120) || 'Outline coming soon',
      phase: str(f, 'phase', 120),
      in_class: str(f, 'in_class'),
      lab: str(f, 'lab'),
      homework: str(f, 'homework'),
      homework_due_days: Math.max(0, Math.min(30, Number(f.get('homework_due_days')) || 0)),
    })
    .eq('week', week);
  revalidatePath('/classes');
  revalidatePath('/schedule');
  redirect(`/admin/curriculum?${error ? 'err=1' : 'ok=' + week}#w${week}`);
}

export async function postAnnouncement(f: FormData) {
  const { supabase } = await requireInstructor();
  const title = str(f, 'title', 140);
  const body = str(f, 'body', 4000);
  if (!title || !body) redirect('/admin/announcements?err=1');
  const cohort = none(str(f, 'cohort_id', 40));
  await supabase.from('announcements').insert({ title, body, cohort_id: cohort });
  if (f.get('notify') === '1') {
    const q = supabase.from('profiles').select('email').eq('role', 'student');
    const { data } = await (cohort ? q.eq('cohort_id', cohort) : q);
    const to = (data ?? []).map((p) => p.email as string);
    if (to.length) await sendEmail(to, `Academy: ${title}`, body);
  }
  revalidatePath('/', 'layout');
  redirect('/admin/announcements?ok=1');
}

export async function deleteAnnouncement(f: FormData) {
  const { supabase } = await requireInstructor();
  await supabase.from('announcements').delete().eq('id', str(f, 'id', 40));
  revalidatePath('/', 'layout');
  redirect('/admin/announcements');
}
