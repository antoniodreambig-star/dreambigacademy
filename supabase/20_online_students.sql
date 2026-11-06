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
-- The online course is the SAME course as the in-person one, in half the time: every online week
-- covers two in-person weeks (online 1 = in-person 1+2, online 2 = 3+4 ... online 13 = 25+26).
-- These are views over public.weeks / public.projects, so when you edit the in-person curriculum the
-- online one updates by itself. Homework turned in by online students still goes in public.submissions
-- (week 1-13), so the homework form, audio feedback and feedback emails all work as-is.
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = 'online_weeks' and c.relkind = 'r') then
    drop table public.online_weeks cascade;
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = 'online_projects' and c.relkind = 'r') then
    drop table public.online_projects cascade;
  end if;
end $$;

create or replace view public.online_weeks as
select
  n as week,
  case when n <= 4 then 'Month 1' when n <= 8 then 'Month 2' else 'Month 3' end as phase,
  case
    when coalesce(a.title, '') = coalesce(b.title, '') then coalesce(a.title, 'Outline coming soon')
    else concat_ws(' + ', a.title, b.title)
  end as title,
  concat_ws(E'\n\n',
    case when nullif(a.in_class, '') is not null then 'Part 1 (week ' || (2*n-1) || ' of the in-person course): ' || a.in_class end,
    case when nullif(b.in_class, '') is not null then 'Part 2 (week ' || (2*n) || '): ' || b.in_class end) as in_class,
  concat_ws(E'\n\n', nullif(a.lab, ''), nullif(b.lab, '')) as lab,
  concat_ws(E'\n\n', nullif(a.homework, ''), nullif(b.homework, '')) as homework,
  least(coalesce(a.homework_due_days, 7), coalesce(b.homework_due_days, 7)) as homework_due_days
from generate_series(1, 13) n
left join public.weeks a on a.week = 2*n-1
left join public.weeks b on b.week = 2*n;

create or replace view public.online_projects as
select key, title, ((week + 1) / 2) as week, items from public.projects;

grant select on public.online_weeks, public.online_projects to authenticated;

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
