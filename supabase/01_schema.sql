-- Dream Big Academy app: database, security rules and the course plan.
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- Then run 02_storage.sql.

-- ---------------------------------------------------------------- people --

-- Emails that get the INSTRUCTOR role the first time they sign in. Edit this list.
create table if not exists public.instructors (email text primary key check (email = lower(email)));
insert into public.instructors (email) values
  ('antoniodream@gmail.com'),
  ('studio@dreambigctx.com')
on conflict do nothing;

create table if not exists public.cohorts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  start_date    date not null,                 -- date of the Week 1 class
  class_weekday int  not null default 6 check (class_weekday between 0 and 6), -- 0 = Sunday ... 6 = Saturday (used for the label only; dates come from start_date)
  class_start   time not null default '10:00',
  class_hours   numeric not null default 3,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Only people on this list can create an account (the instructor adds students here).
create table if not exists public.invites (
  email      text primary key check (email = lower(email)),
  full_name  text,
  cohort_id  uuid references public.cohorts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  role           text not null default 'student' check (role in ('student','instructor')),
  full_name      text,
  phone          text,
  avatar_url     text,
  bio            text,
  goals          text,
  experience     text,
  parent_name    text,
  parent_phone   text,
  parent_email   text,
  consent_signed boolean not null default false,   -- parent consent for 16-17 year olds (instructor sets it)
  cohort_id      uuid references public.cohorts(id) on delete set null,
  calendar_token uuid not null default gen_random_uuid(),
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------ the course --

create table if not exists public.weeks (
  week              int primary key check (week between 1 and 26),
  phase             text not null,
  title             text not null,
  in_class          text not null default '',
  lab               text not null default '',
  homework          text not null default '',
  homework_due_days int  not null default 7       -- days after that week's class (0 = due at that class)
);

create table if not exists public.projects (
  key   text primary key,
  title text not null,
  week  int not null references public.weeks(week),   -- due week
  items text[] not null default '{}'
);

-- One row per student per week: "I did the homework" + note/link/file + instructor feedback.
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  week          int  not null references public.weeks(week),
  note          text,
  link          text,
  file_path     text,
  submitted_at  timestamptz not null default now(),
  feedback      text,
  feedback_at   timestamptz,
  unique (student_id, week)
);

create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  thread_student_id uuid not null references public.profiles(id) on delete cascade, -- whose thread this is
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  body              text not null check (length(body) between 1 and 4000),
  created_at        timestamptz not null default now(),
  read_at           timestamptz
);
create index if not exists messages_thread_idx on public.messages (thread_student_id, created_at);

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  cohort_id  uuid references public.cohorts(id) on delete cascade,  -- null = everyone
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------ helper functions --

create or replace function public.is_instructor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'instructor');
$$;

create or replace function public.my_cohort() returns uuid
language sql stable security definer set search_path = public as $$
  select cohort_id from public.profiles where id = auth.uid();
$$;

-- ------------------------------------------- invite-only account creation --

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  em  text := lower(new.email);
  inv public.invites%rowtype;
begin
  if exists (select 1 from public.instructors where email = em) then
    insert into public.profiles (id, email, role, full_name)
    values (new.id, em, 'instructor', split_part(em, '@', 1));
  else
    select * into inv from public.invites where email = em;
    if not found then
      raise exception 'NOT_ENROLLED';
    end if;
    insert into public.profiles (id, email, role, full_name, cohort_id)
    values (new.id, em, 'student', inv.full_name, inv.cohort_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students can edit their own profile, but never role, email, cohort or consent.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_instructor() then
    new.role := old.role; new.email := old.email; new.cohort_id := old.cohort_id;
    new.consent_signed := old.consent_signed; new.calendar_token := old.calendar_token;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

-- Students can't write instructor feedback on their own work.
create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_instructor() then
    if tg_op = 'INSERT' then
      new.feedback := null; new.feedback_at := null;
    else
      new.feedback := old.feedback; new.feedback_at := old.feedback_at;
    end if;
    new.student_id := coalesce(old.student_id, new.student_id);
  elsif tg_op = 'UPDATE' and new.feedback is distinct from old.feedback then
    new.feedback_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists guard_submission on public.submissions;
create trigger guard_submission before insert or update on public.submissions
  for each row execute function public.guard_submission();

-- ------------------------------------------------------ security (RLS) ----

alter table public.instructors   enable row level security;
alter table public.cohorts       enable row level security;
alter table public.invites       enable row level security;
alter table public.profiles      enable row level security;
alter table public.weeks         enable row level security;
alter table public.projects      enable row level security;
alter table public.submissions   enable row level security;
alter table public.messages      enable row level security;
alter table public.announcements enable row level security;

-- instructors table: nobody reads it through the API (the sign-up trigger uses it).
-- cohorts
create policy cohorts_read   on public.cohorts for select to authenticated using (public.is_instructor() or id = public.my_cohort());
create policy cohorts_write  on public.cohorts for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());
-- invites (instructor only)
create policy invites_all    on public.invites for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());
-- profiles: yourself, the instructor sees everyone, everyone sees the instructors (names on messages)
create policy profiles_read   on public.profiles for select to authenticated using (id = auth.uid() or role = 'instructor' or public.is_instructor());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_instructor()) with check (id = auth.uid() or public.is_instructor());
-- course plan: everyone signed in reads; instructor edits
create policy weeks_read     on public.weeks    for select to authenticated using (true);
create policy weeks_write    on public.weeks    for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());
create policy projects_read  on public.projects for select to authenticated using (true);
create policy projects_write on public.projects for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());
-- submissions
create policy subs_read   on public.submissions for select to authenticated using (student_id = auth.uid() or public.is_instructor());
create policy subs_insert on public.submissions for insert to authenticated with check (student_id = auth.uid() or public.is_instructor());
create policy subs_update on public.submissions for update to authenticated using (student_id = auth.uid() or public.is_instructor()) with check (student_id = auth.uid() or public.is_instructor());
create policy subs_delete on public.submissions for delete to authenticated using (student_id = auth.uid() or public.is_instructor());
-- messages: a student sees only their own thread; the instructor sees all
create policy msg_read   on public.messages for select to authenticated using (thread_student_id = auth.uid() or public.is_instructor());
create policy msg_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and (thread_student_id = auth.uid() or public.is_instructor()));
create policy msg_update on public.messages for update to authenticated using (thread_student_id = auth.uid() or public.is_instructor()) with check (thread_student_id = auth.uid() or public.is_instructor());
revoke update on public.messages from authenticated;
grant  update (read_at) on public.messages to authenticated;
-- announcements
create policy ann_read  on public.announcements for select to authenticated using (public.is_instructor() or cohort_id is null or cohort_id = public.my_cohort());
create policy ann_write on public.announcements for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- Live updates for the chat.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ----------------------------------------------------- the course plan ----
-- Weeks 1-9 come from the "Audio Engineering Academy — 6-Month Course" plan.
-- Weeks 10-26 are placeholders: edit them in the app under Instructor → Curriculum.

insert into public.weeks (week, phase, title, in_class, lab, homework, homework_due_days) values
(1, 'Month 1 · Pro Tools foundations', 'Welcome and how sound works',
  'Welcome, studio tour and rules. How sound works: frequency, amplitude, decibels, phase. Signal flow from mic to speaker.',
  'Listening tour of Studio A and B; ear-training warm-ups.',
  'Listening journal: pick 3 favorite songs and describe the low end, the vocal and the space in each (1 page).', 7),
(2, 'Month 1 · Pro Tools foundations', 'The Pro Tools interface',
  'The Pro Tools interface: Edit and Mix windows, track types, sessions, sample rate and bit depth, where files live.',
  'Create a session, name and color tracks, save it as a template.',
  'Build an 8-track session template. Learn the 15 shortcuts on the handout; quiz next class.', 7),
(3, 'Month 1 · Pro Tools foundations', 'Editing and arranging',
  'Edit modes (Grid, Slip, Shuffle, Spot), the Smart Tool, clips, playlists, fades, markers.',
  'Chop and arrange a provided beat to a grid.',
  'Rearrange a provided 2-minute instrumental into intro / verse / hook / verse / hook / outro with clean fades.', 7),
(4, 'Month 1 · Pro Tools foundations', 'Routing and bouncing',
  'Routing: I/O setup, inserts, sends, aux tracks, buses, bouncing and file formats.',
  'Build a headphone mix and an effects bus.',
  'Project 1 due: Session Build.', 0),
(5, 'Month 2 · Recording', 'Microphones',
  'Microphones: dynamic, condenser and ribbon; polar patterns; proximity effect. The studio''s mics and when to use each.',
  'Mic shootout: the same voice on 3 mics at 3 distances.',
  'Write a half-page comparison of the shootout recordings: which mic fit which voice, and why.', 7),
(6, 'Month 2 · Recording', 'Gain staging',
  'Gain staging: preamp gain, healthy levels (peaks around −10 dBFS, average near −18 dBFS), clipping, headphone mixes, talkback.',
  'Record spoken word and sung lines at correct levels; fix a clipped take.',
  'Record 3 vocal takes (lab or home) and log the input levels for each.', 7),
(7, 'Month 2 · Recording', 'Tracking vocals',
  'Tracking vocals: booth setup, pop filter, distance, punch-ins, loop record, playlists. Coaching an artist: how to give direction without killing the vibe.',
  'Students take turns engineering a vocal session for a classmate.',
  'Finish a lead vocal with at least 3 full playlists plus doubles and ad-libs.', 7),
(8, 'Month 2 · Recording', 'Instruments and MIDI',
  'Instruments and MIDI: guitar and bass through a DI, keys, virtual instruments, MIDI editing and quantizing.',
  'Record a DI guitar or bass part and a MIDI keys part.',
  'Program a 16-bar MIDI part (drums, keys or bass) that fits the week 3 instrumental.', 7),
(9, 'Month 2 · Recording', 'Running a session',
  'Running a session: prep, track sheets, backups, time management, delivering files, studio etiquette.',
  'Project 2 session with a guest artist.',
  'Project 2 due: First Session.', 0)
on conflict (week) do nothing;

insert into public.weeks (week, phase, title)
select g, 'Months 3–6 · Edit, mix, master, portfolio', 'Outline coming soon'
from generate_series(10, 26) g
on conflict (week) do nothing;

insert into public.projects (key, title, week, items) values
('p1', 'Project 1: Session Build', 4, array[
  'An organized session: named, colored tracks, markers on every section, saved with a clear file name.',
  'The arranged instrumental from week 3, with an aux reverb on a bus.',
  'A 24-bit WAV and an MP3 bounce.',
  'A one-page hand-drawn signal flow from microphone to the student''s headphones.']),
('p2', 'Project 2: First Session', 9, array[
  'Engineer a full song with a guest artist (a Dream Big client or a classmate): beat or instrumental, lead vocal, doubles and ad-libs.',
  'A completed track sheet: mics used, input levels, takes kept.',
  'A rough mix bounce and a backed-up session folder.',
  'A short reflection: what went well, what to do differently next session.'])
on conflict (key) do nothing;
