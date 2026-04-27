-- v3: phone numbers + verified flag + theme preference

alter table public.users
  add column if not exists phone text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists phone_shared_at timestamptz,
  add column if not exists theme text not null default 'auto' check (theme in ('auto', 'light', 'dark'));

create index if not exists users_phone_idx on public.users (phone) where phone is not null;
