-- Phase 3: verification requirements, service-role APIs, admin review, storage evidence.
begin;
\ir _helpers.psql

select plan(28);

select pg_temp.new_user('teen@t.local', 'junior')   as teen   \gset
select pg_temp.new_user('mom@t.local', 'parent')    as mom    \gset
select pg_temp.new_user('home@t.local', 'employer') as home   \gset
select pg_temp.new_user('shop@t.local', 'employer') as shop   \gset
select pg_temp.new_user('other@t.local', 'junior')  as other  \gset

-- Admins can only come from app_metadata (service-role admin API), never user metadata.
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ops@t.local',
        '{"role":"admin"}', '{}', now(), now());
select id as ops from profiles where email = 'ops@t.local' \gset
select is((select role::text from profiles where id = :'ops'), 'admin', 'app_metadata.role=admin provisions an admin');
-- The admin API path: created as a normal user, then app_metadata updated.
select pg_temp.new_user('ops2@t.local', 'parent') as ops2 \gset
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}') || '{"role":"admin"}' where id = :'ops2';
select is((select role::text from profiles where id = :'ops2'), 'admin', 'setting app_metadata.role=admin later promotes the account');

-- Onboard everyone.
select pg_temp.act_as(:'mom');
select save_parent_profile('Priya R', '98074', 'Sammamish');
select is((select status::text from profiles where id = :'mom'), 'pending', 'an onboarded parent now also needs phone + ID');
select results_eq($$ select key from my_requirements() where not done $$, $$ values ('phone'), ('identity'), ('teen') $$,
  'parent checklist: phone, identity, teen');
select create_guardian_invite() as code \gset

select pg_temp.act_as(:'teen');
select save_junior_profile('Maya R', pg_temp.dob_for_age(15), 'Skyline', '98074', 'Sammamish');
select link_guardian(:'code');
select pg_temp.act_as(:'mom');
select confirm_guardianship((select id from guardianships where junior_id = :'teen'), pg_temp.dob_for_age(15));

select pg_temp.act_as(:'teen');
select is((select done from my_requirements() where key = 'guardian'), false, 'a link to an unverified parent does not count yet');
select matches((select hint from my_requirements() where key = 'guardian'), 'Waiting for Priya to verify', 'hint names the parent who still needs to verify');

-- ── Service-role functions are not callable by users ─────────────────────────
select throws_ok(format($$ select svc_start_verification(%L, 'identity', 'x') $$, :'teen'), '42501', null, 'users cannot start checks directly');
select throws_ok(format($$ select svc_mark_phone_verified(%L, '+1') $$, :'teen'), '42501', null, 'users cannot mark their phone verified');

-- ── Parent verifies (as the Edge Functions would) ───────────────────────────
set local role service_role;
select (svc_start_verification(:'mom', 'identity', 'mock_stripe_identity')).id as vid \gset
select svc_complete_verification((:'vid')::uuid, 'verified');
select svc_mark_phone_verified(:'mom', '+14255550100');
select pg_temp.act_as_system();
select is((select status::text from profiles where id = :'mom'), 'active', 'parent with phone + ID is active');
select ok((select phone_verified_at is not null from profiles where id = :'mom'), 'phone verification is stamped');
select ok((svc_complete_verification((:'vid')::uuid, 'failed', 'late webhook')).id is null, 'a finished check ignores late/retried results');

select pg_temp.act_as(:'teen');
select is((select done from my_requirements() where key = 'guardian'), true, 'the teen''s link counts as soon as the parent verifies');
select is((select status::text from profiles where id = :'teen'), 'pending', 'teen still needs phone + proof of age');

-- ── Proof of age (manual review) ─────────────────────────────────────────────
select throws_like(format($$ select submit_proof_of_age(%L) $$, :'teen' || '/missing.jpg'), '%couldn''t find%', 'submission requires the uploaded file');
select throws_like(format($$ select submit_proof_of_age(%L) $$, :'other' || '/id.jpg'), '%Upload the document again%', 'cannot submit a file from someone else''s folder');

select pg_temp.act_as_system();
insert into storage.objects (bucket_id, name, owner) values ('verification-docs', :'teen' || '/id.jpg', :'teen');
select pg_temp.act_as(:'teen');
select submit_proof_of_age(:'teen' || '/id.jpg') as poa \gset
select is((select status::text from verifications where id = :'poa'), 'needs_review', 'proof of age goes to review');
select throws_like(format($$ select admin_review_verification(%L, true) $$, :'poa'), '%Admins only%', 'a teen cannot approve their own document');

select pg_temp.act_as(:'mom');
select is((select count(*)::int from verifications where subject_id = :'teen'), 1, 'a guardian can see their teen''s checks');
select pg_temp.act_as(:'home');
select is((select count(*)::int from verifications where subject_id = :'teen'), 0, 'an unrelated employer cannot');
select throws_ok($$ select secret from verifications $$, '42501', null, 'the mock-secret column is never readable by clients');

select pg_temp.act_as(:'ops');
select is((select count(*)::int from admin_verification_queue() where id = :'poa'), 1, 'it shows in the admin queue');
select throws_like(format($$ select admin_review_verification(%L, false) $$, :'poa'), '%Give a reason%', 'rejections need a reason');
select lives_ok(format($$ select admin_review_verification(%L, true) $$, :'poa'), 'admin approves');

set local role service_role;
select svc_mark_phone_verified(:'teen', '+14255550111');
select pg_temp.act_as_system();
select is((select status::text from profiles where id = :'teen'), 'active', 'teen with phone, verified guardian and proof of age is active');

-- ── Business employer ────────────────────────────────────────────────────────
select pg_temp.act_as(:'shop');
select save_employer_profile('Jordan Owner', 'business', 'Pet Supply', '98074', 'Sammamish', 'Pet Supply LLC', '603123456', 'Sam Sup', 'sam@shop.test');
select results_eq($$ select key from my_requirements() where not done order by key $$,
  $$ values ('business_registration'), ('identity'), ('phone'), ('supervisor_check'), ('work_permit') $$,
  'business checklist includes registration, endorsement and supervisor check');
select submit_business_verification();
select is((select count(*)::int from verifications where subject_id = :'shop' and status = 'needs_review'), 2, 'business submission queues UBI + endorsement');

select pg_temp.act_as(:'ops');
select admin_review_verification((select id from verifications where subject_id = :'shop' and kind = 'work_permit'), true);
select pg_temp.act_as_system();
select ok((select minor_work_permit_endorsement_verified_at is not null from employers where profile_id = :'shop'), 'approving the endorsement stamps the employer');

-- ── Household employer ───────────────────────────────────────────────────────
select pg_temp.act_as(:'home');
select save_employer_profile('Wei Chen', 'household', 'The Chen Family', '98074', 'Sammamish');
select results_eq($$ select key from my_requirements() where not done order by key $$,
  $$ values ('background_check'), ('identity'), ('phone') $$, 'household checklist: phone, ID, background check');

select * from finish();
rollback;
