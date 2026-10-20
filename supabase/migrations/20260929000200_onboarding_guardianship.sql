-- Phase 2 — onboarding and guardianship.
--
-- Role detail tables hang off profiles. Juniors are structurally dependent: they can't become
-- active without at least one ACTIVE guardianship, and a guardian (not the teen) attests their
-- date of birth. All writes go through security-definer RPCs so validation lives in one place;
-- clients get SELECT via RLS only.

create extension if not exists citext with schema extensions;

create type public.employer_kind as enum ('household', 'business');
create type public.guardianship_status as enum ('pending', 'active', 'revoked');

-- ── Shared helpers ─────────────────────────────────────────────────────────────

-- Whole years between dob and on_date.
create function public.age_on(dob date, on_date date default current_date) returns int
language sql immutable as $$
  select extract(year from age(on_date, dob))::int;
$$;

create function public.current_role_is(expected public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = expected);
$$;

-- Raise a client-safe error. errcode P0001 + a stable hint lets the app map messages.
create function public.fail(message text, hint text default null) returns void
language plpgsql as $$
begin
  raise exception '%', message using errcode = 'P0001', hint = coalesce(hint, 'hmj');
end $$;

-- ── Profiles: verified phone tracking ──────────────────────────────────────────

alter table public.profiles
  add column phone_verified_at timestamptz,
  add column onboarded_at timestamptz;

comment on column public.profiles.phone_verified_at is 'Set by the phone verification flow (Phase 3). Cleared whenever phone changes.';
comment on column public.profiles.onboarded_at is 'Set when the role-specific profile form is first completed.';

create function public.profiles_clear_phone_verification() returns trigger
language plpgsql as $$
begin
  if new.phone is distinct from old.phone then
    new.phone_verified_at := null;
  end if;
  return new;
end $$;

create trigger profiles_clear_phone_verification
  before update of phone on public.profiles
  for each row execute function public.profiles_clear_phone_verification();

-- ── Role detail tables ─────────────────────────────────────────────────────────

create table public.juniors (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  -- What the teen typed. Kept for audit; never used for eligibility.
  dob_claimed     date not null,
  -- The date of birth a guardian attested. This is the one that counts.
  dob             date,
  dob_attested_by uuid references public.profiles (id) on delete set null,
  dob_attested_at timestamptz,
  school_name     text not null check (char_length(school_name) between 2 and 120),
  zip             text not null references public.zip_centroids (zip),
  city            text not null check (char_length(city) between 2 and 60),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint dob_attestation_complete check ((dob is null) = (dob_attested_at is null))
);

create table public.parents (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  zip        text not null references public.zip_centroids (zip),
  city       text not null check (char_length(city) between 2 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employers (
  profile_id       uuid primary key references public.profiles (id) on delete cascade,
  kind             public.employer_kind not null,
  -- What teens see: "The Chen Family" or "Sammamish Pet Supply".
  display_name     text not null check (char_length(display_name) between 2 and 80),
  zip              text not null references public.zip_centroids (zip),
  city             text not null check (char_length(city) between 2 and 60),
  -- Business (Track B) only.
  legal_name       text check (char_length(legal_name) <= 160),
  ubi              text check (ubi ~ '^\d{9}$'),
  supervisor_name  text check (char_length(supervisor_name) <= 120),
  supervisor_email extensions.citext,
  minor_work_permit_endorsement_verified_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint business_fields_present check (
    kind = 'household'
    or (legal_name is not null and ubi is not null and supervisor_name is not null and supervisor_email is not null)
  )
);

create trigger juniors_touch_updated_at before update on public.juniors for each row execute function public.touch_updated_at();
create trigger parents_touch_updated_at before update on public.parents for each row execute function public.touch_updated_at();
create trigger employers_touch_updated_at before update on public.employers for each row execute function public.touch_updated_at();

-- ── Guardianship ───────────────────────────────────────────────────────────────
-- Many-to-many: two parents, or split households, are the normal case.

create table public.guardianships (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid not null references public.profiles (id) on delete cascade,
  junior_id    uuid not null references public.profiles (id) on delete cascade,
  status       public.guardianship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at   timestamptz,
  revoked_by   uuid references public.profiles (id) on delete set null,
  unique (parent_id, junior_id)
);
create index guardianships_junior_idx on public.guardianships (junior_id) where status <> 'revoked';

-- Parent-issued, single-use codes the teen types in. Short-lived and rate-limited on redeem.
create table public.guardian_invites (
  code        text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  redeemed_by uuid references public.profiles (id) on delete set null,
  redeemed_at timestamptz
);
create index guardian_invites_parent_idx on public.guardian_invites (parent_id);

create table public.invite_redeem_attempts (
  id         bigint generated always as identity primary key,
  junior_id  uuid not null references public.profiles (id) on delete cascade,
  succeeded  boolean not null,
  at         timestamptz not null default now()
);
create index invite_redeem_attempts_recent_idx on public.invite_redeem_attempts (junior_id, at);

-- Is the caller a guardian of this junior? Security definer so policies on other tables can
-- use it without recursing through guardianships' own RLS.
create function public.is_guardian_of(junior uuid, include_pending boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.guardianships g
    where g.junior_id = junior
      and g.parent_id = (select auth.uid())
      and (g.status = 'active' or (include_pending and g.status = 'pending'))
  );
$$;

-- ── Setup requirements & status ────────────────────────────────────────────────
-- One definition of "what does this account still need", used both to compute
-- profiles.status and to render the checklist in the app. Phase 3 extends it with
-- verification requirements.

create function public.requirements_for(uid uuid)
returns table (key text, label text, done boolean, sort int)
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.app_role;
begin
  select p.role into r from public.profiles p where p.id = uid;

  return query select 'profile'::text, 'Complete your profile'::text,
    (select p.onboarded_at is not null from public.profiles p where p.id = uid), 10;

  if r = 'junior' then
    return query select 'guardian'::text, 'Link to a parent or guardian'::text,
      exists (select 1 from public.guardianships g where g.junior_id = uid and g.status = 'active'), 20;
  elsif r = 'parent' then
    return query select 'teen'::text, 'Link your teen'::text,
      exists (select 1 from public.guardianships g where g.parent_id = uid and g.status = 'active'), 90;
  end if;
end $$;

-- A parent without a linked teen is still a fully usable account; that item is guidance only.
create function public.is_blocking_requirement(role public.app_role, key text) returns boolean
language sql immutable as $$
  select not (role = 'parent' and key = 'teen');
$$;

create function public.refresh_profile_status(uid uuid) returns public.profile_status
language plpgsql security definer set search_path = '' as $$
declare
  r public.app_role;
  current_status public.profile_status;
  next_status public.profile_status;
begin
  select role, status into r, current_status from public.profiles where id = uid for update;
  if current_status = 'suspended' or r = 'admin' then
    return current_status;
  end if;

  next_status := case
    when exists (
      select 1 from public.requirements_for(uid) q
      where not q.done and public.is_blocking_requirement(r, q.key)
    ) then 'pending'::public.profile_status
    else 'active'::public.profile_status
  end;

  if next_status is distinct from current_status then
    update public.profiles set status = next_status where id = uid;
  end if;
  return next_status;
end $$;

create function public.my_requirements()
returns table (key text, label text, done boolean, blocking boolean)
language sql stable security definer set search_path = '' as $$
  select q.key, q.label, q.done, public.is_blocking_requirement(p.role, q.key)
  from public.profiles p, public.requirements_for(p.id) q
  where p.id = (select auth.uid())
  order by q.sort;
$$;

-- ── Onboarding RPCs ────────────────────────────────────────────────────────────

-- Phone is not collected here: it's set only by phone verification (Phase 3), so a profile edit
-- can never silently un-verify it.
create function public.save_junior_profile(
  full_name text, dob date, school_name text, zip text, city text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  existing public.juniors;
  age int;
begin
  if not public.current_role_is('junior') then perform public.fail('Only teen accounts can do this.'); end if;
  if char_length(trim(full_name)) < 2 then perform public.fail('Enter your full name.'); end if;
  if not exists (select 1 from public.zip_centroids z where z.zip = save_junior_profile.zip) then
    perform public.fail('HireMyJunior is only in Washington right now — enter a WA ZIP code.');
  end if;

  select * into existing from public.juniors j where j.profile_id = uid;

  -- Once a guardian has attested the DOB, the teen can no longer change it.
  if existing.dob_attested_at is not null and dob is distinct from existing.dob_claimed then
    perform public.fail('Your date of birth was confirmed by your parent. Ask them to contact support to change it.');
  end if;

  age := public.age_on(dob);
  if age < 14 then perform public.fail('You need to be at least 14 to use HireMyJunior.'); end if;
  if age >= 18 then perform public.fail('HireMyJunior is for teens aged 14–17.'); end if;

  update public.profiles p
     set full_name = trim(save_junior_profile.full_name),
         onboarded_at = coalesce(p.onboarded_at, now())
   where p.id = uid;

  insert into public.juniors (profile_id, dob_claimed, school_name, zip, city)
  values (uid, dob, trim(school_name), zip, trim(city))
  on conflict (profile_id) do update
    set dob_claimed = excluded.dob_claimed,
        school_name = excluded.school_name,
        zip = excluded.zip,
        city = excluded.city;

  perform public.refresh_profile_status(uid);
end $$;

create function public.save_parent_profile(full_name text, zip text, city text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if not public.current_role_is('parent') then perform public.fail('Only parent accounts can do this.'); end if;
  if char_length(trim(full_name)) < 2 then perform public.fail('Enter your full name.'); end if;
  if not exists (select 1 from public.zip_centroids z where z.zip = save_parent_profile.zip) then
    perform public.fail('HireMyJunior is only in Washington right now — enter a WA ZIP code.');
  end if;

  update public.profiles p
     set full_name = trim(save_parent_profile.full_name),
         onboarded_at = coalesce(p.onboarded_at, now())
   where p.id = uid;

  insert into public.parents (profile_id, zip, city) values (uid, zip, trim(city))
  on conflict (profile_id) do update set zip = excluded.zip, city = excluded.city;

  perform public.refresh_profile_status(uid);
end $$;

create function public.save_employer_profile(
  full_name text, kind public.employer_kind, display_name text, zip text, city text,
  legal_name text default null, ubi text default null,
  supervisor_name text default null, supervisor_email text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  existing public.employers;
begin
  if not public.current_role_is('employer') then perform public.fail('Only employer accounts can do this.'); end if;
  if char_length(trim(full_name)) < 2 then perform public.fail('Enter your full name.'); end if;
  if not exists (select 1 from public.zip_centroids z where z.zip = save_employer_profile.zip) then
    perform public.fail('HireMyJunior is only in Washington right now — enter a WA ZIP code.');
  end if;

  select * into existing from public.employers e where e.profile_id = uid;
  if existing.profile_id is not null and existing.kind <> kind then
    perform public.fail('Household and business accounts are verified differently, so this can''t be switched. Contact support.');
  end if;

  if kind = 'business' then
    ubi := regexp_replace(coalesce(ubi, ''), '\D', '', 'g');
    if ubi !~ '^\d{9}$' then perform public.fail('Enter your 9-digit WA UBI number.'); end if;
    if char_length(trim(coalesce(legal_name, ''))) < 2 then perform public.fail('Enter the business''s legal name.'); end if;
    if char_length(trim(coalesce(supervisor_name, ''))) < 2 then perform public.fail('Name the on-site supervisor teens will report to.'); end if;
    if coalesce(supervisor_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.fail('Enter the supervisor''s email.'); end if;
  else
    legal_name := null; ubi := null; supervisor_name := null; supervisor_email := null;
  end if;

  update public.profiles p
     set full_name = trim(save_employer_profile.full_name),
         onboarded_at = coalesce(p.onboarded_at, now())
   where p.id = uid;

  insert into public.employers (profile_id, kind, display_name, zip, city, legal_name, ubi, supervisor_name, supervisor_email)
  values (uid, kind, trim(display_name), zip, trim(city), trim(legal_name), ubi, trim(supervisor_name), lower(trim(supervisor_email)))
  on conflict (profile_id) do update
    set display_name = excluded.display_name,
        zip = excluded.zip,
        city = excluded.city,
        legal_name = excluded.legal_name,
        ubi = excluded.ubi,
        supervisor_name = excluded.supervisor_name,
        supervisor_email = excluded.supervisor_email;

  perform public.refresh_profile_status(uid);
end $$;

-- ── Guardianship RPCs ──────────────────────────────────────────────────────────

create function public.create_guardian_invite() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  new_code text;
begin
  if not public.current_role_is('parent') then perform public.fail('Only parent accounts can invite a teen.'); end if;
  if (select onboarded_at from public.profiles where id = uid) is null then
    perform public.fail('Finish your profile before inviting your teen.');
  end if;
  if (select count(*) from public.guardian_invites
       where parent_id = uid and redeemed_at is null and expires_at > now()) >= 5 then
    perform public.fail('You already have 5 unused invite codes. Use or let one expire first.');
  end if;

  loop
    select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '')
      into new_code from generate_series(1, 8);
    begin
      insert into public.guardian_invites (code, parent_id) values (new_code, uid);
      exit;
    exception when unique_violation then
      -- astronomically unlikely; draw again
    end;
  end loop;
  return new_code;
end $$;

create function public.redeem_guardian_invite(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  normalized text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  invite public.guardian_invites;
  new_id uuid;
begin
  if not public.current_role_is('junior') then perform public.fail('Only teen accounts can use an invite code.'); end if;
  if not exists (select 1 from public.juniors where profile_id = uid) then
    perform public.fail('Finish your profile first — your parent needs to see who they''re linking.');
  end if;
  if (select count(*) from public.invite_redeem_attempts a
       where a.junior_id = uid and not a.succeeded and a.at > now() - interval '1 hour') >= 10 then
    perform public.fail('Too many wrong codes. Wait an hour and try again.');
  end if;

  select * into invite from public.guardian_invites i
   where i.code = normalized and i.redeemed_at is null and i.expires_at > now()
   for update;

  if invite.code is null then
    -- link_guardian() catches P0002 and records the failed attempt outside this rollback.
    raise exception 'That code isn''t valid or has expired. Ask your parent for a new one.'
      using errcode = 'P0002', hint = 'hmj';
  end if;

  if exists (select 1 from public.guardianships g where g.parent_id = invite.parent_id and g.junior_id = uid) then
    perform public.fail('You''re already linked to this parent.');
  end if;
  if (select count(*) from public.guardianships g where g.junior_id = uid and g.status <> 'revoked') >= 4 then
    perform public.fail('You can link up to 4 parents or guardians.');
  end if;

  update public.guardian_invites set redeemed_by = uid, redeemed_at = now() where guardian_invites.code = invite.code;
  insert into public.guardianships (parent_id, junior_id) values (invite.parent_id, uid) returning id into new_id;
  insert into public.invite_redeem_attempts (junior_id, succeeded) values (uid, true);
  return new_id;
end $$;

-- What clients call. A wrong code returns NULL instead of raising: an error would roll back the
-- failed-attempt row too, and the rate limit above would never trip.
create function public.link_guardian(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result uuid;
begin
  begin
    result := public.redeem_guardian_invite(code);
  exception when sqlstate 'P0002' then
    insert into public.invite_redeem_attempts (junior_id, succeeded) values ((select auth.uid()), false);
    return null;
  end;
  return result;
end $$;

create function public.confirm_guardianship(guardianship_id uuid, dob date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g public.guardianships;
  j public.juniors;
  age int;
begin
  select * into g from public.guardianships where id = guardianship_id and parent_id = uid for update;
  if g.id is null then perform public.fail('Link request not found.'); end if;
  if g.status = 'revoked' then perform public.fail('This link was removed.'); end if;

  select * into j from public.juniors where profile_id = g.junior_id for update;
  age := public.age_on(dob);
  if age < 14 or age >= 18 then
    perform public.fail('HireMyJunior accounts are for teens aged 14–17. Check the date of birth.');
  end if;

  -- A second guardian must agree with the first; a mismatch needs a human.
  if j.dob is not null and j.dob <> dob then
    perform public.fail('That date of birth doesn''t match the one another guardian confirmed. Contact support.');
  end if;

  if j.dob is null then
    update public.juniors set dob = confirm_guardianship.dob, dob_attested_by = uid, dob_attested_at = now()
     where profile_id = g.junior_id;
  end if;

  update public.guardianships set status = 'active', activated_at = coalesce(activated_at, now()) where id = g.id;

  perform public.refresh_profile_status(g.junior_id);
  perform public.refresh_profile_status(uid);
end $$;

create function public.remove_guardianship(guardianship_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g public.guardianships;
begin
  select * into g from public.guardianships where id = guardianship_id for update;
  if g.id is null or uid not in (g.parent_id, g.junior_id) then perform public.fail('Link not found.'); end if;
  -- A teen can back out of a pending request, but can't cut an active guardian out.
  if uid = g.junior_id and g.status = 'active' then
    perform public.fail('Only your parent or guardian can remove an active link.');
  end if;

  update public.guardianships set status = 'revoked', revoked_at = now(), revoked_by = uid where id = g.id;
  perform public.refresh_profile_status(g.junior_id);
  perform public.refresh_profile_status(g.parent_id);
end $$;

-- ── Row-level security ─────────────────────────────────────────────────────────

alter table public.juniors enable row level security;
alter table public.parents enable row level security;
alter table public.employers enable row level security;
alter table public.guardianships enable row level security;
alter table public.guardian_invites enable row level security;
alter table public.invite_redeem_attempts enable row level security;

create policy "juniors: read own" on public.juniors for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "juniors: guardians read" on public.juniors for select to authenticated
  using (public.is_guardian_of(profile_id, include_pending => true));
create policy "juniors: admins read" on public.juniors for select to authenticated
  using (public.is_admin());

create policy "parents: read own" on public.parents for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "parents: admins read" on public.parents for select to authenticated
  using (public.is_admin());

create policy "employers: read own" on public.employers for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "employers: admins read" on public.employers for select to authenticated
  using (public.is_admin());

create policy "guardianships: parties read" on public.guardianships for select to authenticated
  using (parent_id = (select auth.uid()) or junior_id = (select auth.uid()));
create policy "guardianships: admins read" on public.guardianships for select to authenticated
  using (public.is_admin());

create policy "guardian_invites: parent reads own" on public.guardian_invites for select to authenticated
  using (parent_id = (select auth.uid()));

-- invite_redeem_attempts: no client access at all.

-- Parent and teen can see each other's profile (name, contact) while linked.
create policy "profiles: linked family reads" on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.guardianships g
      where g.status <> 'revoked'
        and ((g.parent_id = (select auth.uid()) and g.junior_id = profiles.id)
          or (g.junior_id = (select auth.uid()) and g.parent_id = profiles.id))
    )
  );

grant select on public.juniors, public.parents, public.employers, public.guardianships, public.guardian_invites to authenticated;

-- Onboarding writes go through RPCs; phone/name edits too (so validation is uniform).
revoke update (full_name, phone) on public.profiles from authenticated;

revoke execute on function public.redeem_guardian_invite(text) from public, anon, authenticated;
revoke execute on function public.refresh_profile_status(uuid) from public, anon, authenticated;
revoke execute on function public.requirements_for(uuid) from public, anon, authenticated;
revoke execute on function public.fail(text, text) from public, anon, authenticated;

grant execute on function
  public.my_requirements(),
  public.save_junior_profile(text, date, text, text, text),
  public.save_parent_profile(text, text, text),
  public.save_employer_profile(text, public.employer_kind, text, text, text, text, text, text, text),
  public.create_guardian_invite(),
  public.link_guardian(text),
  public.confirm_guardianship(uuid, date),
  public.remove_guardianship(uuid)
to authenticated;
