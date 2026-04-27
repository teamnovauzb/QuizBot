-- v2 schema: bookmarks, assignments, achievements, difficulty, images,
-- categories, bot_config, login_tokens, broadcast_deliveries, question_history.

------------------------------------------------------------------------
-- Difficulty enum
------------------------------------------------------------------------
do $$ begin
  create type difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

------------------------------------------------------------------------
-- Categories — replaces hardcoded list
------------------------------------------------------------------------
create table if not exists public.categories (
  slug        text primary key,
  name_uz     text not null,
  name_ru     text not null,
  name_en     text not null,
  icon        text,
  sort_order  smallint not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.categories (slug, name_uz, name_ru, name_en, sort_order) values
  ('Excel',      'Excel',      'Excel',      'Excel',       10),
  ('Word',       'Word',       'Word',       'Word',        20),
  ('PowerPoint', 'PowerPoint', 'PowerPoint', 'PowerPoint',  30),
  ('Cloud',      'Bulut',      'Облако',     'Cloud',       40),
  ('Hardware',   'Apparat',    'Железо',     'Hardware',    50),
  ('OS',         'OT',         'ОС',         'OS',          60),
  ('Network',    'Tarmoq',     'Сеть',       'Network',     70),
  ('I/O',        'Kirish/Chiqish', 'Ввод/Вывод', 'Input/Output', 80),
  ('Umumiy',     'Umumiy',     'Общее',      'General',    100)
on conflict (slug) do nothing;

------------------------------------------------------------------------
-- Questions: add difficulty, image_url, explanation surfaced
------------------------------------------------------------------------
alter table public.questions
  add column if not exists difficulty difficulty not null default 'medium',
  add column if not exists image_url text,
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists questions_difficulty_idx on public.questions (difficulty) where active;

------------------------------------------------------------------------
-- Question history (versioning)
------------------------------------------------------------------------
create table if not exists public.question_history (
  id           bigserial primary key,
  question_id  uuid not null references public.questions(id) on delete cascade,
  edited_by    bigint references public.users(telegram_id) on delete set null,
  edited_at    timestamptz not null default now(),
  -- snapshot of fields at time of edit
  question     text not null,
  options      text[] not null,
  correct_index smallint not null,
  category     text not null,
  difficulty   difficulty not null,
  explanation  text
);
create index if not exists question_history_qid_idx on public.question_history (question_id, edited_at desc);

create or replace function public.log_question_edit() returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.question_history (question_id, edited_by, question, options, correct_index, category, difficulty, explanation)
  values (old.id, public.tg_id(), old.question, old.options, old.correct_index, old.category, old.difficulty, old.explanation);
  return new;
end $$;

drop trigger if exists trg_log_question_edit on public.questions;
create trigger trg_log_question_edit
  before update on public.questions
  for each row when (
    old.question is distinct from new.question
    or old.options is distinct from new.options
    or old.correct_index is distinct from new.correct_index
    or old.category is distinct from new.category
    or old.difficulty is distinct from new.difficulty
    or old.explanation is distinct from new.explanation
  )
  execute function public.log_question_edit();

------------------------------------------------------------------------
-- Bookmarks
------------------------------------------------------------------------
create table if not exists public.bookmarks (
  user_id     bigint not null references public.users(telegram_id) on delete cascade,
  question_id uuid   not null references public.questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

------------------------------------------------------------------------
-- Achievements (definitions + per-user grants)
------------------------------------------------------------------------
create table if not exists public.achievements (
  slug        text primary key,
  name_uz     text not null,
  name_ru     text not null,
  name_en     text not null,
  desc_uz     text,
  desc_ru     text,
  desc_en     text,
  icon        text not null default 'sparkle',
  threshold   integer not null default 1,
  kind        text not null check (kind in ('streak','attempts','perfect','category','total_correct','speed','first'))
);

insert into public.achievements (slug, name_uz, name_ru, name_en, desc_uz, desc_ru, desc_en, icon, threshold, kind) values
  ('first_quiz',      'Birinchi qadam', 'Первый шаг', 'First step',
                      'Birinchi sinov tugadi', 'Первый тест завершён', 'First quiz completed',
                      'flag', 1, 'first'),
  ('perfect_10',      'Toza-besh', 'Идеально', 'Flawless',
                      '10/10 yakunlandi', '10 из 10', '10 out of 10',
                      'star', 10, 'perfect'),
  ('streak_7',        'Bir hafta', 'Неделя', 'Seven-day streak',
                      '7 kun ketma-ket', '7 дней подряд', 'Seven days in a row',
                      'flame', 7, 'streak'),
  ('streak_30',       'Bir oy', 'Месяц', 'Thirty-day streak',
                      '30 kun ketma-ket', '30 дней подряд', 'Thirty days in a row',
                      'flame', 30, 'streak'),
  ('attempts_50',     'Yarim asr', 'Пятидесятка', 'Half-century',
                      '50 sinov bajarilgan', '50 тестов завершено', '50 quizzes completed',
                      'book', 50, 'attempts'),
  ('attempts_100',    'Yuzlik', 'Сотня', 'Centurion',
                      '100 sinov bajarilgan', '100 тестов завершено', '100 quizzes completed',
                      'book', 100, 'attempts'),
  ('total_correct_500','Yarim ming', 'Полтыщи', 'Half-thousand',
                      '500 to''g''ri javob', '500 правильных', '500 correct answers',
                      'check', 500, 'total_correct'),
  ('cat_excel',       'Excel ustasi', 'Мастер Excel', 'Excel master',
                      'Excelda 90% to''g''ri javob (10+ savol)', 'Excel: 90% (10+ вопросов)', 'Excel mastered (90%, 10+ qs)',
                      'star', 90, 'category'),
  ('cat_hardware',    'Apparat ustasi', 'Мастер железа', 'Hardware master',
                      'Hardware 90%+', 'Железо 90%+', 'Hardware 90%+',
                      'star', 90, 'category'),
  ('speed_demon',     'Tezkor', 'Стрелок', 'Speed demon',
                      'Savolga o''rtacha 5 soniyadan kam', 'В среднем < 5 сек / вопрос', 'Avg < 5s per question',
                      'flame', 5, 'speed')
on conflict (slug) do nothing;

create table if not exists public.user_achievements (
  user_id     bigint not null references public.users(telegram_id) on delete cascade,
  achievement_slug text not null references public.achievements(slug) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_slug)
);
create index if not exists user_ach_user_idx on public.user_achievements (user_id, unlocked_at desc);

------------------------------------------------------------------------
-- Assignments (admin creates a curated set, assigns to a group)
------------------------------------------------------------------------
create table if not exists public.assignments (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  group_id     uuid references public.groups(id) on delete cascade,
  created_by   bigint not null references public.users(telegram_id) on delete cascade,
  question_ids uuid[] not null default '{}'::uuid[],
  time_per_q   smallint not null default 30,
  deadline     timestamptz,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists assignments_group_idx on public.assignments (group_id, deadline);

create table if not exists public.assignment_completions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id       bigint not null references public.users(telegram_id) on delete cascade,
  attempt_id    uuid references public.attempts(id) on delete set null,
  completed_at  timestamptz not null default now(),
  score         smallint not null,
  total         smallint not null,
  primary key (assignment_id, user_id)
);

------------------------------------------------------------------------
-- Bot config (system-wide settings: welcome msg, reminder time, etc.)
------------------------------------------------------------------------
create table if not exists public.bot_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  bigint references public.users(telegram_id) on delete set null
);

insert into public.bot_config (key, value) values
  ('welcome_message_uz', '"Salom! Shifokoratga xush kelibsiz. /start tugmasini bosing."'::jsonb),
  ('welcome_message_ru', '"Привет! Добро пожаловать в Шифокорат."'::jsonb),
  ('welcome_message_en', '"Hi! Welcome to Shifokorat."'::jsonb),
  ('daily_reminder_hour', '19'::jsonb),
  ('daily_reminder_enabled', 'true'::jsonb),
  ('default_quiz_count', '10'::jsonb),
  ('default_time_per_q', '30'::jsonb),
  ('miniapp_url', '"https://shifokorat.vercel.app"'::jsonb)
on conflict (key) do nothing;

------------------------------------------------------------------------
-- Login tokens (deep-link / web-login flows)
------------------------------------------------------------------------
create table if not exists public.login_tokens (
  token       text primary key,
  user_id     bigint references public.users(telegram_id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'consumed', 'expired')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '5 minutes')
);
create index if not exists login_tokens_status_idx on public.login_tokens (status, expires_at);

------------------------------------------------------------------------
-- Broadcast deliveries (track per-recipient delivery state)
------------------------------------------------------------------------
create table if not exists public.broadcast_deliveries (
  id            uuid primary key default uuid_generate_v4(),
  broadcast_id  uuid not null references public.broadcasts(id) on delete cascade,
  user_id       bigint not null references public.users(telegram_id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','sent','failed','blocked')),
  error         text,
  sent_at       timestamptz,
  primary key (id)
);
create index if not exists broadcast_deliveries_b_idx on public.broadcast_deliveries (broadcast_id, status);

------------------------------------------------------------------------
-- Helper: real streak calculation
------------------------------------------------------------------------
create or replace function public.user_streak(uid bigint) returns integer
language sql stable
set search_path = public, pg_temp
as $$
  with d as (
    select distinct (started_at at time zone 'utc')::date as day
    from public.attempts
    where user_id = uid
    order by day desc
  ), nums as (
    select day, row_number() over (order by day desc) - 1 as rn from d
  )
  select coalesce(count(*)::int, 0)
  from nums
  where day = (current_date - rn);
$$;

create or replace function public.user_total_correct(uid bigint) returns integer
language sql stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(score), 0)::int from public.attempts where user_id = uid
$$;

create or replace function public.user_avg_pct(uid bigint) returns numeric
language sql stable
set search_path = public, pg_temp
as $$
  select coalesce(round(avg(score::numeric * 100 / nullif(total,0)), 0), 0)
  from public.attempts where user_id = uid
$$;

create or replace function public.user_category_pct(uid bigint, cat text) returns numeric
language sql stable
set search_path = public, pg_temp
as $$
  select coalesce(round(avg(score::numeric * 100 / nullif(total,0)), 0), 0)
  from public.attempts where user_id = uid and category = cat
$$;

------------------------------------------------------------------------
-- Leaderboard view
------------------------------------------------------------------------
create or replace view public.leaderboard as
select
  u.telegram_id,
  u.name,
  u.username,
  u.photo_url,
  u.group_id,
  count(a.id)::int as attempts,
  coalesce(sum(a.score),0)::int as total_correct,
  coalesce(round(avg(a.score::numeric * 100 / nullif(a.total,0)), 1), 0) as avg_pct,
  coalesce(sum(a.score),0)::int * 10 + count(a.id)::int as score_index
from public.users u
left join public.attempts a on a.user_id = u.telegram_id
where u.role = 'user' and not u.blocked
group by u.telegram_id;

------------------------------------------------------------------------
-- RLS for new tables
------------------------------------------------------------------------
alter table public.categories                enable row level security;
alter table public.question_history          enable row level security;
alter table public.bookmarks                 enable row level security;
alter table public.achievements              enable row level security;
alter table public.user_achievements         enable row level security;
alter table public.assignments               enable row level security;
alter table public.assignment_completions    enable row level security;
alter table public.bot_config                enable row level security;
alter table public.login_tokens              enable row level security;
alter table public.broadcast_deliveries      enable row level security;

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);
drop policy if exists categories_super on public.categories;
create policy categories_super on public.categories for all using (public.is_super()) with check (public.is_super());

drop policy if exists question_history_admin_read on public.question_history;
create policy question_history_admin_read on public.question_history for select using (public.is_admin_or_super());

drop policy if exists bookmarks_self on public.bookmarks;
create policy bookmarks_self on public.bookmarks for all using (user_id = public.tg_id()) with check (user_id = public.tg_id());

drop policy if exists ach_read on public.achievements;
create policy ach_read on public.achievements for select using (true);
drop policy if exists ach_super on public.achievements;
create policy ach_super on public.achievements for all using (public.is_super()) with check (public.is_super());

drop policy if exists user_ach_self on public.user_achievements;
create policy user_ach_self on public.user_achievements for select using (user_id = public.tg_id());
drop policy if exists user_ach_admin on public.user_achievements;
create policy user_ach_admin on public.user_achievements for select using (public.is_admin_or_super());
drop policy if exists user_ach_self_insert on public.user_achievements;
create policy user_ach_self_insert on public.user_achievements for insert with check (user_id = public.tg_id());

drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments for select using (
  active and (
    group_id is null
    or group_id in (select group_id from public.users where auth_uid = auth.uid())
    or public.is_admin_or_super()
  )
);
drop policy if exists assignments_admin_write on public.assignments;
create policy assignments_admin_write on public.assignments for all
  using (public.is_admin_or_super()) with check (public.is_admin_or_super());

drop policy if exists assignment_comp_self on public.assignment_completions;
create policy assignment_comp_self on public.assignment_completions for all
  using (user_id = public.tg_id()) with check (user_id = public.tg_id());
drop policy if exists assignment_comp_admin_read on public.assignment_completions;
create policy assignment_comp_admin_read on public.assignment_completions for select using (public.is_admin_or_super());

drop policy if exists bot_config_read on public.bot_config;
create policy bot_config_read on public.bot_config for select using (true);
drop policy if exists bot_config_super on public.bot_config;
create policy bot_config_super on public.bot_config for all using (public.is_super()) with check (public.is_super());

-- login_tokens: only super-admins should read; service_role uses elevated key
drop policy if exists login_tokens_super_read on public.login_tokens;
create policy login_tokens_super_read on public.login_tokens for select using (public.is_super());

drop policy if exists broadcast_del_super on public.broadcast_deliveries;
create policy broadcast_del_super on public.broadcast_deliveries for all using (public.is_super()) with check (public.is_super());
