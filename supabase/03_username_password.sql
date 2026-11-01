-- Run once in Supabase → SQL Editor (after 01 and 02).
-- Adds a username to each profile. Students (and you) pick it, plus a password,
-- the first time they sign in with the emailed link.

alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_.]{3,24}$');

create unique index if not exists profiles_username_key on public.profiles (username);
