'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth';
import { ensureConsent, sendConsentEmail } from '@/lib/consents';
import type { Profile } from '@/lib/types';

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Creates (or reuses) the guardian consent request and emails the guardian their link.
 * Works for a student with an account (student_id) or an accepted applicant who hasn't signed up yet (student_email).
 */
export async function requestConsent(f: FormData) {
  const { supabase } = await requireInstructor();
  const id = str(f, 'student_id', 40);
  const gName = str(f, 'guardian_name', 120);
  const gEmail = str(f, 'guardian_email', 200).toLowerCase();

  let st: Profile | null = null;
  if (id) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).eq('role', 'student').single();
    st = data as Profile | null;
    if (!st) redirect('/admin');
  }
  const email = (st?.email ?? str(f, 'student_email', 200)).toLowerCase();
  const name = st?.full_name || str(f, 'student_name', 120) || email;
  const base = id ? `/admin/students/${id}` : '/admin/applications?s=accepted';
  const anchor = id ? '#consent' : '';
  if (!EMAIL.test(email) || (gEmail && !EMAIL.test(gEmail))) redirect(`${base}${id ? '?' : '&'}err=gemail${anchor}`);

  const c = await ensureConsent(supabase, { studentEmail: email, studentName: name, guardianName: gName, guardianEmail: gEmail || null });
  if (!c) redirect(`${base}${id ? '?' : '&'}err=consent${anchor}`);
  // Keep the profile's parent fields in step so the About card shows the same details.
  if (st && (gName || gEmail)) await supabase.from('profiles').update({ parent_name: gName || st.parent_name, parent_email: gEmail || st.parent_email }).eq('id', st.id);

  const sent = c.status === 'pending' && c.guardian_email ? await sendConsentEmail(supabase, c) : false;
  revalidatePath(id ? base : '/admin/applications');
  redirect(`${base}${id ? '?' : '&'}ok=${id ? '1' : 'consent'}${sent || c.status === 'signed' ? '' : '&mail=off'}${anchor}`);
}
