'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { notifyAddress } from '@/lib/consents';
import { CONSENT_VERSION } from '@/lib/consent';

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function signConsent(f: FormData) {
  const token = str(f, 'token', 40);
  if (!UUID.test(token)) redirect('/login');
  const back = `/consent/${token}`;

  const checked = ['is_guardian', 'permission', 'rules', 'risks'].every((k) => f.get(k) === '1');
  const name = str(f, 'signed_name', 120);
  const relationship = str(f, 'relationship', 60);
  const phone = str(f, 'phone', 40);
  const eName = str(f, 'emergency_name', 120);
  const ePhone = str(f, 'emergency_phone', 40);
  if (!checked) redirect(`${back}?err=checks`);
  if (name.length < 2 || !relationship) redirect(`${back}?err=name`);
  if (!phone || !eName || !ePhone) redirect(`${back}?err=contact`);

  const supabase = await createClient();
  const { data: info } = await supabase.rpc('consent_lookup', { p_token: token });
  const { data: ok, error } = await supabase.rpc('consent_sign', {
    p_token: token,
    p_signed_name: name,
    p_relationship: relationship,
    p_phone: phone,
    p_emergency_name: eName,
    p_emergency_phone: ePhone,
    p_media_ok: f.get('media_ok') === '1',
    p_version: CONSENT_VERSION,
  });
  if (error || !ok) redirect(`${back}?err=save`);

  const studentName = (info as { student_name: string }[] | null)?.[0]?.student_name || 'a student';
  await sendEmail(notifyAddress(), `Guardian consent signed: ${studentName}`, `${name} (${relationship}) signed the parent/guardian consent for ${studentName}.`);
  redirect(`${back}?done=1`);
}
