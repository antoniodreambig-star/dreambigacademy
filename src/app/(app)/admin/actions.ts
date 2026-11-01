'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { sendEmail, siteUrl } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';

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
      `Hi ${name || 'there'},\n\nYour spot in the Dream Big Studios Audio Engineering Academy is set up. Go to the link below, enter this email address and tap “Email me a link”. The first time, you’ll then pick a username and password for future sign-ins:\n\n${siteUrl()}/login\n\nYou'll see your class schedule, homework due dates and a way to message your instructor.`,
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
  const text = none(str(f, 'feedback', 3000));
  const { data: before } = await supabase.from('submissions').select('feedback').eq('student_id', id).eq('week', week).single();
  await supabase.from('submissions').update({ feedback: text }).eq('student_id', id).eq('week', week);
  // Email the student when feedback is new or changed.
  if (text && text !== (before?.feedback ?? null)) {
    const admin = createAdminClient();
    const { data: st } = admin ? await admin.from('profiles').select('email, full_name').eq('id', id).single() : { data: null };
    if (st?.email) {
      await sendEmail(
        st.email as string,
        `Feedback on your Week ${week} homework`,
        `Hi ${((st.full_name as string) || '').split(' ')[0] || 'there'},\n\nYour instructor left feedback on your Week ${week} homework:\n\n${text}\n\nSee it here: ${siteUrl()}/schedule#w${week}`,
      );
    }
  }
  revalidatePath(`/admin/students/${id}`);
  redirect(`/admin/students/${id}?ok=1#w${week}`);
}

export async function saveNote(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'student_id', 40);
  await supabase.from('instructor_notes').upsert({ student_id: id, body: str(f, 'body', 5000), updated_at: new Date().toISOString() }, { onConflict: 'student_id' });
  revalidatePath(`/admin/students/${id}`);
  redirect(`/admin/students/${id}?ok=1#notes`);
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

export async function saveAttendance(f: FormData) {
  const { supabase } = await requireInstructor();
  const cohort = str(f, 'cohort', 40);
  const week = Number(f.get('week'));
  if (!Number.isInteger(week) || week < 1 || week > 26) redirect('/admin/attendance');
  const rows: { student_id: string; week: number; status: string; note: string | null; marked_at: string }[] = [];
  for (const [key, val] of f.entries()) {
    if (!key.startsWith('s_') || typeof val !== 'string') continue;
    if (!['present', 'late', 'absent', 'excused'].includes(val)) continue;
    const id = key.slice(2);
    rows.push({ student_id: id, week, status: val, note: none(str(f, `n_${id}`, 200)), marked_at: new Date().toISOString() });
  }
  if (rows.length) await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,week' });
  revalidatePath('/admin/attendance');
  revalidatePath('/classes');
  redirect(`/admin/attendance?cohort=${encodeURIComponent(cohort)}&week=${week}&ok=1`);
}
