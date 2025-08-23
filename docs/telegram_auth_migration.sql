-- =====================================
-- Telegram Auth migration for Supabase
-- =====================================

-- PREREQ: existing tables rooms/messages/metrics (from initial schema)
-- This migration makes rooms private by default, adds user profiles keyed by Telegram,
-- membership table, secure RLS, and helper RPCs.
-- Safe to run multiple times (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ---------- Tables ----------

create table if not exists public.profiles (
  user_key text primary key,                       -- 'tg:<telegram_id>'
  telegram_id bigint not null unique,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.room_members (
  room_id text references public.rooms(id) on delete cascade,
  user_key text references public.profiles(user_key) on delete cascade,
  role text check (role in ('owner','member')) default 'member',
  joined_at timestamptz default now(),
  primary key (room_id, user_key)
);

alter table public.rooms add column if not exists is_private boolean default true;

alter table public.messages
  add column if not exists author_key text references public.profiles(user_key);

create index if not exists idx_room_members_user on public.room_members(user_key);

-- ---------- Enable RLS ----------

alter table public.profiles enable row level security;
alter table public.room_members enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;

-- ---------- Helper view & function ----------

create or replace view public._current_user as
select (auth.jwt() ->> 'sub') as user_key;

create or replace function public.current_user_key()
returns text language sql stable as $$
  select auth.jwt() ->> 'sub'
$$;

-- ---------- Drop legacy open policies (if existed) ----------

drop policy if exists "rooms select all" on public.rooms;
drop policy if exists "rooms insert all" on public.rooms;

drop policy if exists "messages select all" on public.messages;
drop policy if exists "messages insert limited" on public.messages;

-- keep metrics policy as-is (insert-only)
-- drop policy if exists "metrics insert" on public.metrics;
-- create policy "metrics insert" on public.metrics for insert with check (true);

-- ---------- New policies ----------

-- profiles: self-only
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select"
  on public.profiles for select
  using (user_key = (select user_key from public._current_user));

drop policy if exists "profiles upsert self" on public.profiles;
create policy "profiles upsert self"
  on public.profiles for insert
  with check (user_key = (select user_key from public._current_user));

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
  on public.profiles for update
  using (user_key = (select user_key from public._current_user));

-- rooms: private unless member; allow public rooms later if is_private=false
drop policy if exists "rooms scoped" on public.rooms;
create policy "rooms scoped"
  on public.rooms for select
  using (
    not is_private
    or exists (
      select 1 from public.room_members m
      where m.room_id = id and m.user_key = (select user_key from public._current_user)
    )
  );

-- room_members: read own memberships
drop policy if exists "room_members self select" on public.room_members;
create policy "room_members self select"
  on public.room_members for select
  using (user_key = (select user_key from public._current_user));

-- messages: only members can read/insert; insert must match current user
drop policy if exists "messages select scoped" on public.messages;
create policy "messages select scoped"
  on public.messages for select
  using (
    exists (
      select 1 from public.room_members m
      where m.room_id = room_id and m.user_key = (select user_key from public._current_user)
    )
  );

drop policy if exists "messages insert member" on public.messages;
create policy "messages insert member"
  on public.messages for insert
  with check (
    author_key = (select user_key from public._current_user)
    and exists (
      select 1 from public.room_members m
      where m.room_id = room_id and m.user_key = (select user_key from public._current_user)
    )
    and char_length(content) <= 4000
  );

-- ---------- RPC helpers ----------

-- Create room and grant ownership to current user
create or replace function public.create_room(p_room_id text, p_private boolean default true)
returns void
language plpgsql
security definer
as $$
declare k text := (auth.jwt()->>'sub');
begin
  if k is null then
    raise exception 'unauthorized';
  end if;

  insert into public.rooms(id, is_private)
  values (p_room_id, coalesce(p_private, true))
  on conflict do nothing;

  insert into public.room_members(room_id, user_key, role)
  values (p_room_id, k, 'owner')
  on conflict (room_id, user_key) do update set role='owner';
end
$$;

-- Join an existing room as member
create or replace function public.join_room(p_room_id text)
returns void
language plpgsql
security definer
as $$
declare k text := (auth.jwt()->>'sub');
begin
  if k is null then
    raise exception 'unauthorized';
  end if;

  insert into public.room_members(room_id, user_key, role)
  values (p_room_id, k, 'member')
  on conflict do nothing;
end
$$;

-- ---------- Realtime publication (ensure) ----------
alter publication supabase_realtime add table public.messages;
