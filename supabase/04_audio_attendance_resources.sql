-- Run once in Supabase → SQL Editor (after 01, 02, 03).
-- Adds: audio feedback comments, attendance, and the resource library.

-- ------------------------------------------------ audio feedback comments --
create table if not exists public.submission_comments (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  author_name   text not null default '',
  author_role   text not null default 'student',
  at_seconds    int check (at_seconds is null or at_seconds >= 0),
  body          text not null check (length(body) between 1 and 2000),
  created_at    timestamptz not null default now()
);
create index if not exists submission_comments_idx on public.submission_comments (submission_id, created_at);
alter table public.submission_comments enable row level security;

drop policy if exists sc_read on public.submission_comments;
create policy sc_read on public.submission_comments for select to authenticated using (
  public.is_instructor() or exists (select 1 from public.submissions s where s.id = submission_id and s.student_id = auth.uid())
);
drop policy if exists sc_insert on public.submission_comments;
create policy sc_insert on public.submission_comments for insert to authenticated with check (
  author_id = auth.uid() and (
    public.is_instructor() or exists (select 1 from public.submissions s where s.id = submission_id and s.student_id = auth.uid())
  )
);
drop policy if exists sc_delete on public.submission_comments;
create policy sc_delete on public.submission_comments for delete to authenticated using (author_id = auth.uid() or public.is_instructor());

-- --------------------------------------------------------------- attendance --
create table if not exists public.attendance (
  student_id uuid not null references public.profiles(id) on delete cascade,
  week       int  not null references public.weeks(week),
  status     text not null check (status in ('present','late','absent','excused')),
  note       text,
  marked_at  timestamptz not null default now(),
  primary key (student_id, week)
);
alter table public.attendance enable row level security;
drop policy if exists att_read on public.attendance;
create policy att_read  on public.attendance for select to authenticated using (student_id = auth.uid() or public.is_instructor());
drop policy if exists att_write on public.attendance;
create policy att_write on public.attendance for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());

-- ------------------------------------------------------------ resource library --
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  week        int references public.weeks(week),          -- null = whole course
  title       text not null check (length(title) between 1 and 160),
  description text,
  url         text,
  file_path   text,
  created_at  timestamptz not null default now(),
  check (url is not null or file_path is not null)
);
alter table public.resources enable row level security;
drop policy if exists res_read on public.resources;
create policy res_read  on public.resources for select to authenticated using (true);
drop policy if exists res_write on public.resources;
create policy res_write on public.resources for all    to authenticated using (public.is_instructor()) with check (public.is_instructor());

insert into storage.buckets (id, name, public) values ('resources', 'resources', false) on conflict (id) do nothing;
drop policy if exists resf_read on storage.objects;
create policy resf_read   on storage.objects for select to authenticated using (bucket_id = 'resources');
drop policy if exists resf_insert on storage.objects;
create policy resf_insert on storage.objects for insert to authenticated with check (bucket_id = 'resources' and public.is_instructor());
drop policy if exists resf_delete on storage.objects;
create policy resf_delete on storage.objects for delete to authenticated using (bucket_id = 'resources' and public.is_instructor());
