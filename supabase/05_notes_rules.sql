-- Run once in Supabase → SQL Editor (after 01–04).
-- Adds: private instructor notes and the studio-rules sign-off.

create table if not exists public.instructor_notes (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  body       text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.instructor_notes enable row level security;
drop policy if exists notes_all on public.instructor_notes;
create policy notes_all on public.instructor_notes for all to authenticated
  using (public.is_instructor()) with check (public.is_instructor());

alter table public.profiles add column if not exists rules_version     text;
alter table public.profiles add column if not exists rules_accepted_at timestamptz;
alter table public.profiles add column if not exists rules_signed_name text;
alter table public.profiles add column if not exists under_18          boolean not null default false;
alter table public.profiles add column if not exists guardian_ack      boolean not null default false;

-- Profile photos: make sure the avatars bucket is public so the pictures can be displayed.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do update set public = true;
drop policy if exists av_read on storage.objects;
create policy av_read on storage.objects for select using (bucket_id = 'avatars');
