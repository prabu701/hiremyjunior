-- Phase 1 — identity foundation.
-- One profiles row per auth.users row. Role is chosen at sign-up and never changed by the user.

-- PostGIS is needed from Phase 4 (service areas, job locations); enabling it early keeps
-- every environment identical from the first migration.
create extension if not exists postgis with schema extensions;

create type public.app_role as enum ('junior', 'parent', 'employer', 'admin');
create type public.profile_status as enum ('pending', 'active', 'suspended');
create type public.theme_key as enum ('citrus', 'electric', 'sunset', 'midnight');
create type public.corner_style as enum ('sharp', 'rounded');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.app_role not null,
  full_name    text check (char_length(full_name) <= 120),
  email        text,
  phone        text,
  avatar_url   text,
  -- 'pending' until the role's onboarding + verification completes (Phases 2–3).
  status       public.profile_status not null default 'pending',
  theme        public.theme_key not null default 'midnight',
  corner_style public.corner_style not null default 'sharp',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is '1:1 with auth.users. role is immutable from the client; admin is granted only via service role.';

-- Keep updated_at honest.
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create the profile when GoTrue creates the user. The requested role comes from
-- signInWithOtp({ options: { data: { role } } }), which is client-controlled — so
-- anything other than the three self-serve roles is rejected outright.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  if requested is null or requested not in ('junior', 'parent', 'employer') then
    raise exception 'invalid sign-up role: %', coalesce(requested, '<none>')
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, role, email, phone)
  values (new.id, requested::public.app_role, new.email, new.phone);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper for policies. security definer so it can read profiles without recursing through RLS.
create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ── Row-level security ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: admins read all"
  on public.profiles for select to authenticated
  using (public.is_admin());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policies: rows are created by the trigger and removed by cascade.

-- Column-level grants: clients may edit presentation fields only. role, status and
-- email are server-controlled even on the user's own row.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, theme, corner_style) on public.profiles to authenticated;
grant execute on function public.is_admin() to authenticated;
