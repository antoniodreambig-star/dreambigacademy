-- Run once in Supabase → SQL Editor (after 01–06 and 20). Safe to run again.
-- The Academy is now sold as THREE STANDALONE MODULES (A, B, C) instead of one long program.
--   * each class (cohort) teaches one module
--   * each application says which module the person wants
-- Existing classes and applications keep working: module = null means "older full-course class".

alter table public.cohorts      add column if not exists module text;
alter table public.cohorts      drop constraint if exists cohorts_module_check;
alter table public.cohorts      add constraint cohorts_module_check check (module is null or module in ('a','b','c'));

alter table public.applications add column if not exists module text;
alter table public.applications drop constraint if exists applications_module_check;
alter table public.applications add constraint applications_module_check check (module is null or module in ('a','b','c'));

-- New enrollments default to ONE module's price ($495, two payments). The app fills in the real numbers.
alter table public.enrollments alter column total_cents  set default 49500;
alter table public.enrollments alter column installments set default 2;
