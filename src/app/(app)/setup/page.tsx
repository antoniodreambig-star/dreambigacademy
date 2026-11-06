import { requireOnlineStudent } from '@/lib/auth';
import { DEFAULT_TZ, SETUP_ITEMS, TIME_ZONES, meetingFor, setupProgress } from '@/lib/online';
import type { OnlineProfile } from '@/lib/types';
import { saveSetup } from './actions';

export const metadata = { title: 'Get set up' };

export default async function Setup({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase, profile, cohort } = await requireOnlineStudent();
  const q = await searchParams;
  const { data } = await supabase.from('online_profiles').select('*').eq('student_id', profile.id).maybeSingle();
  const p = (data as OnlineProfile | null) ?? null;
  const prog = setupProgress(p);
  const tz = p?.time_zone || DEFAULT_TZ;
  const zones = TIME_ZONES.some((z) => z.value === tz) ? TIME_ZONES : [{ value: tz, label: tz.replace(/_/g, ' ') }, ...TIME_ZONES];
  const meet = meetingFor(cohort, null);

  return (
    <>
      <h1 className="page-title">Get set up</h1>
      <p className="sub">Everything you need before your first live session. Your instructor can see your progress and can help if you get stuck.</p>
      {q.ok && <div className="notice notice--ok">Saved.{prog.complete ? ' You’re all set. See you in class.' : ''}</div>}
      {q.err && <div className="notice notice--err">That didn’t save. Please try again.</div>}

      <section className="card" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Progress</p>
        <p className="stat">{prog.done}<span className="muted" style={{ fontSize: '1rem', fontFamily: 'var(--body)', fontWeight: 600 }}> of {prog.total} done</span></p>
        {meet.url && <p className="small" style={{ margin: '10px 0 0' }}>Test your video call with the <a href={meet.url} target="_blank" rel="noopener noreferrer">class meeting link</a>.</p>}
      </section>

      <form action={saveSetup} className="stack">
        <section className="card stack">
          <h2>Your time zone</h2>
          <p className="small muted" style={{ margin: 0 }}>Live sessions and office hours are shown in this time zone. The studio is in Killeen, Texas (Central time).</p>
          <div className="row">
            <div>
              <label htmlFor="time_zone">Time zone</label>
              <select id="time_zone" name="time_zone" defaultValue={tz}>
                {zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </div>
            <div><label htmlFor="location">City and country (optional)</label><input id="location" name="location" type="text" maxLength={120} defaultValue={p?.location ?? ''} /></div>
          </div>
        </section>

        <section className="card stack">
          <h2>Checklist</h2>
          {SETUP_ITEMS.map((i) => (
            <label key={i.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontWeight: 400 }}>
              <input type="checkbox" name={`chk_${i.key}`} value="1" defaultChecked={p?.setup?.[i.key] === true} style={{ width: 22, height: 22, flexShrink: 0, marginTop: 2 }} />
              <span><strong>{i.title}</strong><br /><span className="small muted">{i.detail}</span></span>
            </label>
          ))}
        </section>

        <section className="card stack">
          <h2>Your gear</h2>
          <p className="small muted" style={{ margin: 0 }}>Only you and your instructor see this. It helps with troubleshooting. Fill in what you have; it’s fine to leave some blank.</p>
          <div className="row">
            <div><label htmlFor="daw">Pro Tools version</label><input id="daw" name="daw" type="text" maxLength={120} defaultValue={p?.daw ?? ''} placeholder="Pro Tools Artist 2025" /></div>
            <div><label htmlFor="os">Computer and system</label><input id="os" name="os" type="text" maxLength={120} defaultValue={p?.os ?? ''} placeholder="MacBook Air, macOS 15" /></div>
          </div>
          <div className="row">
            <div><label htmlFor="interface">Audio interface</label><input id="interface" name="interface" type="text" maxLength={120} defaultValue={p?.interface ?? ''} placeholder="Focusrite Scarlett Solo" /></div>
            <div><label htmlFor="mic">Microphone</label><input id="mic" name="mic" type="text" maxLength={120} defaultValue={p?.mic ?? ''} placeholder="Audio-Technica AT2020" /></div>
          </div>
          <div className="row">
            <div><label htmlFor="headphones">Headphones</label><input id="headphones" name="headphones" type="text" maxLength={120} defaultValue={p?.headphones ?? ''} /></div>
            <div><label htmlFor="monitors">Speakers / monitors</label><input id="monitors" name="monitors" type="text" maxLength={120} defaultValue={p?.monitors ?? ''} /></div>
          </div>
          <div><label htmlFor="internet">Internet speed (from a speed test)</label><input id="internet" name="internet" type="text" maxLength={120} defaultValue={p?.internet ?? ''} placeholder="150 Mbps down / 20 Mbps up, Wi-Fi" /></div>
        </section>

        <button className="btn" type="submit" style={{ alignSelf: 'flex-start' }}>Save</button>
      </form>

      <section className="card stack" style={{ marginTop: 16 }}>
        <h2>Sending big files</h2>
        <p className="small" style={{ margin: 0 }}>
          Homework uploads go up to 50 MB, which is plenty for an MP3 or M4A mix. For a whole session folder or WAV files, zip the folder, put it in Google Drive or Dropbox, set the link to “anyone with the link can view,” and paste the link when you turn in homework.
        </p>
      </section>
    </>
  );
}
