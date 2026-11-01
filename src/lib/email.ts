const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.dreambigctx.com').replace(/\/$/, '');
export const siteUrl = SITE;

/** Sends through Resend when RESEND_API_KEY is set; otherwise quietly does nothing. */
export async function sendEmail(to: string | string[], subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Dream Big Academy <academy@dreambigctx.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        text: `${text}\n\n— Dream Big Studios Academy\n${SITE()}`,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
