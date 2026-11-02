const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.dreambigctx.com').replace(/\/$/, '');
export const siteUrl = SITE;

/** Sends through Resend when RESEND_API_KEY is set; otherwise quietly does nothing. */
export const emailConfigured = () => !!process.env.RESEND_API_KEY;

/** Sends one separate email to each person, so nobody sees anyone else's address. Returns how many went out. */
export async function sendEmailEach(to: string[], subject: string, text: string): Promise<number> {
  const unique = [...new Set(to.map((e) => e.toLowerCase()))];
  let sent = 0;
  for (let i = 0; i < unique.length; i += 5) {
    const results = await Promise.all(unique.slice(i, i + 5).map((e) => sendEmail(e, subject, text)));
    sent += results.filter(Boolean).length;
  }
  return sent;
}

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
