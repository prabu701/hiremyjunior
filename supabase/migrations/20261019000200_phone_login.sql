-- Phone-number sign-in (4-digit code), driven by the phone-login Edge Function.
--
-- GoTrue's own phone OTP is fixed at 6+ digits, so the Edge Function issues and checks the code
-- itself (Twilio Verify when configured; a fixed test code or a Mailpit-delivered code locally)
-- and then has GoTrue mint an ordinary session. Everything after sign-in is unchanged.

create table public.phone_login_challenges (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null check (phone ~ '^\+1\d{10}$'),
  provider    text not null check (provider in ('twilio', 'test', 'mock')),
  code_hash   text,                      -- mock provider only
  attempts    int not null default 0,
  verified_at timestamptz,               -- code accepted (account may still need a role)
  consumed_at timestamptz,               -- session issued
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '10 minutes'
);
create index phone_login_challenges_phone_idx on public.phone_login_challenges (phone, created_at desc);

-- Server-only table: RLS on, no policies, no client grants.
alter table public.phone_login_challenges enable row level security;

-- Accounts this phone signs into: a verified profile phone (any account that verified it), or a
-- phone-first account created by this flow. Unconfirmed GoTrue phones never match.
create function public.svc_find_accounts_by_phone(e164 text)
returns table (user_id uuid, email text, auth_phone text, role public.app_role, status public.profile_status)
language sql stable security definer set search_path = '' as $$
  select distinct u.id, u.email::text, u.phone::text, p.role, p.status
  from auth.users u
  join public.profiles p on p.id = u.id
  where (p.phone = e164 and p.phone_verified_at is not null)
     or (u.phone = ltrim(e164, '+') and u.phone_confirmed_at is not null);
$$;

revoke execute on function public.svc_find_accounts_by_phone(text) from public, anon, authenticated;
grant execute on function public.svc_find_accounts_by_phone(text) to service_role;
