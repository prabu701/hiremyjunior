-- RLS + trigger tests for public.profiles. Runs inside a transaction that is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

-- Helpers: create users the way GoTrue does, and impersonate them the way PostgREST does.
create function pg_temp.new_user(email text, role text) returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
          jsonb_build_object('role', role), now(), now());
  return uid;
end $$;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

-- ── Trigger ──────────────────────────────────────────────────────────────────
select pg_temp.new_user('teen@test.local', 'junior')     as teen   \gset
select pg_temp.new_user('parent@test.local', 'parent')   as parent \gset
select pg_temp.new_user('biz@test.local', 'employer')    as biz    \gset

select is((select role::text from profiles where id = :'teen'), 'junior', 'trigger creates a junior profile');
select is((select status::text from profiles where id = :'parent'), 'pending', 'new profiles start pending');
select is((select email from profiles where id = :'biz'), 'biz@test.local', 'trigger copies e-mail');

select throws_ok(
  $$ select pg_temp.new_user('sneaky@test.local', 'admin') $$,
  '23514', null, 'cannot self-register as admin');
select throws_ok(
  $$ select pg_temp.new_user('norole@test.local', null) $$,
  '23514', null, 'sign-up without a role is rejected');

-- An admin can only be made by a privileged role (service role / SQL), never by the client.
update profiles set role = 'admin' where id = :'biz';

-- ── Reads ────────────────────────────────────────────────────────────────────
select pg_temp.act_as(:'teen');
select results_eq($$ select id from profiles $$, array[:'teen'::uuid], 'a junior sees only their own profile');

select pg_temp.act_as(:'parent');
select is((select count(*)::int from profiles where id = :'teen'), 0, 'a parent cannot read an unrelated junior (guardianship arrives in Phase 2)');

select pg_temp.act_as(:'biz');
select is((select count(*)::int from profiles where id in (:'teen', :'parent', :'biz')), 3, 'an admin reads every profile');

select pg_temp.act_as_anon();
select throws_ok($$ select * from profiles $$, '42501', null, 'anon has no access to profiles');

-- ── Writes ───────────────────────────────────────────────────────────────────
select pg_temp.act_as(:'teen');
select lives_ok($$ update profiles set theme = 'citrus', corner_style = 'rounded' $$, 'user can edit own appearance fields');
select throws_ok($$ update profiles set role = 'employer' $$, '42501', null, 'user cannot change own role');
select throws_ok($$ update profiles set status = 'active' $$, '42501', null, 'user cannot activate themselves');

select throws_ok($$ update profiles set full_name = 'X' $$, '42501', null, 'name changes go through the validated RPCs, not direct updates');

select pg_temp.act_as(:'parent');
update profiles set theme = 'sunset' where id = :'teen';
reset role;
select is((select theme::text from profiles where id = :'teen'), 'citrus', 'user cannot edit someone else''s profile');

select pg_temp.act_as(:'teen');
select throws_ok(
  format($$ insert into profiles (id, role) values (%L, 'admin') $$, gen_random_uuid()),
  '42501', null, 'clients cannot insert profiles directly');

select * from finish();
rollback;
