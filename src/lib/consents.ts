import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, siteUrl } from '@/lib/email';
import type { GuardianConsent } from '@/lib/types';

export const consentLink = (token: string) => `${siteUrl()}/consent/${token}`;

/** Where "new application" and "consent signed" alerts go. */
export const notifyAddress = () => process.env.ADMIN_NOTIFY_EMAIL || 'studio@dreambigctx.com';

/**
 * Finds the consent request for a student (by email) or creates one.
 * A pending request gets its guardian details refreshed; a signed one is left untouched.
 */
export async function ensureConsent(
  supabase: SupabaseClient,
  p: { studentEmail: string; studentName: string; guardianName: string; guardianEmail: string | null; applicationId?: string | null },
): Promise<GuardianConsent | null> {
  const email = p.studentEmail.toLowerCase();
  const { data: existing } = await supabase
    .from('guardian_consents')
    .select('*')
    .eq('student_email', email)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    const row = existing as GuardianConsent;
    if (row.status === 'pending') {
      const { data } = await supabase
        .from('guardian_consents')
        .update({ guardian_name: p.guardianName || row.guardian_name, guardian_email: p.guardianEmail || row.guardian_email, student_name: p.studentName || row.student_name })
        .eq('id', row.id)
        .select('*')
        .single();
      return (data as GuardianConsent) ?? row;
    }
    return row;
  }
  const { data } = await supabase
    .from('guardian_consents')
    .insert({
      student_email: email,
      student_name: p.studentName,
      guardian_name: p.guardianName,
      guardian_email: p.guardianEmail,
      application_id: p.applicationId ?? null,
    })
    .select('*')
    .single();
  return (data as GuardianConsent) ?? null;
}

/** Emails the guardian their private link. Returns true if an email went out. */
export async function sendConsentEmail(supabase: SupabaseClient, c: GuardianConsent): Promise<boolean> {
  if (!c.guardian_email || c.status === 'signed') return false;
  const ok = await sendEmail(
    c.guardian_email,
    `Parent/guardian consent needed: ${c.student_name || 'your student'} at Dream Big Academy`,
    `Hello${c.guardian_name ? ` ${c.guardian_name}` : ''},\n\n${c.student_name || 'Your student'} has applied to the Dream Big Studios Audio Engineering Academy. Because students under 18 need a parent or guardian’s consent, please read and sign the consent form here (it takes about two minutes):\n\n${consentLink(c.token)}\n\nThis link is private to you. If you didn’t expect this email, you can ignore it.`,
  );
  if (ok) await supabase.from('guardian_consents').update({ last_sent_at: new Date().toISOString() }).eq('id', c.id);
  return ok;
}
