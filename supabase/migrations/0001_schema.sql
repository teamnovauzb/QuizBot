-- Shifokorat — initial schema
-- Run with: supabase db push  (or paste into SQL editor)

create extension if not exists "uuid-ossp";

------------------------------------------------------------------------
-- enums
------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'admin', 'superadmin');
exception when duplicate_object then null; end $$;

------------------------------------------------------------------------
-- users
-- telegram_id is the natural primary key; auth_uid links to auth.users
-- (created lazily by the tg-auth edge function via signInWithCustomToken)
------------------------------------------------------------------------
create table if not exists public.users (
  telegram_id  bigint primary key,
  auth_uid     uuid unique,
  username     text,
  name         text not null,
  photo_url    text,
  language     text default 'uz',
  role         user_role not null default 'user',
  group_id     uuid,
  blocked      boolean not null default false,
  joined_at    timestamptz not null default now(),
  last_active  timestamptz not null default now()
);
create index if not exists users_role_idx       on public.users (role);
create index if not exists users_group_id_idx   on public.users (group_id);
create index if not exists users_last_active_ix on public.users (last_active desc);

------------------------------------------------------------------------
-- groups
------------------------------------------------------------------------
create table if not exists public.groups (
  id        uuid primary key default uuid_generate_v4(),
  name      text not null,
  admin_id  bigint not null references public.users(telegram_id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.users
  drop constraint if exists users_group_id_fkey,
  add  constraint users_group_id_fkey
    foreign key (group_id) references public.groups(id) on delete set null;

------------------------------------------------------------------------
-- questions
------------------------------------------------------------------------
create table if not exists public.questions (
  id            uuid primary key default uuid_generate_v4(),
  number        serial,
  category      text not null default 'Umumiy',
  question      text not null,
  options       text[] not null,
  correct_index smallint not null check (correct_index >= 0 and correct_index < 10),
  explanation   text,
  active        boolean not null default true,
  created_by    bigint references public.users(telegram_id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists questions_cat_idx on public.questions (category) where active;

------------------------------------------------------------------------
-- attempts
------------------------------------------------------------------------
create table if not exists public.attempts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      bigint not null references public.users(telegram_id) on delete cascade,
  category     text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  duration_ms  integer,
  score        smallint not null default 0,
  total        smallint not null,
  question_ids uuid[] not null,
  answers      jsonb not null default '[]'::jsonb
);
create index if not exists attempts_user_started_idx on public.attempts (user_id, started_at desc);
create index if not exists attempts_started_idx     on public.attempts (started_at desc);

------------------------------------------------------------------------
-- audit log
------------------------------------------------------------------------
create table if not exists public.audit (
  id          uuid primary key default uuid_generate_v4(),
  ts          timestamptz not null default now(),
  actor_id    bigint not null references public.users(telegram_id) on delete cascade,
  actor_role  user_role not null,
  action      text not null,
  target      text
);
create index if not exists audit_ts_idx on public.audit (ts desc);

------------------------------------------------------------------------
-- broadcasts
------------------------------------------------------------------------
create table if not exists public.broadcasts (
  id          uuid primary key default uuid_generate_v4(),
  sent_at     timestamptz not null default now(),
  sent_by     bigint not null references public.users(telegram_id) on delete cascade,
  recipients  text not null check (recipients in ('all', 'admins', 'users')),
  recipient_count integer not null,
  title       text not null,
  body        text not null
);

------------------------------------------------------------------------
-- helper: current telegram id of the authed user
------------------------------------------------------------------------
create or replace function public.tg_id() returns bigint
language sql stable as $$
  select telegram_id from public.users where auth_uid = auth.uid()
$$;

create or replace function public.is_role(r user_role) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.users where auth_uid = auth.uid() and role = r and not blocked
  )
$$;

create or replace function public.is_admin_or_super() returns boolean
language sql stable as $$
  select exists (
    select 1 from public.users where auth_uid = auth.uid() and role in ('admin','superadmin') and not blocked
  )
$$;

create or replace function public.is_super() returns boolean
language sql stable as $$
  select exists (
    select 1 from public.users where auth_uid = auth.uid() and role = 'superadmin' and not blocked
  )
$$;

------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------
alter table public.users      enable row level security;
alter table public.groups     enable row level security;
alter table public.questions  enable row level security;
alter table public.attempts   enable row level security;
alter table public.audit      enable row level security;
alter table public.broadcasts enable row level security;

-- USERS
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users
  for select using ( auth_uid = auth.uid() );

drop policy if exists users_admin_read on public.users;
create policy users_admin_read on public.users
  for select using ( public.is_admin_or_super() );

drop policy if exists users_super_write on public.users;
create policy users_super_write on public.users
  for all using ( public.is_super() ) with check ( public.is_super() );

drop policy if exists users_admin_block on public.users;
create policy users_admin_block on public.users
  for update using ( public.is_admin_or_super() ) with check ( public.is_admin_or_super() );

-- GROUPS
drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select using ( true );

drop policy if exists groups_super_write on public.groups;
create policy groups_super_write on public.groups
  for all using ( public.is_super() ) with check ( public.is_super() );

-- QUESTIONS
drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions for select using ( active or public.is_admin_or_super() );

drop policy if exists questions_admin_write on public.questions;
create policy questions_admin_write on public.questions
  for all using ( public.is_admin_or_super() ) with check ( public.is_admin_or_super() );

-- ATTEMPTS
drop policy if exists attempts_self on public.attempts;
create policy attempts_self on public.attempts
  for all using ( user_id = public.tg_id() ) with check ( user_id = public.tg_id() );

drop policy if exists attempts_admin_read on public.attempts;
create policy attempts_admin_read on public.attempts
  for select using ( public.is_admin_or_super() );

-- AUDIT
drop policy if exists audit_super_read on public.audit;
create policy audit_super_read on public.audit
  for select using ( public.is_super() );

drop policy if exists audit_self_insert on public.audit;
create policy audit_self_insert on public.audit
  for insert with check ( actor_id = public.tg_id() );

-- BROADCASTS
drop policy if exists broadcasts_super_all on public.broadcasts;
create policy broadcasts_super_all on public.broadcasts
  for all using ( public.is_super() ) with check ( public.is_super() );
