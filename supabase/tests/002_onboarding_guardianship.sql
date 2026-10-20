-- Phase 2: onboarding RPCs, guardianship linking, DOB attestation, and the RLS around them.
begin;
\ir _helpers.psql

select plan(30);

select pg_temp.new_user('teen@t.local', 'junior')      as teen    \gset
select pg_temp.new_user('teen2@t.local', 'junior')     as teen2   \gset
select pg_temp.new_user('mom@t.local', 'parent')       as mom     \gset
select pg_temp.new_user('dad@t.local', 'parent')       as dad     \gset
select pg_temp.new_user('stranger@t.local', 'parent')  as stranger \gset
select pg_temp.new_user('biz@t.local', 'employer')     as biz     \gset

-- ── Teen onboarding ──────────────────────────────────────────────────────────
select pg_temp.act_as(:'teen');
select throws_like(
  format($$ select save_junior_profile('Maya R', %L, 'Skyline High', '98074', 'Sammamish') $$, pg_temp.dob_for_age(13)),
  '%at least 14%', 'a 13-year-old cannot sign up');
select throws_like(
  format($$ select save_junior_profile('Maya R', %L, 'Skyline High', '98074', 'Sammamish') $$, pg_temp.dob_for_age(18)),
  '%aged 14–17%', 'an 18-year-old cannot sign up as a teen');
select throws_like(
  format($$ select save_junior_profile('Maya R', %L, 'Skyline High', '10001', 'New York') $$, pg_temp.dob_for_age(15)),
  '%only in Washington%', 'out-of-state ZIP is rejected');
select lives_ok(
  format($$ select save_junior_profile('Maya Rodriguez', %L, 'Skyline High', '98074', 'Sammamish') $$, pg_temp.dob_for_age(15)),
  'a 15-year-old in WA can complete their profile');
select is((select status::text from profiles where id = :'teen'), 'pending', 'teen stays pending until a guardian is linked');
select results_eq(
  $$ select key, done from my_requirements() where key in ('profile', 'guardian') order by key $$,
  $$ values ('guardian', false), ('profile', true) $$,
  'teen checklist: profile done, guardian outstanding');

-- ── Invites ──────────────────────────────────────────────────────────────────
select throws_like($$ select create_guardian_invite() $$, '%Only parent%', 'teens cannot mint invite codes');

select pg_temp.act_as(:'mom');
select throws_like($$ select create_guardian_invite() $$, '%Finish your profile%', 'parent must onboard before inviting');
select lives_ok($$ select save_parent_profile('Priya Rodriguez', '98074', 'Sammamish') $$, 'parent completes profile');
select is((select blocking from my_requirements() where key = 'teen'), false, 'linking a teen is not blocking for a parent');
select create_guardian_invite() as code \gset
select matches(:'code'::text, '^[A-HJ-NP-Z2-9]{8}$', 'invite code is 8 unambiguous characters');

-- ── Redeem ───────────────────────────────────────────────────────────────────
select pg_temp.act_as(:'teen');
select is(link_guardian('ZZZZZZZZ'), null, 'a wrong code links nothing');
select pg_temp.act_as_system();
select is((select count(*)::int from invite_redeem_attempts where junior_id = :'teen' and not succeeded), 1,
  'the failed attempt is recorded for rate limiting');

select pg_temp.act_as(:'teen');
select lives_ok(format($$ select link_guardian(%L) $$, lower(substr(:'code', 1, 4) || '-' || substr(:'code', 5))),
  'code works case-insensitively and with a dash');
select is((select status::text from guardianships where junior_id = :'teen'), 'pending', 'new link is pending');

select pg_temp.act_as(:'teen2');
select lives_ok(format($$ select save_junior_profile('Jaden P', %L, 'Eastlake', '98075', 'Sammamish') $$, pg_temp.dob_for_age(16)), 'second teen onboards');
select is(link_guardian(:'code'), null, 'invite codes are single-use');

-- ── Visibility while pending ─────────────────────────────────────────────────
select pg_temp.act_as(:'mom');
select is((select full_name from profiles where id = :'teen'), 'Maya Rodriguez', 'parent sees the pending teen''s name to confirm them');
select pg_temp.act_as(:'stranger');
select is((select count(*)::int from juniors), 0, 'an unrelated parent sees no teens');
select pg_temp.act_as(:'biz');
select is((select count(*)::int from juniors), 0, 'employers cannot read teen records directly');

-- ── Attestation ──────────────────────────────────────────────────────────────
select pg_temp.act_as(:'mom');
select id as gid from guardianships where junior_id = :'teen' \gset
select pg_temp.act_as(:'teen');
select throws_like(format($$ select confirm_guardianship(%L, %L) $$, :'gid', pg_temp.dob_for_age(15)),
  '%not found%', 'a teen cannot confirm their own guardianship');

select pg_temp.act_as(:'mom');
select throws_like(format($$ select confirm_guardianship(%L, %L) $$, :'gid', pg_temp.dob_for_age(12)),
  '%aged 14–17%', 'parent cannot attest an under-14 date of birth');
select lives_ok(format($$ select confirm_guardianship(%L, %L) $$, :'gid', pg_temp.dob_for_age(15, 60)),
  'parent confirms with the real date of birth');
select is((select status::text from guardianships where id = :'gid'), 'active', 'the link becomes active once the guardian attests');
select is((select dob from juniors where profile_id = :'teen'), pg_temp.dob_for_age(15, 60),
  'the attested DOB (not the teen''s claim) is what''s stored');

select pg_temp.act_as(:'teen');
select throws_like(
  format($$ select save_junior_profile('Maya Rodriguez', %L, 'Skyline High', '98074', 'Sammamish') $$, pg_temp.dob_for_age(17)),
  '%confirmed by your parent%', 'teen cannot change DOB after attestation');
select throws_like(format($$ select remove_guardianship(%L) $$, :'gid'),
  '%Only your parent%', 'teen cannot cut an active guardian out');

select pg_temp.act_as(:'mom');
select remove_guardianship(:'gid');
select is((select count(*)::int from profiles where id = :'teen'), 0, 'once unlinked, the parent can no longer see the teen');
select pg_temp.act_as_system();
select is((select status::text from guardianships where id = :'gid'), 'revoked', 'the link is revoked');

-- ── Rate limit ───────────────────────────────────────────────────────────────
select pg_temp.act_as(:'teen2');
select link_guardian('WRONG' || n) from generate_series(1, 9) n;  -- teen2 already has 1 failure
select throws_like($$ select link_guardian('ANYTHING') $$, '%Too many wrong codes%', '10 wrong codes in an hour locks redeeming');

select * from finish();
rollback;
