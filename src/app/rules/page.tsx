import { redirect } from 'next/navigation';
import { requireProfileRaw } from '@/lib/auth';
import { RULES, RULES_ONLINE, RULES_VERSION } from '@/lib/rules';
import AuthShell from '@/components/AuthShell';
import { acceptRules } from './actions';

export const metadata = { title: 'Studio rules' };
export const dynamic = 'force-dynamic';

const ERR: Record<string, string> = {
  agree: 'Tick the box and type your full name to continue.',
  guardian: 'Students under 18 need a parent or guardian to agree too. Tick the guardian box.',
  save: 'That didn’t save. Please try again.',
};

export default async function Rules({ searchParams }: { searchParams: Promise<{ err?: string; view?: string }> }) {
  const { supabase, profile } = await requireProfileRaw();
  const q = await searchParams;
  if (profile.role !== 'student') redirect('/');
  if (!profile.username) redirect('/welcome');
  const done = profile.rules_version === RULES_VERSION;
  const view = q.view === '1';
  // Online students see the rules for live video sessions instead of the studio-floor rules.
  const { data: co } = profile.cohort_id ? await supabase.from('cohorts').select('format').eq('id', profile.cohort_id).maybeSingle() : { data: null };
  const rules = co?.format === 'online' ? RULES_ONLINE : RULES;
  if (done && !view) redirect('/');

  return (
    <AuthShell>
      <div className="card stack" style={{ maxWidth: 560 }}>
        <div>
          <p className="eyebrow">Dream Big Studios Academy</p>
          <h1 className="page-title">{co?.format === 'online' ? 'Class rules' : 'Studio rules'}</h1>
          <p className="muted">{done ? 'The rules you agreed to.' : 'Please read these and sign to continue.'}</p>
        </div>
        {q.err && <div className="notice notice--err" role="alert">{ERR[q.err] ?? ERR.save}</div>}
        <ol className="rules">
          {rules.map((r) => (
            <li key={r.title}><strong>{r.title}.</strong> {r.text}</li>
          ))}
        </ol>
        {done ? (
          <>
            <p className="small muted" style={{ margin: 0 }}>
              Signed by {profile.rules_signed_name} on {profile.rules_accepted_at ? new Date(profile.rules_accepted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}.
            </p>
            <a className="btn btn--ghost" href="/profile">Back to profile</a>
          </>
        ) : (
          <form action={acceptRules} className="stack">
            <label className="check"><input type="checkbox" name="agree" value="1" required /> I have read the studio rules and agree to follow them.</label>
            <label className="check"><input type="checkbox" name="under_18" value="1" /> I am under 18.</label>
            <label className="check"><input type="checkbox" name="guardian" value="1" /> My parent or guardian has read these rules and agrees to them (required if you’re under 18).</label>
            <div>
              <label htmlFor="signed_name">Type your full name to sign</label>
              <input id="signed_name" name="signed_name" type="text" required minLength={2} maxLength={120} autoComplete="name" />
            </div>
            <button className="btn" type="submit" style={{ width: '100%' }}>I agree, continue</button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
