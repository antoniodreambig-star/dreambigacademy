'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    <div className="login">
      <div className="card stack">
        <div>
          <p className="eyebrow">Dream Big Studios</p>
          <h1 className="page-title">Academy sign in</h1>
          <p className="muted">No password needed. We email you a sign-in link.</p>
        </div>
        {error && <div className="notice notice--err" role="alert">{error}</div>}
        {!sent ? (
          <form onSubmit={send} className="stack">
            <div>
              <label htmlFor="email">Your email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn" disabled={busy} type="submit" style={{ width: '100%' }}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
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
    </div>
  );
}
