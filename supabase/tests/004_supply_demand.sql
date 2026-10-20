-- Phase 4: posting rules, job search (distance, age, text), privacy of addresses and teen records.
begin;
\ir _helpers.psql

select plan(26);

select pg_temp.active_employer('chen@t.local', 'household', '98074') as chen \gset
select pg_temp.active_employer('shop@t.local', 'business', '98074')  as shop \gset
select pg_temp.new_user('newbie@t.local', 'employer') as newbie \gset
select pg_temp.active_junior('maya@t.local', 15, '98074') as maya \gset
select pg_temp.active_junior('jaden@t.local', 16, '98075') as jaden \gset
-- Spokane, ~250 miles away
select pg_temp.active_junior('far@t.local', 16, '99201') as far \gset
select pg_temp.new_user('pending@t.local', 'junior') as pending_teen \gset

select is((select status::text from profiles where id = :'chen'), 'active', 'helper makes an active household employer');
select is((select status::text from profiles where id = :'maya'), 'active', 'helper makes an active teen');

-- ── Posting rules ────────────────────────────────────────────────────────────
select pg_temp.act_as(:'newbie');
select save_employer_profile('New Bie', 'household', 'The Bies', '98074', 'Sammamish');
select throws_like(
  format($$ select save_job(null, 'yard_work', 'Rake leaves', 'Rake the front and back yard please.', 1800, 'hourly', 1, null, '98074', 'Sammamish', '1 Elm St', null, %L, true) $$, pg_temp.shift_in(3)),
  '%Finish verification before posting%', 'an unverified employer cannot publish');
select lives_ok(
  format($$ select save_job(null, 'yard_work', 'Rake leaves', 'Rake the front and back yard please.', 1800, 'hourly', 1, null, '98074', 'Sammamish', '1 Elm St', null, %L, false) $$, pg_temp.shift_in(3)),
  '…but can save a draft');

select pg_temp.act_as(:'chen');
select throws_like(
  format($$ select save_job(null, 'retail', 'Cashier', 'Help at the register on weekends.', 1800, 'hourly', 1, null, '98074', 'Sammamish', '1 Elm St', null, %L, true) $$, pg_temp.shift_in(3)),
  '%posted by businesses%', 'households cannot post business-only categories');
select throws_like(
  format($$ select save_job(null, 'agriculture', 'Harvest', 'Pick apples in the orchard all day.', 1800, 'hourly', 1, null, '98074', 'Sammamish', '1 Elm St', null, %L, true) $$, pg_temp.shift_in(3)),
  '%Choose a category%', 'agriculture is gated off');
select throws_like(
  format($$ select save_job(null, 'yard_work', 'Rake leaves', 'Rake the front and back yard please.', 1800, 'hourly', 1, null, '98074', 'Sammamish', '1 Elm St', null, %L, true) $$, pg_temp.shift_in(-2)),
  '%in the future%', 'published shifts must be in the future');
select throws_like(
  $$ select save_job(null, 'yard_work', 'Rake leaves', 'Rake the front and back yard please.', 1800, 'hourly', 1, null, '98074', 'Sammamish', '1 Elm St', null, '[{"date":"2030-01-01","start":"11:00","end":"09:00"}]', true) $$,
  '%end after it starts%', 'shift end must follow start');

select pg_temp.act_as(:'shop');
select throws_like(
  format($$ select save_job(null, 'babysitting', 'Sitter', 'Watch our kids on Saturday nights.', 1800, 'hourly', 1, null, '98074', 'Sammamish', '1 Elm St', null, %L, true) $$, pg_temp.shift_in(3)),
  '%household-only%', 'businesses cannot post household-only categories');

select pg_temp.post_job(:'chen', 'pet_care', 'Weekend Dog Walking') as dogjob \gset
select pg_temp.post_job(:'chen', 'moving_help', 'Help Us Move Boxes') as movejob \gset
select pg_temp.post_job(:'shop', 'retail', 'Stock Associate', 1900) as stockjob \gset

select is((select track::text from jobs where id = :'dogjob'), 'casual', 'household jobs are Track A (casual)');
select is((select track::text from jobs where id = :'stockjob'), 'regulated', 'business jobs are Track B (regulated)');
select ok(
  (select extensions.st_distance(j.approx_location, z.location) between 50 and 450 from jobs j join zip_centroids z on z.zip = j.zip where j.id = :'dogjob'),
  'search location is jittered off the ZIP centroid');

-- ── Search (teen) ────────────────────────────────────────────────────────────
select pg_temp.act_as(:'maya');
select ok(:'dogjob' = any (select id::text from search_jobs()), 'a nearby teen finds the job');
select ok(not (:'movejob' = any (select id::text from search_jobs())), 'a 15-year-old does not see a 16+ category');
select is((select id::text from search_jobs('dog walking') limit 1), :'dogjob', 'text search ranks the matching job first');
select ok((select bool_and(category_id = 'retail') and bool_or(id = :'stockjob') from search_jobs(category => 'retail')), 'category filter returns only that category');

select pg_temp.act_as(:'jaden');
select ok(:'movejob' = any (select id::text from search_jobs()), 'a 16-year-old sees the 16+ job');

select pg_temp.act_as(:'far');
select ok(not exists (select 1 from search_jobs() where id in (:'dogjob', :'movejob', :'stockjob')), 'a teen 250+ miles away does not see Sammamish jobs');

-- A job whose only shift has passed drops out of search.
select pg_temp.act_as_system();
update job_shifts set start_at = now() - interval '2 days', end_at = now() - interval '2 days' + interval '2 hours' where job_id = :'stockjob';
select pg_temp.act_as(:'maya');
select ok(not (:'stockjob' = any (select id::text from search_jobs(category => 'retail'))), 'jobs with no future shift are hidden');

-- ── Privacy ──────────────────────────────────────────────────────────────────
select is((select count(*)::int from jobs), 0, 'teens cannot read the jobs table directly');
select is((select count(*)::int from job_private_details), 0, 'teens cannot read job addresses');
select is(job_detail(:'dogjob') -> 'address', 'null'::jsonb, 'job detail never includes the address for a teen');

select pg_temp.act_as(:'chen');
select is(job_detail(:'dogjob') -> 'address' ->> 'line', '1 Test Way', 'the owner sees their own address');
select pg_temp.act_as(:'shop');
select throws_like(format($$ select job_detail(%L) $$, :'dogjob'), '%not found%', 'other employers cannot open someone else''s job detail');

-- ── Search (employer) ────────────────────────────────────────────────────────
select pg_temp.act_as(:'chen');
select is((select display_name from search_juniors() where id = :'maya'), 'Maya T.', 'employers see first name + last initial');
select pg_temp.act_as(:'maya');
select save_junior_work_profile('I love dogs', 1800, 2500, 'Weekends', array['dog_walking'], 5, false);
select pg_temp.act_as(:'chen');
select is((select count(*)::int from search_juniors() where id = :'maya'), 0, 'undiscoverable teens are hidden from employers');

select * from finish();
rollback;
