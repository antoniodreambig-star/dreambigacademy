'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { passwordSignIn } from './actions';
import AuthShell from '@/components/AuthShell';

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [ident, setIdent] = useState('');
  const [pw, setPw] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signInPw(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await passwordSignIn(ident, pw);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.replace('/');
    router.refresh();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setError(
        /database error|not.?enrolled/i.test(error.message)
          ? 'That email isn’t enrolled in the Academy yet. Use the email you gave us, or text the studio.'
          : error.message,
      );
      return;
    }
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) return setError('That code didn’t work. Check it and try again, or request a new one.');
    router.replace('/');
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="card stack">
        <div>
          <p className="eyebrow">Dream Big Studios</p>
          <h1 className="page-title">Academy sign in</h1>
          <p className="muted">
            {mode === 'password'
              ? 'Sign in with your username and password.'
              : 'We email you a sign-in link. First time here? Use this, then you’ll pick a username and password.'}
          </p>
        </div>
        {error && <div className="notice notice--err" role="alert">{error}</div>}
        {mode === 'password' ? (
          <form onSubmit={signInPw} className="stack">
            <div>
              <label htmlFor="ident">Username or email</label>
              <input id="ident" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} value={ident} onChange={(e) => setIdent(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pw">Password</label>
              <input id="pw" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <button className="btn" disabled={busy} type="submit" style={{ width: '100%' }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setMode('link'); setError(''); }}>
              First time, or forgot your password? Email me a link
            </button>
          </form>
        ) : !sent ? (
          <form onSubmit={send} className="stack">
            <div>
              <label htmlFor="email">Your email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn" disabled={busy} type="submit" style={{ width: '100%' }}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setMode('password'); setError(''); }}>
              Back to username &amp; password
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="stack">
            <div className="notice notice--ok">Check your email. Tap the link, or type the 6-digit code below.</div>
            <div>
              <label htmlFor="code">6-digit code</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required value={code} onChange={(e) => setCode(e.target.value)} type="text" />
            </div>
            <button className="btn" disabled={busy} type="submit" style={{ width: '100%' }}>
              {busy ? 'Checking…' : 'Sign in'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setSent(false); setCode(''); }}>
              Use a different email
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
