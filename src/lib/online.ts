import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cohort, Format, OnlineProfile, OnlineSession, Project, Week } from './types';
import { sessionTimes, weeksFor, type SessionTimes } from './schedule';

/** Which curriculum tables belong to a track. Online students' homework still lives in `submissions`. */
export const weeksTable = (format: Format | null | undefined) => (format === 'online' ? 'online_weeks' : 'weeks');
export const projectsTable = (format: Format | null | undefined) => (format === 'online' ? 'online_projects' : 'projects');

/** The curriculum for a track. Pass the student's class to get only the weeks of their module. */
export async function loadCurriculum(supabase: SupabaseClient, format: Format | null | undefined, cohort?: Pick<Cohort, 'format' | 'module'> | null): Promise<{ weeks: Week[]; projects: Project[] }> {
  const [{ data: weeks }, { data: projects }] = await Promise.all([
    supabase.from(weeksTable(format)).select('*').order('week'),
    supabase.from(projectsTable(format)).select('*'),
  ]);
  const W = (weeks ?? []) as Week[];
  const P = (projects ?? []) as Project[];
  return cohort ? { weeks: weeksFor(cohort, W), projects: weeksFor(cohort, P) } : { weeks: W, projects: P };
}

/** What a week is called on screen. Online weeks are a live video session plus practice at home. */
export const WORDS = {
  in_person: { session: 'Class', inClass: 'In class', lab: 'Lab', labLong: 'Lab (Studio B)' },
  online: { session: 'Live session', inClass: 'Live session', lab: 'Practice', labLong: 'Practice (on your own)' },
} as const;
export const wordsFor = (format: Format | null | undefined) => (format === 'online' ? WORDS.online : WORDS.in_person);

// ------------------------------------------------------------ links ---------

/** Accepts "zoom.us/j/123" or a full link. Returns an https/http URL, or null if it isn't one. */
export function cleanUrl(v: string): string | null {
  const t = v.trim().slice(0, 500);
  if (!t) return null;
  const u = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const url = new URL(u);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The join link for one session: that session's own link if you set one, otherwise the class link. */
export function meetingFor(cohort: Pick<Cohort, 'meeting_url' | 'meeting_passcode'>, ov?: Pick<OnlineSession, 'meeting_url'> | null): { url: string | null; passcode: string | null } {
  const own = ov?.meeting_url || null;
  return { url: own || cohort.meeting_url || null, passcode: own ? null : cohort.meeting_passcode || null };
}

// ------------------------------------------------------- live session state --

export type JoinState = 'canceled' | 'later' | 'open' | 'ended';
/** The join button comes alive 15 minutes before the start and stays until the session ends. */
export function joinState(t: SessionTimes, now: Date = new Date()): JoinState {
  if (t.canceled) return 'canceled';
  if (now.getTime() > t.end.getTime()) return 'ended';
  if (now.getTime() >= t.start.getTime() - 15 * 60_000) return 'open';
  return 'later';
}

export interface SessionRow {
  week: number;
  title: string;
  times: SessionTimes;
  ov: OnlineSession | null;
  state: JoinState;
}

export function buildSessions(cohort: Cohort, weeks: Pick<Week, 'week' | 'title'>[], overrides: OnlineSession[], now: Date = new Date()): SessionRow[] {
  const by = new Map(overrides.map((o) => [o.week, o]));
  return weeksFor(cohort, weeks).map((w) => {
    const ov = by.get(w.week) ?? null;
    const times = sessionTimes(cohort, w.week, ov);
    return { week: w.week, title: w.title, times, ov, state: joinState(times, now) };
  });
}

/** The session happening now or next (skips canceled and finished ones). */
export const nextSession = (rows: SessionRow[]) => rows.find((r) => r.state === 'open' || r.state === 'later') ?? null;

/** The most recent finished session that has a recording posted. */
export const latestRecording = (rows: SessionRow[]) => [...rows].reverse().find((r) => r.ov?.recording_url) ?? null;

// --------------------------------------------------------- time zones --------

export const DEFAULT_TZ = 'America/Chicago';
export const TIME_ZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago, Killeen)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Phoenix', label: 'Arizona (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'America/Puerto_Rico', label: 'Atlantic (Puerto Rico)' },
  { value: 'America/Toronto', label: 'Eastern (Toronto)' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Sao_Paulo', label: 'Brazil (São Paulo)' },
  { value: 'Europe/London', label: 'United Kingdom (London)' },
  { value: 'Europe/Berlin', label: 'Central Europe (Berlin)' },
  { value: 'Africa/Lagos', label: 'West Africa (Lagos)' },
  { value: 'Asia/Dubai', label: 'Gulf (Dubai)' },
  { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
  { value: 'Asia/Manila', label: 'Philippines (Manila)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { value: 'Australia/Sydney', label: 'Australia (Sydney)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (Auckland)' },
];

// ------------------------------------------------------------- set up --------

/** The "Get set up" checklist online students work through before Week 1. EDIT THIS LIST to change it. */
export const SETUP_ITEMS: { key: string; title: string; detail: string }[] = [
  { key: 'computer', title: 'Computer is ready', detail: 'A Mac or Windows computer that meets Avid’s system requirements for the version of Pro Tools you’ll use, with plenty of free space for sessions (50 GB or more is comfortable).' },
  { key: 'pro_tools', title: 'Pro Tools is installed', detail: 'Open Pro Tools and create a new session. If you need help choosing a version or getting a license, message your instructor before the first session.' },
  { key: 'interface', title: 'Audio interface or USB mic is connected', detail: 'Set it as your playback and record device in Pro Tools (Setup → Playback Engine) and confirm you hear audio.' },
  { key: 'mic', title: 'Microphone works', detail: 'Record a short test take and play it back. Check that the level isn’t clipping.' },
  { key: 'headphones', title: 'Wired headphones', detail: 'Wired, closed-back headphones are best for recording. Bluetooth headphones add a delay, so don’t use them when you’re recording.' },
  { key: 'video', title: 'Video call works', detail: 'Your camera and microphone work in the class meeting. Use the link on your Live sessions page to test it.' },
  { key: 'internet', title: 'Internet is stable', detail: 'Run a speed test and note the result below. A wired connection, or sitting near your router, helps a lot with live sessions.' },
  { key: 'space', title: 'A quiet place to record', detail: 'A room where you can attend live and record without traffic, fans or echo. Blankets, a closet full of clothes or a couch cushion fort all help.' },
  { key: 'backup', title: 'A place to back up your sessions', detail: 'An external drive or a cloud folder (Google Drive, Dropbox, iCloud). You’ll back up every session.' },
  { key: 'test', title: 'Sent your instructor a test recording', detail: 'Share a 10-second recording from your setup (a file on the Schedule page or a link in Messages) so your instructor can check your sound before Week 1.' },
];

export function setupProgress(p: Pick<OnlineProfile, 'setup'> | null) {
  const done = SETUP_ITEMS.filter((i) => p?.setup?.[i.key] === true).length;
  return { done, total: SETUP_ITEMS.length, complete: done === SETUP_ITEMS.length };
}
