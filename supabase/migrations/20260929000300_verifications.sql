-- Phase 3 — verification.
--
-- One polymorphic table for every check (phone, government ID, background check, proof of age,
-- business registration, Minor Work Permit Endorsement). Vendor calls happen in Edge Functions,
-- which report results through the svc_* functions below (service role only). Manual checks are
-- reviewed by admins through admin_review_verification().

create type public.verification_kind as enum (
  'phone', 'identity', 'background_check', 'supervisor_check',
  'proof_of_age', 'business_registration', 'work_permit'
);
create type public.verification_status as enum (
  'pending',      -- created; waiting on the person (e.g. SMS code sent, ID flow not finished)
  'processing',   -- with the vendor (e.g. Checkr report running)
  'needs_review', -- waiting on an HMJ admin
  'verified',
  'failed',
  'canceled'
);

create table public.verifications (
  id             uuid primary key default gen_random_uuid(),
  subject_id     uuid not null references public.profiles (id) on delete cascade,
  kind           public.verification_kind not null,
  -- 'twilio' | 'stripe_identity' | 'checkr' | 'manual' | 'mock_*'. mock_* = local simulation.
  provider       text not null,
  provider_ref   text,
  status         public.verification_status not null default 'pending',
  -- Storage path for uploaded evidence (bucket verification-docs).
  evidence_path  text,
  -- Non-sensitive context: e.g. {"phone": "+14255550123"} or {"name": "Jordan Lee"}. Never SSNs or ID numbers.
  details        jsonb not null default '{}',
  -- Server-only secrets for mock providers (e.g. a hashed SMS code). Not exposed to clients.
  secret         jsonb,
  failure_reason text,
  verified_at    timestamptz,
  expires_at     timestamptz,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- At most one live attempt per check; failed/canceled attempts stay as history.
create unique index verifications_one_live_per_kind
  on public.verifications (subject_id, kind)
  where status in ('pending', 'processing', 'needs_review', 'verified');
create index verifications_queue_idx on public.verifications (status, created_at) where status in ('needs_review', 'processing');
create index verifications_provider_ref_idx on public.verifications (provider, provider_ref);

create trigger verifications_touch_updated_at before update on public.verifications
  for each row execute function public.touch_updated_at();

-- Current state of a check for a person: the live attempt if any, else the most recent one.
create function public.latest_verification(uid uuid, k public.verification_kind) returns public.verifications
language sql stable security definer set search_path = '' as $$
  select v.* from public.verifications v
  where v.subject_id = uid and v.kind = k
  order by (v.status in ('pending', 'processing', 'needs_review', 'verified')) desc, v.created_at desc
  limit 1;
$$;

create function public.is_verified(uid uuid, k public.verification_kind) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.verifications v
    where v.subject_id = uid and v.kind = k and v.status = 'verified'
      and (v.expires_at is null or v.expires_at > now())
  );
$$;

-- Short, human hint for a checklist row, from the latest attempt.
create function public.verification_hint(uid uuid, k public.verification_kind) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.verifications := public.latest_verification(uid, k);
begin
  return case v.status
    when 'pending' then 'Started — finish the steps to continue'
    when 'processing' then case when k in ('background_check', 'supervisor_check')
                                then 'Check in progress — usually ready within 24 hours'
                                else 'Processing' end
    when 'needs_review' then 'In review — usually within 1 business day'
    when 'failed' then 'Didn''t pass' || coalesce(': ' || v.failure_reason, '') || ' — try again'
    else null
  end;
end $$;

-- ── Requirements, now with verification ────────────────────────────────────────
-- Replaces the Phase 2 definition (adds a `hint` column, so drop + recreate).

drop function public.my_requirements();
drop function public.refresh_profile_status(uuid);
drop function public.requirements_for(uuid);

create function public.requirements_for(uid uuid)
returns table (key text, label text, done boolean, sort int, hint text)
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.app_role;
  kind public.employer_kind;
  linked_unverified text;
begin
  select p.role into r from public.profiles p where p.id = uid;

  return query select 'profile'::text, 'Complete your profile'::text,
    (select p.onboarded_at is not null from public.profiles p where p.id = uid), 10, null::text;

  return query select 'phone'::text, 'Verify your phone number'::text,
    (select p.phone_verified_at is not null from public.profiles p where p.id = uid), 20,
    public.verification_hint(uid, 'phone');

  if r = 'junior' then
    -- A guardian only counts once their own identity is verified: the DOB attestation
    -- inherits the parent's verified identity.
    select string_agg(split_part(coalesce(pp.full_name, 'your parent'), ' ', 1), ' / ') into linked_unverified
      from public.guardianships g join public.profiles pp on pp.id = g.parent_id
     where g.junior_id = uid and g.status = 'active' and not public.is_verified(g.parent_id, 'identity');

    return query select 'guardian'::text, 'Link to a verified parent or guardian'::text,
      exists (
        select 1 from public.guardianships g
        join public.juniors j on j.profile_id = g.junior_id
        where g.junior_id = uid and g.status = 'active' and j.dob_attested_at is not null
          and public.is_verified(g.parent_id, 'identity')
      ), 30,
      case
        when linked_unverified is not null then 'Waiting for ' || linked_unverified || ' to verify their ID'
        when exists (select 1 from public.guardianships g where g.junior_id = uid and g.status = 'pending')
          then 'Waiting for your parent to confirm'
      end;
    return query select 'proof_of_age'::text, 'Upload proof of age'::text,
      public.is_verified(uid, 'proof_of_age'), 40, public.verification_hint(uid, 'proof_of_age');

  elsif r = 'parent' then
    return query select 'identity'::text, 'Verify your identity'::text,
      public.is_verified(uid, 'identity'), 30, public.verification_hint(uid, 'identity');
    return query select 'teen'::text, 'Link your teen'::text,
      exists (select 1 from public.guardianships g where g.parent_id = uid and g.status = 'active'), 90, null::text;

  elsif r = 'employer' then
    select e.kind into kind from public.employers e where e.profile_id = uid;
    return query select 'identity'::text,
      case when kind = 'business' then 'Verify the signer''s identity' else 'Verify your identity' end,
      public.is_verified(uid, 'identity'), 30, public.verification_hint(uid, 'identity');
    if kind = 'business' then
      return query select 'business_registration'::text, 'Confirm your WA business registration (UBI)'::text,
        public.is_verified(uid, 'business_registration'), 40, public.verification_hint(uid, 'business_registration');
      return query select 'work_permit'::text, 'Confirm your Minor Work Permit Endorsement'::text,
        public.is_verified(uid, 'work_permit'), 50, public.verification_hint(uid, 'work_permit');
      return query select 'supervisor_check'::text, 'Background-check your on-site supervisor'::text,
        public.is_verified(uid, 'supervisor_check'), 60, public.verification_hint(uid, 'supervisor_check');
    else
      return query select 'background_check'::text, 'Pass a background check'::text,
        public.is_verified(uid, 'background_check'), 40, public.verification_hint(uid, 'background_check');
    end if;
  end if;
end $$;

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
returns table (key text, label text, done boolean, blocking boolean, hint text)
language sql stable security definer set search_path = '' as $$
  select q.key, q.label, q.done, public.is_blocking_requirement(p.role, q.key), q.hint
  from public.profiles p, public.requirements_for(p.id) q
  where p.id = (select auth.uid())
  order by q.sort;
$$;

-- When a check changes, re-evaluate the subject — and, for a parent's identity, every teen whose
-- guardian requirement depends on it.
create function public.verifications_after_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  teen uuid;
begin
  perform public.refresh_profile_status(new.subject_id);
  if new.kind = 'identity' then
    for teen in select g.junior_id from public.guardianships g where g.parent_id = new.subject_id and g.status = 'active' loop
      perform public.refresh_profile_status(teen);
    end loop;
  end if;
  if new.kind = 'work_permit' then
    update public.employers
       set minor_work_permit_endorsement_verified_at = case when new.status = 'verified' then coalesce(new.verified_at, now()) end
     where profile_id = new.subject_id;
  end if;
  return null;
end $$;

create trigger verifications_after_change
  after insert or update of status on public.verifications
  for each row execute function public.verifications_after_change();

-- Guardianship changes already refresh both parties (Phase 2 RPCs); confirm_guardianship also
-- needs to re-check once the parent later verifies, which the trigger above covers.

-- ── Service-role API (Edge Functions) ──────────────────────────────────────────

-- Start (or restart) a check. Cancels any live attempt of the same kind first.
create function public.svc_start_verification(
  uid uuid, k public.verification_kind, provider text, provider_ref text default null,
  status public.verification_status default 'pending', details jsonb default '{}', secret jsonb default null
) returns public.verifications
language plpgsql security definer set search_path = '' as $$
declare
  rec public.verifications;
begin
  if public.is_verified(uid, k) then
    raise exception 'already verified' using errcode = 'P0001', hint = 'hmj';
  end if;
  update public.verifications v set status = 'canceled'
   where v.subject_id = uid and v.kind = k and v.status in ('pending', 'processing', 'needs_review');
  insert into public.verifications (subject_id, kind, provider, provider_ref, status, details, secret)
  values (uid, k, provider, provider_ref, status, coalesce(details, '{}'), secret)
  returning * into rec;
  return rec;
end $$;

create function public.svc_complete_verification(
  verification_id uuid, outcome public.verification_status, reason text default null,
  valid_for interval default null, extra_details jsonb default null
) returns public.verifications
language plpgsql security definer set search_path = '' as $$
declare
  rec public.verifications;
begin
  update public.verifications v
     set status = outcome,
         failure_reason = case when outcome = 'failed' then reason end,
         verified_at = case when outcome = 'verified' then now() end,
         expires_at = case when outcome = 'verified' and valid_for is not null then now() + valid_for end,
         details = v.details || coalesce(extra_details, '{}'),
         secret = null
   where v.id = verification_id and v.status in ('pending', 'processing', 'needs_review')
  returning * into rec;
  return rec; -- null when already finished (webhooks can be retried; treat as a no-op)
end $$;

-- Phone verification writes the verified number onto the profile.
create function public.svc_mark_phone_verified(uid uuid, verified_phone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Setting phone fires profiles_clear_phone_verification, so stamp the verification after.
  update public.profiles set phone = verified_phone where id = uid;
  update public.profiles set phone_verified_at = now() where id = uid;
  perform public.refresh_profile_status(uid);
end $$;

-- ── Client RPCs ───────────────────────────────────────────────────────────────

create function public.submit_proof_of_age(evidence_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  rec public.verifications;
begin
  if not public.current_role_is('junior') then perform public.fail('Only teen accounts upload proof of age.'); end if;
  -- The upload must be in the teen's own folder (enforced again by storage RLS).
  if split_part(evidence_path, '/', 1) <> uid::text then perform public.fail('Upload the document again.'); end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'verification-docs' and o.name = evidence_path) then
    perform public.fail('We couldn''t find that upload. Please try again.');
  end if;
  if public.is_verified(uid, 'proof_of_age') then perform public.fail('Your proof of age is already verified.'); end if;

  rec := public.svc_start_verification(uid, 'proof_of_age', 'manual', null, 'needs_review');
  update public.verifications set evidence_path = submit_proof_of_age.evidence_path where id = rec.id;
  return rec.id;
end $$;

create function public.submit_business_verification() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  e public.employers;
begin
  select * into e from public.employers where profile_id = uid;
  if e.kind is distinct from 'business' then perform public.fail('Only business accounts need this.'); end if;
  if not public.is_verified(uid, 'business_registration') then
    perform public.svc_start_verification(uid, 'business_registration', 'manual', e.ubi, 'needs_review',
      jsonb_build_object('ubi', e.ubi, 'legal_name', e.legal_name));
  end if;
  if not public.is_verified(uid, 'work_permit') then
    perform public.svc_start_verification(uid, 'work_permit', 'manual', e.ubi, 'needs_review',
      jsonb_build_object('ubi', e.ubi, 'legal_name', e.legal_name));
  end if;
end $$;

-- ── Admin ─────────────────────────────────────────────────────────────────────

create function public.admin_review_verification(verification_id uuid, approve boolean, reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.verifications;
begin
  if not public.is_admin() then perform public.fail('Admins only.'); end if;
  select * into v from public.verifications where id = verification_id for update;
  if v.id is null then perform public.fail('Verification not found.'); end if;
  if v.status <> 'needs_review' and not (v.status = 'processing' and v.provider like 'mock%') then
    perform public.fail('This check isn''t waiting for review.');
  end if;
  if not approve and coalesce(trim(reason), '') = '' then perform public.fail('Give a reason so the person knows what to fix.'); end if;

  perform public.svc_complete_verification(
    v.id,
    case when approve then 'verified'::public.verification_status else 'failed'::public.verification_status end,
    reason,
    -- Background checks are re-run yearly; WA work permit endorsements renew with the business license.
    case when v.kind in ('background_check', 'supervisor_check', 'work_permit') then interval '1 year' end
  );
  update public.verifications set reviewed_by = (select auth.uid()), reviewed_at = now() where id = v.id;
end $$;

-- Admin queue with the subject's name and role.
create function public.admin_verification_queue()
returns table (id uuid, kind public.verification_kind, status public.verification_status, provider text,
               created_at timestamptz, evidence_path text, details jsonb,
               subject_id uuid, subject_name text, subject_email text, subject_role public.app_role)
language sql stable security definer set search_path = '' as $$
  select v.id, v.kind, v.status, v.provider, v.created_at, v.evidence_path, v.details,
         p.id, p.full_name, p.email, p.role
  from public.verifications v join public.profiles p on p.id = v.subject_id
  where public.is_admin()
    and (v.status = 'needs_review' or (v.status = 'processing' and v.provider like 'mock%'))
  order by v.created_at;
$$;

-- Admins are provisioned via the service role (GoTrue admin API sets app_metadata.role, which
-- users cannot set themselves). See scripts/create-admin.mjs.
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  if new.raw_app_meta_data ->> 'role' = 'admin' then
    insert into public.profiles (id, role, email, status, onboarded_at)
    values (new.id, 'admin', new.email, 'active', now());
    return new;
  end if;

  if requested is null or requested not in ('junior', 'parent', 'employer') then
    raise exception 'invalid sign-up role: %', coalesce(requested, '<none>')
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, role, email, phone)
  values (new.id, requested::public.app_role, new.email, new.phone);
  return new;
end $$;

-- ── Storage: private bucket for ID/age documents ──────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "verification-docs: owner uploads to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification-docs: owner reads own" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification-docs: admins read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());

-- ── RLS & grants ──────────────────────────────────────────────────────────────

alter table public.verifications enable row level security;

create policy "verifications: subject reads own" on public.verifications for select to authenticated
  using (subject_id = (select auth.uid()));
create policy "verifications: admins read" on public.verifications for select to authenticated
  using (public.is_admin());
-- A parent can see their linked teen's verification states.
create policy "verifications: guardians read" on public.verifications for select to authenticated
  using (public.is_guardian_of(subject_id, include_pending => true));

-- Everything except the mock secret column.
grant select (id, subject_id, kind, provider, provider_ref, status, evidence_path, details, failure_reason,
              verified_at, expires_at, reviewed_by, reviewed_at, created_at, updated_at)
  on public.verifications to authenticated;

revoke execute on function
  public.requirements_for(uuid), public.refresh_profile_status(uuid),
  public.svc_start_verification(uuid, public.verification_kind, text, text, public.verification_status, jsonb, jsonb),
  public.svc_complete_verification(uuid, public.verification_status, text, interval, jsonb),
  public.svc_mark_phone_verified(uuid, text),
  public.latest_verification(uuid, public.verification_kind)
from public, anon, authenticated;

grant execute on function
  public.svc_start_verification(uuid, public.verification_kind, text, text, public.verification_status, jsonb, jsonb),
  public.svc_complete_verification(uuid, public.verification_status, text, interval, jsonb),
  public.svc_mark_phone_verified(uuid, text)
to service_role;

grant execute on function
  public.my_requirements(), public.submit_proof_of_age(text), public.submit_business_verification(),
  public.admin_review_verification(uuid, boolean, text), public.admin_verification_queue()
to authenticated;

-- Requirements changed; re-evaluate every existing account against the new rules.
select public.refresh_profile_status(id) from public.profiles;
