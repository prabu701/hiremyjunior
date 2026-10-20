-- Relinking after an unlink.
--
-- Unlinking keeps the guardianship row (status 'revoked') as history, and (parent, junior) is
-- unique. Previously a fresh invite code from the same parent was refused with "already linked"
-- (and the insert would have hit the unique constraint). Now the revoked link is reopened as a
-- new pending request, which the parent confirms again like any other.
--
-- Confirming re-attests the date of birth. The "must match" rule exists so two guardians who are
-- both vouching can't disagree silently; it only applies when a *different*, still-active guardian
-- is vouching. Otherwise the confirming parent's attestation replaces the old one.

create or replace function public.redeem_guardian_invite(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  normalized text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  invite public.guardian_invites;
  existing public.guardianships;
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

  select * into existing from public.guardianships g
   where g.parent_id = invite.parent_id and g.junior_id = uid
   for update;
  if existing.id is not null and existing.status <> 'revoked' then
    perform public.fail(case when existing.status = 'pending'
      then 'You already sent this parent a request — they just need to confirm it.'
      else 'You''re already linked to this parent.' end);
  end if;
  if (select count(*) from public.guardianships g where g.junior_id = uid and g.status <> 'revoked') >= 4 then
    perform public.fail('You can link up to 4 parents or guardians.');
  end if;

  update public.guardian_invites set redeemed_by = uid, redeemed_at = now() where guardian_invites.code = invite.code;

  if existing.id is not null then
    update public.guardianships
       set status = 'pending', activated_at = null, revoked_at = null, revoked_by = null
     where id = existing.id;
    new_id := existing.id;
  else
    insert into public.guardianships (parent_id, junior_id) values (invite.parent_id, uid) returning id into new_id;
  end if;

  insert into public.invite_redeem_attempts (junior_id, succeeded) values (uid, true);
  perform public.refresh_profile_status(uid);
  return new_id;
end $$;

create or replace function public.confirm_guardianship(guardianship_id uuid, dob date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g public.guardianships;
  j public.juniors;
  age int;
  other_guardian boolean;
begin
  select * into g from public.guardianships where id = guardianship_id and parent_id = uid for update;
  if g.id is null then perform public.fail('Link request not found.'); end if;
  if g.status = 'revoked' then perform public.fail('This link was removed.'); end if;

  select * into j from public.juniors where profile_id = g.junior_id for update;
  age := public.age_on(dob);
  if age < 14 or age >= 18 then
    perform public.fail('HireMyJunior accounts are for teens aged 14–17. Check the date of birth.');
  end if;

  other_guardian := exists (
    select 1 from public.guardianships x
    where x.junior_id = g.junior_id and x.parent_id <> uid and x.status = 'active'
  );

  -- Two guardians vouching at once must agree; a mismatch needs a human.
  if other_guardian and j.dob is not null and j.dob <> dob then
    perform public.fail('That date of birth doesn''t match the one another guardian confirmed. Contact support.');
  end if;

  -- First attestation, or nobody else is vouching any more: this parent's attestation stands.
  if j.dob is null or not other_guardian then
    update public.juniors set dob = confirm_guardianship.dob, dob_attested_by = uid, dob_attested_at = now()
     where profile_id = g.junior_id;
  end if;

  update public.guardianships set status = 'active', activated_at = coalesce(activated_at, now()) where id = g.id;

  perform public.refresh_profile_status(g.junior_id);
  perform public.refresh_profile_status(uid);
end $$;
