import { requireOnlineStudent } from '@/lib/auth';
import { DEFAULT_TZ, meetingFor } from '@/lib/online';
import { TZ, fmtZoned, fmtZonedTime } from '@/lib/schedule';
import type { OfficeHour, OnlineProfile } from '@/lib/types';
import { bookSlot, cancelSlot } from './actions';

export const metadata = { title: 'Office hours' };

const OK: Record<string, string> = { booked: 'You’re booked. It’s on your calendar feed too.', canceled: 'Booking canceled. The time is open for someone else.' };
const ERR: Record<string, string> = {
  taken: 'Someone else just took that time. Pick another one.',
  limit: 'You already have an upcoming booking. Cancel it or wait until it’s done to book another.',
  past: 'That time has already passed.',
  gone: 'That time isn’t available anymore.',
  not_allowed: 'That time isn’t open to your class.',
  late: 'Bookings can be canceled up to 2 hours before. Message your instructor if something came up.',
  none: 'That booking couldn’t be found.',
  save: 'That didn’t save. Please try again.',
};

export default async function OfficeHours({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { supabase, profile, cohort } = await requireOnlineStudent();
  const q = await searchParams;
  const nowIso = new Date().toISOString();
  const [{ data: slots }, { data: op }, { data: past }] = await Promise.all([
    supabase.from('office_hours').select('*').gt('starts_at', nowIso).order('starts_at'),
    supabase.from('online_profiles').select('time_zone').eq('student_id', profile.id).maybeSingle(),
    supabase.from('office_hours').select('*').eq('booked_by', profile.id).lte('starts_at', nowIso).order('starts_at', { ascending: false }).limit(5),
  ]);
  const tz = ((op as Pick<OnlineProfile, 'time_zone'> | null)?.time_zone) || DEFAULT_TZ;
  const all = (slots ?? []) as OfficeHour[];
  const mine = all.filter((s) => s.booked_by === profile.id);
  const open = all.filter((s) => !s.booked_by);
  const link = (s: OfficeHour) => s.meeting_url || meetingFor(cohort, null).url;

  return (
    <>
      <h1 className="page-title">Office hours</h1>
      <p className="sub">One-on-one time with your instructor to go over your mix, your setup or anything you’re stuck on. Times are in your time zone ({tz.replace(/_/g, ' ')}).</p>
      {profile.under_18 && (
        <div className="notice" style={{ background: 'var(--lav-2)' }} role="note">
          Office hours with students under 18 are recorded, and a parent or guardian is welcome to sit in.
        </div>
      )}
      {q.ok && OK[q.ok] && <div className="notice notice--ok">{OK[q.ok]}</div>}
      {q.err && <div className="notice notice--err">{ERR[q.err] ?? ERR.save}</div>}

      {mine.length > 0 && (
        <>
          <h2 className="phase" style={{ marginTop: 0 }}>Your booking</h2>
          {mine.map((s) => (
            <section key={s.id} className="card stack" style={{ marginBottom: 12 }}>
              <h3>{fmtZoned(new Date(s.starts_at), tz)}</h3>
              {tz !== TZ && <p className="small muted" style={{ margin: 0 }}>{fmtZonedTime(new Date(s.starts_at), TZ)} in Killeen.</p>}
              <p style={{ margin: 0 }}>{s.minutes} minutes{s.topic ? ` · ${s.topic}` : ''}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {link(s) && <a className="btn btn--sm" href={link(s)!} target="_blank" rel="noopener noreferrer">Meeting link</a>}
                <form action={cancelSlot}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="btn btn--ghost btn--sm" type="submit">Cancel booking</button>
                </form>
              </div>
            </section>
          ))}
        </>
      )}

      <h2 className="phase" style={mine.length ? undefined : { marginTop: 0 }}>Open times</h2>
      {open.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>No open times right now. Your instructor adds new ones regularly, or send a message to ask for a time.</p></div>
      ) : (
        open.map((s) => (
          <article key={s.id} className="week" style={{ display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <strong>{fmtZoned(new Date(s.starts_at), tz)}</strong>
              <p className="small muted" style={{ margin: '2px 0 0' }}>{s.minutes} minutes{tz !== TZ ? ` · ${fmtZonedTime(new Date(s.starts_at), TZ)} in Killeen` : ''}</p>
            </div>
            <form action={bookSlot} className="stack" style={{ minWidth: 240, flex: '0 1 340px' }}>
              <input type="hidden" name="id" value={s.id} />
              <input name="topic" type="text" maxLength={300} placeholder="What do you want to cover? (optional)" aria-label="What do you want to cover?" />
              <button className="btn btn--sm" type="submit">Book this time</button>
            </form>
          </article>
        ))
      )}

      {((past ?? []) as OfficeHour[]).length > 0 && (
        <>
          <h2 className="phase">Past sessions</h2>
          <div className="card stack">
            {((past ?? []) as OfficeHour[]).map((s) => (
              <p key={s.id} className="small" style={{ margin: 0 }}>{fmtZoned(new Date(s.starts_at), tz)}{s.topic ? ` · ${s.topic}` : ''}</p>
            ))}
          </div>
        </>
      )}
    </>
  );
}
