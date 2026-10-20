-- Demo data for local testing. Run via `pnpm db:seed` (scripts/seed.mjs creates the auth users
-- first through the GoTrue admin API, so e-mail-code sign-in works normally for every account).
-- Idempotent: safe to run repeatedly.
--
-- Every account is fully verified with provider 'seed'. Sign in as any of them with the code
-- from Mailpit, e.g. maya@demo.test (teen), priya@demo.test (parent), chen@demo.test (employer).

create temporary table seed_people (email text primary key, full_name text, zip text, city text) on commit drop;
insert into seed_people values
  ('priya@demo.test',     'Priya Rodriguez', '98074', 'Sammamish'),
  ('mark@demo.test',      'Mark Park',       '98075', 'Sammamish'),
  ('elena@demo.test',     'Elena Kim',       '98052', 'Redmond'),
  ('maya@demo.test',      'Maya Rodriguez',  '98074', 'Sammamish'),
  ('jaden@demo.test',     'Jaden Park',      '98075', 'Sammamish'),
  ('sofia@demo.test',     'Sofia Kim',       '98052', 'Redmond'),
  ('chen@demo.test',      'Wei Chen',        '98074', 'Sammamish'),
  ('patel@demo.test',     'Anita Patel',     '98075', 'Sammamish'),
  ('garcia@demo.test',    'Luis Garcia',     '98029', 'Issaquah'),
  ('petsupply@demo.test', 'Dana Whitfield',  '98074', 'Sammamish'),
  ('scoops@demo.test',    'Rob Tanaka',      '98027', 'Issaquah');

create function pg_temp.uid(addr text) returns uuid language sql as $$ select id from public.profiles where email = addr $$;

create function pg_temp.verify_all(addr text, kinds text[]) returns void language plpgsql as $$
declare k text; u uuid := pg_temp.uid(addr);
begin
  foreach k in array kinds loop
    if not public.is_verified(u, k::public.verification_kind) then
      insert into public.verifications (subject_id, kind, provider, status, verified_at, expires_at)
      values (u, k::public.verification_kind, 'seed', 'verified', now(),
              case when k in ('background_check', 'supervisor_check', 'work_permit') then now() + interval '1 year' end);
    end if;
  end loop;
  if (select phone_verified_at from public.profiles where id = u) is null then
    update public.profiles set phone = '+1425555' || lpad((abs(hashtext(addr)) % 10000)::text, 4, '0') where id = u;
    update public.profiles set phone_verified_at = now() where id = u;
  end if;
end $$;

-- Names, onboarding
update public.profiles p set full_name = s.full_name, onboarded_at = coalesce(p.onboarded_at, now())
  from seed_people s where p.email = s.email;

-- Parents
insert into public.parents (profile_id, zip, city)
select pg_temp.uid(email), zip, city from seed_people where email in ('priya@demo.test', 'mark@demo.test', 'elena@demo.test')
on conflict do nothing;

-- Teens (DOB attested by their parent)
insert into public.juniors (profile_id, dob_claimed, dob, dob_attested_by, dob_attested_at, school_name, zip, city,
                            bio, rate_min_cents, rate_max_cents, availability, search_radius_mi)
values
  (pg_temp.uid('maya@demo.test'),  current_date - interval '15 years 3 months', current_date - interval '15 years 3 months', pg_temp.uid('priya@demo.test'), now(),
   'Skyline High School', '98074', 'Sammamish', 'Dog lover with two of my own. CPR certified and great with little kids.', 1800, 2500, 'Weekends + evenings', 10),
  (pg_temp.uid('jaden@demo.test'), current_date - interval '16 years 7 months', current_date - interval '16 years 7 months', pg_temp.uid('mark@demo.test'), now(),
   'Eastlake High School', '98075', 'Sammamish', 'Strong and reliable. I do most of the yard work at home.', 2000, 2800, 'Weekends', 10),
  (pg_temp.uid('sofia@demo.test'), current_date - interval '17 years 1 month', current_date - interval '17 years 1 month', pg_temp.uid('elena@demo.test'), now(),
   'Redmond High School', '98052', 'Redmond', 'AP Calc student — happy to help with middle-school math.', 2200, 3000, 'Weekday afternoons', 10)
on conflict do nothing;

insert into public.guardianships (parent_id, junior_id, status, activated_at) values
  (pg_temp.uid('priya@demo.test'), pg_temp.uid('maya@demo.test'), 'active', now()),
  (pg_temp.uid('mark@demo.test'), pg_temp.uid('jaden@demo.test'), 'active', now()),
  (pg_temp.uid('elena@demo.test'), pg_temp.uid('sofia@demo.test'), 'active', now())
on conflict do nothing;

insert into public.junior_skills (junior_id, skill_id) values
  (pg_temp.uid('maya@demo.test'), 'dog_walking'), (pg_temp.uid('maya@demo.test'), 'pet_sitting'),
  (pg_temp.uid('maya@demo.test'), 'babysitting'), (pg_temp.uid('maya@demo.test'), 'cpr_certified'),
  (pg_temp.uid('jaden@demo.test'), 'lawn_care'), (pg_temp.uid('jaden@demo.test'), 'moving_help'), (pg_temp.uid('jaden@demo.test'), 'car_washing'),
  (pg_temp.uid('sofia@demo.test'), 'tutoring_math'), (pg_temp.uid('sofia@demo.test'), 'pet_sitting')
on conflict do nothing;

-- Employers
insert into public.employers (profile_id, kind, display_name, zip, city, legal_name, ubi, supervisor_name, supervisor_email) values
  (pg_temp.uid('chen@demo.test'),      'household', 'The Chen Family',      '98074', 'Sammamish', null, null, null, null),
  (pg_temp.uid('patel@demo.test'),     'household', 'The Patel Family',     '98075', 'Sammamish', null, null, null, null),
  (pg_temp.uid('garcia@demo.test'),    'household', 'The Garcia Family',    '98029', 'Issaquah',  null, null, null, null),
  (pg_temp.uid('petsupply@demo.test'), 'business',  'Sammamish Pet Supply', '98074', 'Sammamish', 'Sammamish Pet Supply LLC', '604123456', 'Jordan Lee', 'jordan@petsupply.demo.test'),
  (pg_temp.uid('scoops@demo.test'),    'business',  'Issaquah Scoops',      '98027', 'Issaquah',  'Issaquah Scoops Inc', '604987654', 'Casey Nguyen', 'casey@scoops.demo.test')
on conflict do nothing;

-- Verification
select pg_temp.verify_all(email, array['identity']) from seed_people where email in ('priya@demo.test', 'mark@demo.test', 'elena@demo.test');
select pg_temp.verify_all(email, array['proof_of_age']) from seed_people where email in ('maya@demo.test', 'jaden@demo.test', 'sofia@demo.test');
select pg_temp.verify_all(email, array['identity', 'background_check']) from seed_people where email in ('chen@demo.test', 'patel@demo.test', 'garcia@demo.test');
select pg_temp.verify_all(email, array['identity', 'business_registration', 'work_permit', 'supervisor_check']) from seed_people where email in ('petsupply@demo.test', 'scoops@demo.test');
-- Memorable phone numbers for phone sign-in (local test code: 0000).
create temporary table seed_phones (email text primary key, phone text) on commit drop;
insert into seed_phones values
  ('maya@demo.test', '+14255550101'), ('jaden@demo.test', '+14255550102'), ('sofia@demo.test', '+14255550103'),
  ('priya@demo.test', '+14255550201'), ('mark@demo.test', '+14255550202'), ('elena@demo.test', '+14255550203'),
  ('chen@demo.test', '+14255550301'), ('patel@demo.test', '+14255550302'), ('garcia@demo.test', '+14255550303'),
  ('petsupply@demo.test', '+14255550401'), ('scoops@demo.test', '+14255550402');
update public.profiles p set phone = sp.phone from seed_phones sp where p.email = sp.email and p.phone is distinct from sp.phone;
update public.profiles p set phone_verified_at = coalesce(p.phone_verified_at, now()) from seed_phones sp where p.email = sp.email;

select public.refresh_profile_status(pg_temp.uid(email)) from seed_people;

-- Jobs (only if the employer has none yet). Shifts land on the coming weekend / weekdays.
create function pg_temp.next_dow(dow int) returns date language sql as $$
  select current_date + (((dow - extract(dow from current_date)::int) + 7) % 7 + case when extract(dow from current_date)::int = dow then 7 else 0 end);
$$;

create function pg_temp.job(addr text, cat text, title text, descr text, rate int, note text, address text, shifts jsonb) returns void language plpgsql as $$
declare
  e public.employers := (select e from public.employers e where e.profile_id = pg_temp.uid(addr));
  jid uuid;
  s jsonb;
begin
  if exists (select 1 from public.jobs j where j.employer_id = e.profile_id and j.title = job.title) then return; end if;
  insert into public.jobs (employer_id, track, category_id, title, description, pay_type, rate_cents, schedule_note, zip, city, approx_location, status, posted_at)
  values (e.profile_id, case when e.kind = 'business' then 'regulated'::public.job_track else 'casual'::public.job_track end,
          cat, title, descr, 'hourly', rate, note, e.zip, e.city, public.jittered_location(e.zip), 'posted', now())
  returning id into jid;
  insert into public.job_private_details (job_id, address_line) values (jid, address);
  for s in select * from jsonb_array_elements(shifts) loop
    insert into public.job_shifts (job_id, start_at, end_at)
    values (jid, ((s ->> 'date')::date + (s ->> 'start')::time) at time zone 'America/Los_Angeles',
                 ((s ->> 'date')::date + (s ->> 'end')::time) at time zone 'America/Los_Angeles');
  end loop;
end $$;

select pg_temp.job('chen@demo.test', 'pet_care', 'Weekend Dog Walking',
  'Walk our two dogs, Biscuit and Miso, around the neighborhood loop. Leash and waste bags provided — a water bottle is appreciated. Looking for someone reliable and comfortable with medium-size dogs.',
  1800, 'Sat & Sun, 9–11 AM', '2417 228th Ave NE, Sammamish',
  jsonb_build_array(jsonb_build_object('date', pg_temp.next_dow(6), 'start', '09:00', 'end', '11:00'),
                    jsonb_build_object('date', pg_temp.next_dow(0), 'start', '09:00', 'end', '11:00')));
select pg_temp.job('patel@demo.test', 'yard_work', 'Lawn Mowing Help',
  'Mow front and back lawns and edge the walkway. Our mower is self-propelled and easy to use; we''ll show you on the first visit.',
  2200, 'Saturday morning', '1830 Klahanie Dr SE, Sammamish',
  jsonb_build_array(jsonb_build_object('date', pg_temp.next_dow(6), 'start', '10:00', 'end', '12:00')));
select pg_temp.job('patel@demo.test', 'babysitting', 'Saturday Babysitting',
  'Date night! Two kids (6 and 9) — dinner is ready, then games and bedtime at 8:30. We''ll be 10 minutes away.',
  2000, 'Sat, 6–10 PM', '1830 Klahanie Dr SE, Sammamish',
  jsonb_build_array(jsonb_build_object('date', pg_temp.next_dow(6), 'start', '18:00', 'end', '22:00')));
select pg_temp.job('garcia@demo.test', 'tutoring', 'Algebra Tutoring',
  'Our 7th grader needs help with pre-algebra homework twice a week. At our kitchen table; snacks included.',
  2500, 'Tue & Thu, 4–5 PM', '505 NW Gilman Blvd, Issaquah',
  jsonb_build_array(jsonb_build_object('date', pg_temp.next_dow(2), 'start', '16:00', 'end', '17:00'),
                    jsonb_build_object('date', pg_temp.next_dow(4), 'start', '16:00', 'end', '17:00')));
select pg_temp.job('garcia@demo.test', 'moving_help', 'Garage Clean-out Help',
  'Help carry boxes from the garage to the donation truck. Nothing over 30 lbs; gloves provided. Must be 16+.',
  2000, 'Sunday, 1–4 PM', '505 NW Gilman Blvd, Issaquah',
  jsonb_build_array(jsonb_build_object('date', pg_temp.next_dow(0), 'start', '13:00', 'end', '16:00')));
select pg_temp.job('petsupply@demo.test', 'retail', 'Weekend Stock Associate',
  'Unpack deliveries, face shelves, and help customers find the right food for their pets. Training provided. You''ll report to our store supervisor.',
  1900, 'Saturdays, 10 AM–2 PM', '22830 NE 8th St, Sammamish',
  jsonb_build_array(jsonb_build_object('date', pg_temp.next_dow(6), 'start', '10:00', 'end', '14:00'),
                    jsonb_build_object('date', pg_temp.next_dow(6) + 7, 'start', '10:00', 'end', '14:00')));
select pg_temp.job('scoops@demo.test', 'food_service', 'Ice Cream Scooper',
  'Scoop, serve and smile! Friday evening shift at our Front Street shop. Food handler card required within 14 days — we''ll help you get it.',
  1850, 'Fridays, 5–8 PM', '75 Front St N, Issaquah',
  jsonb_build_array(jsonb_build_object('date', pg_temp.next_dow(5), 'start', '17:00', 'end', '20:00')));

-- Keep the demo fresh: roll any past demo shift forward by whole weeks (same weekday and time),
-- and reopen demo jobs that were filled or closed only because their dates ran out.
update public.job_shifts s
   set start_at = s.start_at + make_interval(weeks => ceil(extract(epoch from now() - s.start_at) / 604800)::int),
       end_at   = s.end_at   + make_interval(weeks => ceil(extract(epoch from now() - s.start_at) / 604800)::int)
  from public.jobs j join public.profiles p on p.id = j.employer_id
 where s.job_id = j.id and p.email like '%@demo.test' and s.start_at < now();

select format('seed: %s profiles, %s active, %s posted jobs',
  (select count(*) from public.profiles where email like '%@demo.test'),
  (select count(*) from public.profiles where email like '%@demo.test' and status = 'active'),
  (select count(*) from public.jobs j join public.profiles p on p.id = j.employer_id where p.email like '%@demo.test' and j.status = 'posted')) as result;
