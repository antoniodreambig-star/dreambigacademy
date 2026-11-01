import { redirect } from 'next/navigation';
import { requireProfileRaw } from '@/lib/auth';
import { saveCredentials } from './actions';

export const metadata = { title: 'Create your login' };
export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  username: 'Usernames are 3–24 characters: letters, numbers, dots or underscores.',
  taken: 'That username is already taken. Try another.',
  short: 'Your password needs at least 8 characters.',
  match: 'The two passwords don’t match.',
  same: 'Pick a password different from your current one.',
  password: 'We couldn’t set that password. Try a longer or less common one.',
  save: 'That didn’t save. Please try again.',
};

export default async function Welcome({ searchParams }: { searchParams: Promise<{ edit?: string; err?: string }> }) {
  const { profile } = await requireProfileRaw();
  const q = await searchParams;
  const edit = q.edit === '1';
  if (profile.username && !edit) redirect('/');

  return (
    <div className="login">
      <div className="card stack">
        <div>
          <p className="eyebrow">Dream Big Studios</p>
          <h1 className="page-title">{edit ? 'Username & password' : 'Create your login'}</h1>
          <p className="muted">
            {edit
              ? 'Change your username, or set a new password. Leave the password blank to keep your current one.'
              : 'One last step. Pick a username and password so you can sign in quickly next time. The email link still works too.'}
          </p>
        </div>
        {q.err && <div className="notice notice--err" role="alert">{ERRORS[q.err] ?? ERRORS.save}</div>}
        <form action={saveCredentials} className="stack">
          <input type="hidden" name="edit" value={edit ? '1' : '0'} />
          <div>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]{3,24}" autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={profile.username ?? ''} />
            <p className="small muted" style={{ margin: '6px 0 0' }}>Letters, numbers, dots and underscores.</p>
          </div>
          <div>
            <label htmlFor="password">{edit ? 'New password (optional)' : 'Password'}</label>
            <input id="password" name="password" type="password" required={!edit} minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" required={!edit} minLength={8} autoComplete="new-password" />
            <p className="small muted" style={{ margin: '6px 0 0' }}>At least 8 characters.</p>
          </div>
          <button className="btn" type="submit" style={{ width: '100%' }}>{edit ? 'Save' : 'Save and continue'}</button>
        </form>
      </div>
    </div>
  );
}
