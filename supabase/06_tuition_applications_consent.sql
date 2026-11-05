-- Run once in Supabase → SQL Editor (after 01–05). Safe to run again.
-- Adds: tuition & payment tracking, the public application flow, and guardian consent for students under 18.

-- --------------------------------------------------------------- housekeeping --
-- Let trusted database functions (not students) update protected profile fields such as consent_signed.
-- Signed-in students are still blocked from changing role, email, class, consent or calendar token.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_instructor() then
    new.role := old.role; new.email := old.email; new.cohort_id := old.cohort_id;
    new.consent_signed := old.consent_signed; new.calendar_token := old.calendar_token;
  end if;
  return new;
end;
$$;

-- --------------------------------------------------------------- app settings --
-- Small key/value table. Holds the Square payment links shown to students.
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
create policy settings_read  on public.app_settings for select to authenticated using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());
insert into public.app_settings (key, value) values ('square_link_full', ''), ('square_link_monthly', '') on conflict do nothing;

-- ---------------------------------------------------------- tuition & payments --
-- The payment plan an accepted applicant picked (shown as the default when you set up their plan).
alter table public.invites add column if not exists plan text;
alter table public.invites drop constraint if exists invites_plan_check;
alter table public.invites add constraint invites_plan_check check (plan is null or plan in ('full','monthly'));

-- One row per student: which plan, how much in total, how many installments, when the first one is due.
create table if not exists public.enrollments (
  student_id   uuid primary key references public.profiles(id) on delete cascade,
  plan         text not null check (plan in ('full','monthly')),
  total_cents  int  not null default 150000 check (total_cents >= 0),
  installments int  not null default 6 check (installments between 1 and 24),
  first_due    date not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.enrollments enable row level security;
drop policy if exists enr_read on public.enrollments;
create policy enr_read  on public.enrollments for select to authenticated using (student_id = auth.uid() or public.is_instructor());
drop policy if exists enr_write on public.enrollments;
create policy enr_write on public.enrollments for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- Every payment you record (Square, cash, Zelle...). Students can read their own.
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  amount_cents int  not null check (amount_cents > 0),
  paid_on      date not null default current_date,
  method       text not null default 'other' check (method in ('square','cash','zelle','card','check','other')),
  note         text,
  recorded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists payments_student_idx on public.payments (student_id, paid_on);
alter table public.payments enable row level security;
drop policy if exists pay_read on public.payments;
create policy pay_read  on public.payments for select to authenticated using (student_id = auth.uid() or public.is_instructor());
drop policy if exists pay_write on public.payments;
create policy pay_write on public.payments for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- ---------------------------------------------------------------- applications --
create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  status         text not null default 'new' check (status in ('new','accepted','waitlist','declined')),
  full_name      text not null check (length(full_name) between 2 and 120),
  email          text not null check (email = lower(email) and length(email) between 5 and 200),
  phone          text check (phone is null or length(phone) <= 40),
  birth_date     date not null,
  under_18       boolean not null default false,
  guardian_name  text check (guardian_name  is null or length(guardian_name)  <= 120),
  guardian_email text check (guardian_email is null or length(guardian_email) <= 200),
  guardian_phone text check (guardian_phone is null or length(guardian_phone) <= 40),
  experience     text check (experience is null or length(experience) <= 2000),
  goals          text check (goals      is null or length(goals)      <= 2000),
  referral       text check (referral   is null or length(referral)   <= 300),
  plan           text check (plan is null or plan in ('full','monthly')),
  cohort_id      uuid references public.cohorts(id) on delete set null,
  decided_at     timestamptz,
  decision_note  text check (decision_note is null or length(decision_note) <= 2000)
);
create index if not exists applications_status_idx on public.applications (status, created_at desc);
alter table public.applications enable row level security;
-- Anyone (not signed in) can submit an application, but only as "new". Only instructors can read or change them.
drop policy if exists apps_apply on public.applications;
create policy apps_apply on public.applications for insert to anon, authenticated
  with check (status = 'new' and decided_at is null and decision_note is null);
drop policy if exists apps_staff on public.applications;
create policy apps_staff on public.applications for all to authenticated using (public.is_instructor()) with check (public.is_instructor());
grant insert on public.applications to anon;

-- -------------------------------------------------------------- guardian consent --
create table if not exists public.guardian_consents (
  id              uuid primary key default gen_random_uuid(),
  token           uuid not null unique default gen_random_uuid(),   -- the secret in the link emailed to the guardian
  application_id  uuid references public.applications(id) on delete set null,
  student_email   text not null check (student_email = lower(student_email)),
  student_name    text not null default '',
  guardian_name   text not null default '',
  guardian_email  text,
  status          text not null default 'pending' check (status in ('pending','signed')),
  requested_at    timestamptz not null default now(),
  last_sent_at    timestamptz,
  signed_name     text,
  relationship    text,
  phone           text,
  emergency_name  text,
  emergency_phone text,
  media_ok        boolean not null default false,
  version         text,
  signed_at       timestamptz
);
create index if not exists guardian_consents_email_idx on public.guardian_consents (student_email);
alter table public.guardian_consents enable row level security;
drop policy if exists gc_staff on public.guardian_consents;
create policy gc_staff on public.guardian_consents for all to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- Guardians are not signed in. They reach their own record only through these two functions, by secret token.
create or replace function public.consent_lookup(p_token uuid)
returns table (student_name text, guardian_name text, status text, signed_name text, signed_at timestamptz, version text)
language sql stable security definer set search_path = public as $$
  select student_name, guardian_name, status, signed_name, signed_at, version
  from public.guardian_consents where token = p_token;
$$;

create or replace function public.consent_sign(
  p_token uuid, p_signed_name text, p_relationship text, p_phone text,
  p_emergency_name text, p_emergency_phone text, p_media_ok boolean, p_version text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare rec public.guardian_consents%rowtype;
begin
  select * into rec from public.guardian_consents where token = p_token for update;
  if not found or rec.status = 'signed' then return false; end if;
  if length(trim(coalesce(p_signed_name, ''))) < 2 then return false; end if;
  update public.guardian_consents set
    status = 'signed',
    signed_name = left(trim(p_signed_name), 120),
    relationship = left(trim(coalesce(p_relationship, '')), 60),
    phone = left(trim(coalesce(p_phone, '')), 40),
    emergency_name = left(trim(coalesce(p_emergency_name, '')), 120),
    emergency_phone = left(trim(coalesce(p_emergency_phone, '')), 40),
    media_ok = coalesce(p_media_ok, false),
    version = left(coalesce(p_version, ''), 20),
    signed_at = now()
  where id = rec.id;
  update public.profiles set consent_signed = true where lower(email) = rec.student_email;
  return true;
end;
$$;

revoke all on function public.consent_lookup(uuid) from public;
revoke all on function public.consent_sign(uuid, text, text, text, text, text, boolean, text) from public;
grant execute on function public.consent_lookup(uuid) to anon, authenticated;
grant execute on function public.consent_sign(uuid, text, text, text, text, text, boolean, text) to anon, authenticated;

-- If the guardian signs before the student has created an account, mark the profile as consented when it is created.
create or replace function public.sync_consent_on_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if exists (select 1 from public.guardian_consents where student_email = lower(new.email) and status = 'signed') then
      update public.profiles set consent_signed = true where id = new.id;
    end if;
  exception when others then
    null; -- never block a sign-up over this
  end;
  return null;
end;
$$;
drop trigger if exists sync_consent on public.profiles;
create trigger sync_consent after insert on public.profiles for each row execute function public.sync_consent_on_profile();
