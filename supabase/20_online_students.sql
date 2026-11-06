-- Run once in Supabase → SQL Editor (after 01–06). Safe to run again.
-- Adds the ONLINE-ONLY student track:
--   * classes can be "in person" or "online" (online: 13 weeks / 3 months, live sessions on video)
--   * a separate 13-week online curriculum (editable under Instructor → Curriculum → Online)
--   * live-session link, recordings, notes and one-off reschedules for each online session
--   * each online student's time zone, gear and a "get set up" checklist
--   * office-hours slots that online students book themselves
--   * a "Watched recording" attendance status that students can set for sessions they missed
--   * applications / invites remember which track the person chose

-- ------------------------------------------------------------------ cohorts --
alter table public.cohorts add column if not exists format         text not null default 'in_person';
alter table public.cohorts drop constraint if exists cohorts_format_check;
alter table public.cohorts add constraint cohorts_format_check check (format in ('in_person','online'));
alter table public.cohorts add column if not exists seats          int  not null default 6;
alter table public.cohorts drop constraint if exists cohorts_seats_check;
alter table public.cohorts add constraint cohorts_seats_check check (seats between 1 and 200);
alter table public.cohorts add column if not exists meeting_url      text;   -- the class's Zoom / Meet link
alter table public.cohorts add column if not exists meeting_passcode text;
alter table public.cohorts add column if not exists meeting_notes    text;   -- e.g. "Doors open 15 minutes early. Camera on, please."

alter table public.invites           add column if not exists format text not null default 'in_person';
alter table public.invites           drop constraint if exists invites_format_check;
alter table public.invites           add constraint invites_format_check check (format in ('in_person','online'));

alter table public.applications      add column if not exists format    text not null default 'in_person';
alter table public.applications      drop constraint if exists applications_format_check;
alter table public.applications      add constraint applications_format_check check (format in ('in_person','online'));
alter table public.applications      add column if not exists time_zone text;
alter table public.applications      add column if not exists location  text;
alter table public.applications      drop constraint if exists applications_tz_len;
alter table public.applications      add constraint applications_tz_len  check (time_zone is null or length(time_zone) <= 64);
alter table public.applications      drop constraint if exists applications_loc_len;
alter table public.applications      add constraint applications_loc_len check (location  is null or length(location)  <= 120);

alter table public.guardian_consents add column if not exists format text not null default 'in_person';

-- Is the signed-in person a student in an online class?
create or replace function public.is_online_student() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p join public.cohorts c on c.id = p.cohort_id
    where p.id = auth.uid() and p.role = 'student' and c.format = 'online'
  );
$$;

-- --------------------------------------------------- the online curriculum --
-- Same shape as public.weeks, but 13 weeks. Homework turned in by online students still goes in
-- public.submissions (week 1–13), so the homework form, audio feedback and feedback emails all work as-is.
create table if not exists public.online_weeks (
  week              int primary key check (week between 1 and 13),
  phase             text not null,
  title             text not null,
  in_class          text not null default '',   -- shown to students as "Live session"
  lab               text not null default '',   -- shown to students as "Practice"
  homework          text not null default '',
  homework_due_days int  not null default 7
);
create table if not exists public.online_projects (
  key   text primary key,
  title text not null,
  week  int not null references public.online_weeks(week),
  items text[] not null default '{}'
);
alter table public.online_weeks    enable row level security;
alter table public.online_projects enable row level security;
drop policy if exists ow_read  on public.online_weeks;
create policy ow_read  on public.online_weeks for select to authenticated using (true);
drop policy if exists ow_write on public.online_weeks;
create policy ow_write on public.online_weeks for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());
drop policy if exists op_read  on public.online_projects;
create policy op_read  on public.online_projects for select to authenticated using (true);
drop policy if exists op_write on public.online_projects;
create policy op_write on public.online_projects for all to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- A first draft of the 3-month course. Edit any week under Instructor → Curriculum → Online.
insert into public.online_weeks (week, phase, title, in_class, lab, homework, homework_due_days) values
(1, 'Month 1 · Pro Tools foundations', 'Welcome, how sound works and your home setup',
  'Welcome and how the course works. How sound works: frequency, amplitude, decibels, phase. Signal flow from microphone to speakers. Room and monitoring basics for a home studio.',
  'Finish the Get set up checklist. Open Pro Tools and make sure it plays and records audio.',
  'Listening journal: pick 3 favorite songs and describe the low end, the vocal and the space in each (1 page). Send a 10-second test recording so we can check your setup.', 7),
(2, 'Month 1 · Pro Tools foundations', 'The Pro Tools interface',
  'Edit and Mix windows, track types, sessions, sample rate and bit depth, where your files live and how to back them up.',
  'Create a session, name and color tracks, save it as a template.',
  'Build an 8-track session template. Learn the 15 shortcuts on the handout; quick quiz next session.', 7),
(3, 'Month 1 · Pro Tools foundations', 'Editing and arranging',
  'Edit modes (Grid, Slip, Shuffle, Spot), the Smart Tool, clips, playlists, fades, markers.',
  'Chop and arrange the provided beat to a grid.',
  'Rearrange the provided 2-minute instrumental into intro / verse / hook / verse / hook / outro with clean fades.', 7),
(4, 'Month 1 · Pro Tools foundations', 'Routing and bouncing',
  'I/O setup, inserts, sends, aux tracks, buses, bouncing and file formats.',
  'Build a headphone mix and an effects bus in your own session.',
  'Project 1 due: Session Build.', 0),
(5, 'Month 2 · Recording at home', 'Microphones and mic technique',
  'Dynamic, condenser and ribbon mics; polar patterns; proximity effect. Getting a good sound in an untreated room: placement, blankets, reflection filters.',
  'Record the same voice at 3 distances and in 2 spots in your room.',
  'Write a half-page comparison of your test recordings: which position sounded best, and why.', 7),
(6, 'Month 2 · Recording at home', 'Gain staging and clean recordings',
  'Preamp gain, healthy levels (peaks around −10 dBFS, average near −18 dBFS), clipping, headphone mixes, monitoring latency.',
  'Record spoken word and sung lines at correct levels; fix a clipped take.',
  'Record 3 vocal takes and log the input level for each.', 7),
(7, 'Month 2 · Recording at home', 'Tracking and comping vocals',
  'Booth setup at home, pop filter, distance, punch-ins, loop record, playlists and comping. Directing an artist over video without killing the vibe.',
  'Record and comp a lead vocal on the week 3 instrumental.',
  'Finish a lead vocal with at least 3 playlists comped into one take, plus doubles and ad-libs.', 7),
(8, 'Month 2 · Recording at home', 'Instruments, MIDI and remote sessions',
  'Guitar and bass through a DI, keys, virtual instruments, MIDI editing and quantizing. Running a recording session remotely: prep, track sheets, file delivery and backups.',
  'Record a DI guitar or bass part and a MIDI keys part.',
  'Project 2 due: Home Recording Session.', 0),
(9, 'Month 3 · Mix, master, portfolio', 'Mixing fundamentals',
  'Gain balance, panning, EQ basics, subtractive vs additive EQ, building a rough mix quickly. Mixing on headphones vs speakers.',
  'Balance and pan your Project 2 song using only faders, pan and EQ.',
  'Deliver a rough mix of Project 2 using only faders, pan and EQ. Write 3 notes on what you would fix next.', 7),
(10, 'Month 3 · Mix, master, portfolio', 'Dynamics and effects',
  'Compression (threshold, ratio, attack, release), de-essing, reverb and delay for depth and space, parallel processing.',
  'Compress a vocal two ways and compare.',
  'Add compression and a reverb/delay send to your mix. Bounce a before and after.', 7),
(11, 'Month 3 · Mix, master, portfolio', 'Finishing the mix',
  'Automation, vocal rides, mix bus processing, referencing against a commercial track, checking on several speakers, getting feedback and revising.',
  'Reference your mix against a commercial song. Make a list of differences.',
  'Revise your mix after the in-app feedback and send version 2.', 7),
(12, 'Month 3 · Mix, master, portfolio', 'Mastering and delivery',
  'Mastering basics: EQ, compression, limiting, loudness targets (LUFS), file formats, metadata, and what to deliver to a client or distributor.',
  'Master your own mix to a competitive loudness without crushing it.',
  'Master your mix and export a WAV and an MP3.', 7),
(13, 'Month 3 · Mix, master, portfolio', 'Portfolio and next steps',
  'Putting together a portfolio, pricing and finding clients, building an online presence, and what to learn next. Final review of student mixes.',
  'Final listening session of student projects.',
  'Project 3 due: Final Mix and Master.', 0)
on conflict (week) do nothing;

insert into public.online_projects (key, title, week, items) values
('o1', 'Project 1: Session Build', 4, array[
  'An organized session: named, colored tracks, markers on every section, saved with a clear file name.',
  'The arranged instrumental from week 3, with an aux reverb on a bus.',
  'A 24-bit WAV and an MP3 bounce.',
  'A photo or scan of a hand-drawn signal flow from your microphone to your headphones.']),
('o2', 'Project 2: Home Recording Session', 8, array[
  'Record a full song: beat or instrumental, comped lead vocal, doubles and ad-libs. Use your own voice or a friend remotely.',
  'A completed track sheet: mics used, input levels, takes kept.',
  'A rough mix bounce and a backed-up session folder (zipped or shared by link).',
  'A short reflection: what went well, what to do differently next session.']),
('o3', 'Project 3: Final Mix and Master', 13, array[
  'A finished mix of your Project 2 song (or another song with approval): WAV and MP3.',
  'A mastered version at a competitive loudness.',
  'A one-page note on your mix and mastering choices.',
  'A reference track you compared against, with a short note on what you learned.'])
on conflict (key) do nothing;

-- ----------------------------------------------------------- online sessions --
-- One row per class per week, only when you have something to say about that session.
create table if not exists public.online_sessions (
  cohort_id      uuid not null references public.cohorts(id) on delete cascade,
  week           int  not null check (week between 1 and 13),
  meeting_url    text,                 -- overrides the class link for this one session
  date_override  date,                 -- one-off reschedule (Killeen time)
  time_override  time,
  canceled       boolean not null default false,
  topic_note     text check (topic_note is null or length(topic_note) <= 1000),     -- "Bring a vocal take"
  recording_url  text,
  recording_note text check (recording_note is null or length(recording_note) <= 2000), -- chapter times, key points
  slides_url     text,
  posted_at      timestamptz,          -- when the recording was posted
  updated_at     timestamptz not null default now(),
  primary key (cohort_id, week)
);
alter table public.online_sessions enable row level security;
drop policy if exists os_read on public.online_sessions;
create policy os_read  on public.online_sessions for select to authenticated using (public.is_instructor() or cohort_id = public.my_cohort());
drop policy if exists os_write on public.online_sessions;
create policy os_write on public.online_sessions for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- ----------------------------------------------- online student profile + setup --
create table if not exists public.online_profiles (
  student_id    uuid primary key references public.profiles(id) on delete cascade,
  time_zone     text not null default 'America/Chicago' check (length(time_zone) <= 64),
  location      text check (location   is null or length(location)   <= 120),
  daw           text check (daw        is null or length(daw)        <= 120),
  os            text check (os         is null or length(os)         <= 120),
  interface     text check (interface  is null or length(interface)  <= 120),
  mic           text check (mic        is null or length(mic)        <= 120),
  headphones    text check (headphones is null or length(headphones) <= 120),
  monitors      text check (monitors   is null or length(monitors)   <= 120),
  internet      text check (internet   is null or length(internet)   <= 120),
  setup         jsonb not null default '{}'::jsonb,   -- checklist: { "pro_tools": true, ... }
  setup_done_at timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.online_profiles enable row level security;
drop policy if exists op2_read on public.online_profiles;
create policy op2_read   on public.online_profiles for select to authenticated using (student_id = auth.uid() or public.is_instructor());
drop policy if exists op2_insert on public.online_profiles;
create policy op2_insert on public.online_profiles for insert to authenticated with check (student_id = auth.uid() and public.is_online_student());
drop policy if exists op2_update on public.online_profiles;
create policy op2_update on public.online_profiles for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ------------------------------------------------------------- office hours --
create table if not exists public.office_hours (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid references public.cohorts(id) on delete cascade,   -- null = open to every online class
  starts_at   timestamptz not null,
  minutes     int not null default 20 check (minutes between 10 and 120),
  meeting_url text,                                                   -- empty = use the class link
  booked_by   uuid references public.profiles(id) on delete set null,
  topic       text check (topic is null or length(topic) <= 300),
  booked_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists office_hours_start_idx on public.office_hours (starts_at);
alter table public.office_hours enable row level security;
drop policy if exists oh_read on public.office_hours;
create policy oh_read on public.office_hours for select to authenticated using (
  public.is_instructor()
  or booked_by = auth.uid()
  or (booked_by is null and starts_at > now() and public.is_online_student() and (cohort_id is null or cohort_id = public.my_cohort()))
);
drop policy if exists oh_write on public.office_hours;
create policy oh_write on public.office_hours for all to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- Students book and cancel through these two functions so two students can never get the same slot.
create or replace function public.book_office_hour(p_id uuid, p_topic text) returns text
language plpgsql security definer set search_path = public as $$
declare slot public.office_hours%rowtype;
begin
  if not public.is_online_student() then return 'not_online'; end if;
  select * into slot from public.office_hours where id = p_id for update;
  if not found then return 'gone'; end if;
  if slot.starts_at <= now() then return 'past'; end if;
  if slot.cohort_id is not null and slot.cohort_id is distinct from public.my_cohort() then return 'not_allowed'; end if;
  if slot.booked_by is not null then return case when slot.booked_by = auth.uid() then 'ok' else 'taken' end; end if;
  -- one upcoming booking at a time, so everyone gets a turn
  if exists (select 1 from public.office_hours where booked_by = auth.uid() and starts_at > now()) then return 'limit'; end if;
  update public.office_hours
     set booked_by = auth.uid(), topic = nullif(left(trim(coalesce(p_topic, '')), 300), ''), booked_at = now()
   where id = p_id;
  return 'ok';
end;
$$;

create or replace function public.cancel_office_hour(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare slot public.office_hours%rowtype;
begin
  select * into slot from public.office_hours where id = p_id for update;
  if not found or slot.booked_by is distinct from auth.uid() then return 'none'; end if;
  if slot.starts_at < now() + interval '2 hours' then return 'late'; end if;
  update public.office_hours set booked_by = null, topic = null, booked_at = null where id = p_id;
  return 'ok';
end;
$$;

revoke all on function public.book_office_hour(uuid, text) from public;
revoke all on function public.cancel_office_hour(uuid) from public;
grant execute on function public.book_office_hour(uuid, text) to authenticated;
grant execute on function public.cancel_office_hour(uuid) to authenticated;

-- --------------------------------------------------------------- attendance --
-- Online students can also be "Watched recording" for a session they missed.
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add  constraint attendance_status_check check (status in ('present','late','absent','excused','watched'));

-- A student may mark their own session as "watched" (only for online classes, and never over Present/Late/Excused).
drop policy if exists att_self_insert on public.attendance;
create policy att_self_insert on public.attendance for insert to authenticated
  with check (student_id = auth.uid() and status = 'watched' and public.is_online_student());
drop policy if exists att_self_update on public.attendance;
create policy att_self_update on public.attendance for update to authenticated
  using      (student_id = auth.uid() and status in ('absent','watched') and public.is_online_student())
  with check (student_id = auth.uid() and status = 'watched');

-- -------------------------------------------- guardian consent for online ----
-- The guardian page needs to know which track the student is in, so the right wording is shown.
drop function if exists public.consent_lookup(uuid);
create or replace function public.consent_lookup(p_token uuid)
returns table (student_name text, guardian_name text, status text, signed_name text, signed_at timestamptz, version text, format text)
language sql stable security definer set search_path = public as $$
  select student_name, guardian_name, status, signed_name, signed_at, version, format
  from public.guardian_consents where token = p_token;
$$;
revoke all on function public.consent_lookup(uuid) from public;
grant execute on function public.consent_lookup(uuid) to anon, authenticated;
