import AuthShell from '@/components/AuthShell';
import { createClient } from '@/lib/supabase/server';
import { RULES } from '@/lib/rules';
import { CONSENT_TERMS, MEDIA_RELEASE, PROGRAM_SUMMARY } from '@/lib/consent';
import { signConsent } from './actions';

export const metadata = { title: 'Parent / guardian consent · Dream Big Academy', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERR: Record<string, string> = {
  checks: 'Please tick all four required boxes.',
  name: 'Type your full name and your relationship to the student.',
  contact: 'Please add your phone number and an emergency contact (name and phone).',
  save: 'That didn’t save. Please try again, or contact the studio.',
};

interface Info {
  student_name: string;
  guardian_name: string;
  status: 'pending' | 'signed';
  signed_name: string | null;
  signed_at: string | null;
}

export default async function Consent({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ err?: string; done?: string }> }) {
  const { token } = await params;
  const q = await searchParams;

  let info: Info | null = null;
  if (UUID.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc('consent_lookup', { p_token: token });
    info = ((data as Info[] | null) ?? [])[0] ?? null;
  }

  if (!info) {
    return (
      <AuthShell>
        <div className="card stack" style={{ maxWidth: 560 }}>
          <h1 className="page-title">Link not found</h1>
          <p>This consent link isn’t valid. Please use the link from your email, or contact Dream Big Studios.</p>
        </div>
      </AuthShell>
    );
  }

  const student = info.student_name || 'the student';

  if (info.status === 'signed') {
    return (
      <AuthShell>
        <div className="card stack" style={{ maxWidth: 560 }}>
          <div>
            <p className="eyebrow">Dream Big Studios Academy</p>
            <h1 className="page-title">{q.done ? 'Thank you' : 'Already signed'}</h1>
          </div>
          <p>
            Consent for <strong>{student}</strong> was signed by <strong>{info.signed_name}</strong>
            {info.signed_at ? ` on ${new Date(info.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}. You don’t need to do anything else.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="card stack" style={{ maxWidth: 560 }}>
        <div>
          <p className="eyebrow">Dream Big Studios Academy</p>
          <h1 className="page-title">Parent / guardian consent</h1>
          <p className="muted">For: <strong>{student}</strong></p>
        </div>
        {q.err && <div className="notice notice--err" role="alert">{ERR[q.err] ?? ERR.save}</div>}
        <p style={{ margin: 0 }}>{PROGRAM_SUMMARY}</p>

        <h2 style={{ marginBottom: 0 }}>Studio rules</h2>
        <ol className="rules">
          {RULES.map((r) => (
            <li key={r.title}><strong>{r.title}.</strong> {r.text}</li>
          ))}
        </ol>

        <h2 style={{ marginBottom: 0 }}>What you’re agreeing to</h2>
        <ul className="rules" style={{ paddingLeft: 20 }}>
          {CONSENT_TERMS.map((t) => (
            <li key={t.title}><strong>{t.title}.</strong> {t.text}</li>
          ))}
        </ul>

        <form action={signConsent} className="stack">
          <input type="hidden" name="token" value={token} />
          {[
            ['is_guardian', `I am the parent or legal guardian of ${student}.`],
            ['permission', 'I give permission for my child to take part in the Academy.'],
            ['rules', 'I have read and agree to the studio rules above.'],
            ['risks', 'I have read and accept the safety, equipment and emergency terms above.'],
          ].map(([name, label]) => (
            <label key={name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 600 }}>
              <input type="checkbox" name={name} value="1" required style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
              {label}
            </label>
          ))}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 500 }}>
            <input type="checkbox" name="media_ok" value="1" style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
            {MEDIA_RELEASE}
          </label>

          <div className="row">
            <div><label htmlFor="signed_name">Your full name (this is your signature)</label><input id="signed_name" name="signed_name" type="text" required defaultValue="" autoComplete="name" /></div>
            <div><label htmlFor="relationship">Relationship to student</label><input id="relationship" name="relationship" type="text" required placeholder="Mother, father, guardian…" /></div>
          </div>
          <div><label htmlFor="phone">Your phone</label><input id="phone" name="phone" type="tel" required autoComplete="tel" /></div>
          <div className="row">
            <div><label htmlFor="emergency_name">Emergency contact name</label><input id="emergency_name" name="emergency_name" type="text" required /></div>
            <div><label htmlFor="emergency_phone">Emergency contact phone</label><input id="emergency_phone" name="emergency_phone" type="tel" required /></div>
          </div>
          <button className="btn" type="submit" style={{ width: '100%' }}>Sign consent</button>
          <p className="small muted" style={{ margin: 0 }}>Typing your name and submitting counts as your electronic signature. The date and time are recorded.</p>
        </form>
      </div>
    </AuthShell>
  );
}
