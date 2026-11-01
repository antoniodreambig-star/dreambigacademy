import { requireProfile } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { saveProfile } from './actions';

export const metadata = { title: 'Profile' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const { profile } = await requireProfile();
  const q = await searchParams;
  const student = profile.role === 'student';

  return (
    <div className="narrow">
      <h1 className="page-title">Your profile</h1>
      <p className="sub">
        {profile.email} · username <strong>{profile.username}</strong> · <a href="/welcome?edit=1">Change username or password</a>
      </p>
      {q.saved && <div className="notice notice--ok">Saved.</div>}
      {q.err && <div className="notice notice--err">{q.err === 'photo' ? 'That photo didn’t upload. Use an image under 5 MB.' : 'That didn’t save. Please try again.'}</div>}

      <form action={saveProfile} className="card stack" encType="multipart/form-data">
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar name={profile.full_name} url={profile.avatar_url} large />
          <div>
            <label htmlFor="avatar">Profile photo</label>
            <input id="avatar" name="avatar" type="file" accept="image/*" />
          </div>
        </div>
        <div className="row">
          <div><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" type="text" defaultValue={profile.full_name ?? ''} required /></div>
          <div><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ''} /></div>
        </div>
        {student && (
          <div>
            <label htmlFor="experience">Your experience</label>
            <select id="experience" name="experience" defaultValue={profile.experience ?? ''}>
              <option value="">Choose one</option>
              <option value="Brand new">Brand new</option>
              <option value="I’ve played around">I’ve played around</option>
              <option value="I record already">I record already</option>
            </select>
          </div>
        )}
        <div><label htmlFor="bio">About you</label><textarea id="bio" name="bio" defaultValue={profile.bio ?? ''} placeholder="Who you are, what music you make or love." /></div>
        {student && <div><label htmlFor="goals">What you want from the Academy</label><textarea id="goals" name="goals" defaultValue={profile.goals ?? ''} /></div>}
        {student && (
          <fieldset style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
            <legend style={{ fontWeight: 800, padding: '0 6px' }}>Parent or guardian (required if you’re 16–17)</legend>
            <div className="stack">
              <div><label htmlFor="parent_name">Name</label><input id="parent_name" name="parent_name" type="text" defaultValue={profile.parent_name ?? ''} /></div>
              <div className="row">
                <div><label htmlFor="parent_phone">Phone</label><input id="parent_phone" name="parent_phone" type="tel" defaultValue={profile.parent_phone ?? ''} /></div>
                <div><label htmlFor="parent_email">Email</label><input id="parent_email" name="parent_email" type="email" defaultValue={profile.parent_email ?? ''} /></div>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                Parent consent: <strong>{profile.consent_signed ? 'signed' : 'not on file'}</strong> (your instructor updates this).
              </p>
            </div>
          </fieldset>
        )}
        <button className="btn" type="submit">Save profile</button>
      </form>
    </div>
  );
}
