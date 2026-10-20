-- Phase 4 — supply & demand: teen work profiles, skills, job categories, jobs, and search.
--
-- Privacy model:
--  * A job's street address lives in job_private_details, readable only by its employer (Phase 5
--    extends this to the confirmed teen and their guardians). Search uses approx_location: the
--    ZIP centroid jittered by up to ~400 m, so distance is honest without pinpointing a house.
--  * Employers never read teen rows directly. They see a card (first name + last initial, age
--    band, skills, rate, distance) through security-definer search functions.

create type public.job_track as enum ('casual', 'regulated');
create type public.job_status as enum ('draft', 'posted', 'filled', 'closed');
create type public.pay_type as enum ('hourly', 'fixed');

-- ── Reference data ────────────────────────────────────────────────────────────

create table public.job_categories (
  id             text primary key,
  name           text not null,
  -- Which tracks may post in this category (household = casual, business = regulated).
  allowed_tracks public.job_track[] not null,
  min_age        int not null default 14 check (min_age between 14 and 17),
  -- Hazardous work is barred for minors under WA/FLSA rules; kept as data so it can't be posted.
  hazardous      boolean not null default false,
  active         boolean not null default true,
  sort           int not null default 100
);

insert into public.job_categories (id, name, allowed_tracks, min_age, hazardous, active, sort) values
  ('yard_work',    'Yard Work',       '{casual}',           14, false, true, 10),
  ('pet_care',     'Pet Care',        '{casual,regulated}', 14, false, true, 20),
  ('babysitting',  'Babysitting',     '{casual}',           14, false, true, 30),
  ('tutoring',     'Tutoring',        '{casual,regulated}', 14, false, true, 40),
  ('cleaning',     'Cleaning',        '{casual}',           14, false, true, 50),
  ('moving_help',  'Moving Help',     '{casual}',           16, false, true, 60),
  ('tech_help',    'Tech Help',       '{casual}',           14, false, true, 70),
  ('errands',      'Errands',         '{casual}',           14, false, true, 80),
  ('snow_removal', 'Snow Shoveling',  '{casual}',           14, false, true, 90),
  ('retail',       'Retail',          '{regulated}',        14, false, true, 110),
  ('food_service', 'Food Service',    '{regulated}',        14, false, true, 120),
  ('office',       'Office Help',     '{regulated}',        14, false, true, 130),
  ('camp',         'Camp & Rec',      '{regulated}',        14, false, true, 140),
  -- Agricultural work has a separate WA rule table and is out of scope for the pilot.
  ('agriculture',  'Agriculture',     '{regulated}',        14, false, false, 900);

create table public.skills (
  id    text primary key,
  name  text not null,
  sort  int not null default 100
);

insert into public.skills (id, name, sort) values
  ('dog_walking', 'Dog Walking', 10), ('pet_sitting', 'Pet Sitting', 20), ('babysitting', 'Babysitting', 30),
  ('lawn_care', 'Lawn Care', 40), ('gardening', 'Gardening', 50), ('tutoring_math', 'Math Tutoring', 60),
  ('tutoring_reading', 'Reading Tutoring', 70), ('moving_help', 'Moving Help', 80), ('cleaning', 'Cleaning', 90),
  ('tech_help', 'Tech Help', 100), ('car_washing', 'Car Washing', 110), ('snow_shoveling', 'Snow Shoveling', 120),
  ('retail', 'Retail / Customer Service', 130), ('food_service', 'Food Service', 140), ('cpr_certified', 'CPR Certified', 150);

-- ── Teen work profile ─────────────────────────────────────────────────────────

alter table public.juniors
  add column bio              text check (char_length(bio) <= 500),
  add column rate_min_cents   int check (rate_min_cents between 100 and 10000),
  add column rate_max_cents   int check (rate_max_cents between 100 and 10000),
  add column availability     text check (char_length(availability) <= 80),
  add column search_radius_mi int not null default 5 check (search_radius_mi between 1 and 25),
  -- Teens (or their parents) can hide from employer search while staying able to apply.
  add column discoverable     boolean not null default true,
  add constraint rate_range check (rate_min_cents is null or rate_max_cents is null or rate_min_cents <= rate_max_cents);

create table public.junior_skills (
  junior_id uuid not null references public.juniors (profile_id) on delete cascade,
  skill_id  text not null references public.skills (id),
  primary key (junior_id, skill_id)
);

-- ── Jobs ──────────────────────────────────────────────────────────────────────

create table public.jobs (
  id             uuid primary key default gen_random_uuid(),
  employer_id    uuid not null references public.employers (profile_id) on delete cascade,
  track          public.job_track not null,
  category_id    text not null references public.job_categories (id),
  title          text not null check (char_length(title) between 4 and 80),
  description    text not null check (char_length(description) between 20 and 2000),
  pay_type       public.pay_type not null default 'hourly',
  rate_cents     int not null check (rate_cents between 100 and 100000),
  openings       int not null default 1 check (openings between 1 and 20),
  status         public.job_status not null default 'draft',
  schedule_note  text check (char_length(schedule_note) <= 80),
  zip            text not null references public.zip_centroids (zip),
  city           text not null,
  approx_location extensions.geography(point, 4326) not null,
  search         tsvector generated always as (
                   setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                   setweight(to_tsvector('english', coalesce(description, '')), 'B')
                 ) stored,
  posted_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index jobs_location_idx on public.jobs using gist (approx_location) where status = 'posted';
create index jobs_search_idx on public.jobs using gin (search);
create index jobs_employer_idx on public.jobs (employer_id, created_at desc);
create trigger jobs_touch_updated_at before update on public.jobs for each row execute function public.touch_updated_at();

create table public.job_private_details (
  job_id       uuid primary key references public.jobs (id) on delete cascade,
  address_line text not null check (char_length(address_line) between 4 and 160),
  access_notes text check (char_length(access_notes) <= 300)
);

create table public.job_shifts (
  id       uuid primary key default gen_random_uuid(),
  job_id   uuid not null references public.jobs (id) on delete cascade,
  start_at timestamptz not null,
  end_at   timestamptz not null,
  timezone text not null default 'America/Los_Angeles',
  constraint shift_order check (end_at > start_at),
  constraint shift_length check (end_at - start_at <= interval '12 hours')
);
create index job_shifts_job_idx on public.job_shifts (job_id, start_at);

create table public.job_images (
  id       uuid primary key default gen_random_uuid(),
  job_id   uuid not null references public.jobs (id) on delete cascade,
  path     text not null,
  position int not null default 0
);
create index job_images_job_idx on public.job_images (job_id, position);

-- ── Helpers ───────────────────────────────────────────────────────────────────

-- ZIP centroid pushed up to ~400 m in a random direction.
create function public.jittered_location(zip text) returns extensions.geography
language sql volatile set search_path = '' as $$
  select extensions.st_project(z.location, 100 + random() * 300, radians(random() * 360))
  from public.zip_centroids z where z.zip = jittered_location.zip;
$$;

create function public.miles_between(a extensions.geography, b extensions.geography) returns numeric
language sql immutable set search_path = '' as $$
  select round((extensions.st_distance(a, b) / 1609.344)::numeric, 1);
$$;

create function public.zip_location(zip text) returns extensions.geography
language sql stable set search_path = '' as $$
  select z.location from public.zip_centroids z where z.zip = zip_location.zip;
$$;

-- Teen's attested age (falls back to the claim until a guardian confirms).
create function public.junior_age(uid uuid) returns int
language sql stable security definer set search_path = '' as $$
  select public.age_on(coalesce(j.dob, j.dob_claimed)) from public.juniors j where j.profile_id = uid;
$$;

create function public.age_band(age int) returns text
language sql immutable as $$
  select case when age between 14 and 15 then '14–15' when age between 16 and 17 then '16–17' end;
$$;

-- "Maya R."
create function public.short_name(full_name text) returns text
language sql immutable as $$
  select case
    when full_name is null then null
    when array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) = 1 then trim(full_name)
    else split_part(trim(full_name), ' ', 1) || ' ' ||
         left((regexp_split_to_array(trim(full_name), '\s+'))[array_length(regexp_split_to_array(trim(full_name), '\s+'), 1)], 1) || '.'
  end;
$$;

-- ── Teen work profile RPC ─────────────────────────────────────────────────────

create function public.save_junior_work_profile(
  bio text, rate_min_cents int, rate_max_cents int, availability text, skills text[],
  search_radius_mi int default 5, discoverable boolean default true
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if not public.current_role_is('junior') then perform public.fail('Only teen accounts can do this.'); end if;
  if not exists (select 1 from public.juniors where profile_id = uid) then perform public.fail('Finish your profile first.'); end if;
  if rate_min_cents is not null and rate_max_cents is not null and rate_min_cents > rate_max_cents then
    perform public.fail('Your minimum rate is higher than your maximum.');
  end if;
  if coalesce(array_length(skills, 1), 0) > 8 then perform public.fail('Pick up to 8 skills.'); end if;
  if exists (select 1 from unnest(skills) s where s not in (select id from public.skills)) then
    perform public.fail('Unknown skill.');
  end if;

  update public.juniors j
     set bio = nullif(trim(save_junior_work_profile.bio), ''),
         rate_min_cents = save_junior_work_profile.rate_min_cents,
         rate_max_cents = save_junior_work_profile.rate_max_cents,
         availability = nullif(trim(save_junior_work_profile.availability), ''),
         search_radius_mi = coalesce(save_junior_work_profile.search_radius_mi, 5),
         discoverable = coalesce(save_junior_work_profile.discoverable, true)
   where j.profile_id = uid;

  delete from public.junior_skills where junior_id = uid;
  insert into public.junior_skills (junior_id, skill_id) select uid, s from unnest(skills) s;
end $$;

-- ── Job RPCs ──────────────────────────────────────────────────────────────────

-- shifts: [{"date":"2026-10-03","start":"09:00","end":"11:00"}, …] in WA local time.
create function public.save_job(
  job_id uuid, category_id text, title text, description text, rate_cents int,
  pay_type public.pay_type, openings int, schedule_note text, zip text, city text,
  address_line text, access_notes text, shifts jsonb, publish boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  e public.employers;
  cat public.job_categories;
  track public.job_track;
  existing public.jobs;
  id_out uuid;
  s jsonb;
  s_start timestamptz;
  s_end timestamptz;
begin
  if not public.current_role_is('employer') then perform public.fail('Only employers can post jobs.'); end if;
  select * into e from public.employers where profile_id = uid;
  if e.profile_id is null then perform public.fail('Finish your profile first.'); end if;
  track := case when e.kind = 'business' then 'regulated'::public.job_track else 'casual'::public.job_track end;

  if publish and (select status from public.profiles where id = uid) <> 'active' then
    perform public.fail('Finish verification before posting. You can save this as a draft.');
  end if;

  select * into cat from public.job_categories c where c.id = save_job.category_id;
  if cat.id is null or not cat.active then perform public.fail('Choose a category.'); end if;
  if cat.hazardous then perform public.fail('That kind of work isn''t allowed for teens.'); end if;
  if not (track = any (cat.allowed_tracks)) then
    perform public.fail(case when track = 'casual'
      then cat.name || ' jobs are posted by businesses, not households.'
      else cat.name || ' jobs are household-only on HireMyJunior.' end);
  end if;
  if char_length(trim(coalesce(title, ''))) < 4 then perform public.fail('Give the job a short title.'); end if;
  if char_length(trim(coalesce(description, ''))) < 20 then perform public.fail('Describe the job in a sentence or two (20+ characters).'); end if;
  if coalesce(rate_cents, 0) < 100 then perform public.fail('Enter the pay rate.'); end if;
  if not exists (select 1 from public.zip_centroids z where z.zip = save_job.zip) then
    perform public.fail('Enter a Washington ZIP code.');
  end if;
  if char_length(trim(coalesce(address_line, ''))) < 4 then perform public.fail('Enter the job address (only shown after a teen is confirmed).'); end if;
  if jsonb_typeof(shifts) is distinct from 'array' or jsonb_array_length(shifts) = 0 then
    perform public.fail('Add at least one date and time.');
  end if;
  if jsonb_array_length(shifts) > 20 then perform public.fail('Up to 20 shifts per job.'); end if;

  if job_id is not null then
    select * into existing from public.jobs j where j.id = save_job.job_id and j.employer_id = uid for update;
    if existing.id is null then perform public.fail('Job not found.'); end if;
    if existing.status in ('filled', 'closed') then perform public.fail('This job is closed and can''t be edited.'); end if;
    update public.jobs j
       set category_id = save_job.category_id, title = trim(save_job.title), description = trim(save_job.description),
           rate_cents = save_job.rate_cents, pay_type = save_job.pay_type, openings = coalesce(save_job.openings, 1),
           schedule_note = nullif(trim(save_job.schedule_note), ''),
           zip = save_job.zip, city = trim(save_job.city),
           approx_location = case when j.zip = save_job.zip then j.approx_location else public.jittered_location(save_job.zip) end,
           status = case when publish then 'posted'::public.job_status else j.status end,
           posted_at = case when publish then coalesce(j.posted_at, now()) else j.posted_at end
     where j.id = save_job.job_id;
    id_out := save_job.job_id;
    delete from public.job_shifts js where js.job_id = id_out;
  else
    insert into public.jobs (employer_id, track, category_id, title, description, pay_type, rate_cents, openings,
                             schedule_note, zip, city, approx_location, status, posted_at)
    values (uid, track, save_job.category_id, trim(save_job.title), trim(save_job.description), save_job.pay_type,
            save_job.rate_cents, coalesce(save_job.openings, 1), nullif(trim(save_job.schedule_note), ''),
            save_job.zip, trim(save_job.city), public.jittered_location(save_job.zip),
            case when publish then 'posted'::public.job_status else 'draft'::public.job_status end,
            case when publish then now() end)
    returning id into id_out;
  end if;

  insert into public.job_private_details (job_id, address_line, access_notes)
  values (id_out, trim(address_line), nullif(trim(access_notes), ''))
  on conflict on constraint job_private_details_pkey do update set address_line = excluded.address_line, access_notes = excluded.access_notes;

  for s in select * from jsonb_array_elements(shifts) loop
    begin
      s_start := ((s ->> 'date')::date + (s ->> 'start')::time) at time zone 'America/Los_Angeles';
      s_end   := ((s ->> 'date')::date + (s ->> 'end')::time) at time zone 'America/Los_Angeles';
    exception when others then
      perform public.fail('Check the shift dates and times.');
    end;
    if s_end <= s_start then perform public.fail('Each shift must end after it starts.'); end if;
    if s_end - s_start > interval '12 hours' then perform public.fail('Shifts can be at most 12 hours.'); end if;
    if publish and s_start < now() then perform public.fail('Shifts must be in the future.'); end if;
    insert into public.job_shifts (job_id, start_at, end_at) values (id_out, s_start, s_end);
  end loop;

  return id_out;
end $$;

create function public.set_job_status(job_id uuid, status public.job_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
begin
  select * into j from public.jobs where id = job_id and employer_id = (select auth.uid()) for update;
  if j.id is null then perform public.fail('Job not found.'); end if;
  if status = 'posted' and (select p.status from public.profiles p where p.id = j.employer_id) <> 'active' then
    perform public.fail('Finish verification before posting.');
  end if;
  if status = 'posted' and not exists (select 1 from public.job_shifts s where s.job_id = j.id and s.start_at > now()) then
    perform public.fail('Add a future date before reposting.');
  end if;
  update public.jobs set status = set_job_status.status, posted_at = case when set_job_status.status = 'posted' then coalesce(posted_at, now()) else posted_at end
   where id = j.id;
end $$;

create function public.add_job_image(job_id uuid, path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  if not exists (select 1 from public.jobs j where j.id = add_job_image.job_id and j.employer_id = (select auth.uid())) then
    perform public.fail('Job not found.');
  end if;
  if split_part(path, '/', 1) <> (select auth.uid())::text then perform public.fail('Upload the photo again.'); end if;
  if (select count(*) from public.job_images i where i.job_id = add_job_image.job_id) >= 6 then
    perform public.fail('Up to 6 photos per job.');
  end if;
  insert into public.job_images (job_id, path, position)
  values (job_id, path, coalesce((select max(position) + 1 from public.job_images i where i.job_id = add_job_image.job_id), 0))
  returning id into new_id;
  return new_id;
end $$;

-- ── Search ────────────────────────────────────────────────────────────────────

-- Jobs near the calling teen. Only posted jobs with a future shift, in categories the teen is
-- old enough for. Distance is from the teen's ZIP centroid to the job's jittered location.
create function public.search_jobs(q text default null, category text default null, radius_mi numeric default null, lim int default 50)
returns table (
  id uuid, title text, category_id text, category_name text, track public.job_track, pay_type public.pay_type,
  rate_cents int, city text, distance_mi numeric, schedule_note text, next_shift_at timestamptz,
  employer_name text, employer_kind public.employer_kind, image_path text
)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  j public.juniors;
  origin extensions.geography;
  age int;
  tsq tsquery;
begin
  if not public.current_role_is('junior') then perform public.fail('Only teens can search jobs.'); end if;
  select * into j from public.juniors where profile_id = uid;
  if j.profile_id is null then perform public.fail('Finish your profile first.'); end if;
  origin := public.zip_location(j.zip);
  age := public.junior_age(uid);
  tsq := case when nullif(trim(q), '') is not null then websearch_to_tsquery('english', q) end;

  return query
  select jb.id, jb.title, jb.category_id, c.name, jb.track, jb.pay_type, jb.rate_cents, jb.city,
         public.miles_between(origin, jb.approx_location),
         jb.schedule_note,
         (select min(s.start_at) from public.job_shifts s where s.job_id = jb.id and s.start_at > now()),
         e.display_name, e.kind,
         (select i.path from public.job_images i where i.job_id = jb.id order by i.position limit 1)
  from public.jobs jb
  join public.job_categories c on c.id = jb.category_id
  join public.employers e on e.profile_id = jb.employer_id
  join public.profiles ep on ep.id = jb.employer_id and ep.status = 'active'
  where jb.status = 'posted'
    and c.min_age <= coalesce(age, 14)
    and (category is null or jb.category_id = category)
    and (tsq is null or jb.search @@ tsq)
    and extensions.st_dwithin(origin, jb.approx_location, coalesce(radius_mi, j.search_radius_mi) * 1609.344)
    and exists (select 1 from public.job_shifts s where s.job_id = jb.id and s.start_at > now())
  order by (case when tsq is null then 0 else -ts_rank(jb.search, tsq) end),
           extensions.st_distance(origin, jb.approx_location)
  limit least(coalesce(lim, 50), 100);
end $$;

-- Everything a teen (or their guardian) needs on the job detail screen — never the address.
create function public.job_detail(job_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r public.app_role;
  jb public.jobs;
  origin extensions.geography;
begin
  select role into r from public.profiles where id = uid;
  select * into jb from public.jobs where id = job_id;
  if jb.id is null then perform public.fail('Job not found.'); end if;

  -- Owners see their own jobs in any state; everyone else only sees posted jobs.
  -- (Phase 5 widens this to teens/guardians with a booking on the job.)
  if jb.employer_id <> uid and jb.status <> 'posted' then perform public.fail('This job is no longer available.'); end if;
  if r = 'employer' and jb.employer_id <> uid then perform public.fail('Job not found.'); end if;

  if r = 'junior' then
    origin := public.zip_location((select zip from public.juniors where profile_id = uid));
  elsif r = 'parent' then
    origin := public.zip_location((select zip from public.parents where profile_id = uid));
  end if;

  return jsonb_build_object(
    'id', jb.id, 'title', jb.title, 'description', jb.description, 'track', jb.track, 'status', jb.status,
    'category_id', jb.category_id, 'category_name', (select c.name from public.job_categories c where c.id = jb.category_id),
    'pay_type', jb.pay_type, 'rate_cents', jb.rate_cents, 'openings', jb.openings,
    'schedule_note', jb.schedule_note, 'city', jb.city, 'zip', jb.zip,
    'distance_mi', case when origin is not null then public.miles_between(origin, jb.approx_location) end,
    'employer', (select jsonb_build_object('id', e.profile_id, 'name', e.display_name, 'kind', e.kind,
                        'jobs_posted', (select count(*) from public.jobs x where x.employer_id = e.profile_id and x.status <> 'draft'))
                 from public.employers e where e.profile_id = jb.employer_id),
    'shifts', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'start_at', s.start_at, 'end_at', s.end_at) order by s.start_at)
                        from public.job_shifts s where s.job_id = jb.id), '[]'),
    'images', coalesce((select jsonb_agg(i.path order by i.position) from public.job_images i where i.job_id = jb.id), '[]'),
    'address', case when jb.employer_id = uid then (select jsonb_build_object('line', d.address_line, 'notes', d.access_notes)
                                                     from public.job_private_details d where d.job_id = jb.id) end
  );
end $$;

-- Teens near a verified employer. Only active, discoverable teens; a card, not a record.
create function public.search_juniors(q text default null, skill text default null, radius_mi numeric default 10, lim int default 50)
returns table (id uuid, display_name text, age_band text, city text, distance_mi numeric,
               rate_min_cents int, rate_max_cents int, availability text, skills text[], skill_names text[])
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  origin extensions.geography;
begin
  if not public.current_role_is('employer') then perform public.fail('Only employers can search for teens.'); end if;
  if (select pr.status from public.profiles pr where pr.id = uid) <> 'active' then
    perform public.fail('Finish verification to search for teens.');
  end if;
  origin := public.zip_location((select em.zip from public.employers em where em.profile_id = uid));

  return query
  select j.profile_id, public.short_name(p.full_name), public.age_band(public.junior_age(j.profile_id)), j.city,
         public.miles_between(origin, public.zip_location(j.zip)),
         j.rate_min_cents, j.rate_max_cents, j.availability,
         coalesce(array_agg(sk.id order by sk.sort) filter (where sk.id is not null), '{}'),
         coalesce(array_agg(sk.name order by sk.sort) filter (where sk.id is not null), '{}')
  from public.juniors j
  join public.profiles p on p.id = j.profile_id and p.status = 'active'
  left join public.junior_skills js on js.junior_id = j.profile_id
  left join public.skills sk on sk.id = js.skill_id
  where j.discoverable
    and extensions.st_dwithin(origin, public.zip_location(j.zip), coalesce(radius_mi, 10) * 1609.344)
    and (skill is null or exists (select 1 from public.junior_skills x where x.junior_id = j.profile_id and x.skill_id = skill))
    and (nullif(trim(q), '') is null
         or p.full_name ilike '%' || trim(q) || '%'
         or exists (select 1 from public.junior_skills x join public.skills y on y.id = x.skill_id
                    where x.junior_id = j.profile_id and y.name ilike '%' || trim(q) || '%'))
  group by j.profile_id, p.full_name, j.city, j.zip, j.rate_min_cents, j.rate_max_cents, j.availability
  order by extensions.st_distance(origin, public.zip_location(j.zip))
  limit least(coalesce(lim, 50), 100);
end $$;

-- One teen's card for an employer (same fields as search, plus bio).
create function public.junior_card(junior_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  card jsonb;
begin
  if not public.current_role_is('employer') or (select status from public.profiles where id = uid) <> 'active' then
    perform public.fail('Finish verification to view teens.');
  end if;
  select jsonb_build_object(
           'id', j.profile_id, 'display_name', public.short_name(p.full_name),
           'age_band', public.age_band(public.junior_age(j.profile_id)), 'city', j.city,
           'distance_mi', public.miles_between(public.zip_location((select zip from public.employers where profile_id = uid)), public.zip_location(j.zip)),
           'bio', j.bio, 'rate_min_cents', j.rate_min_cents, 'rate_max_cents', j.rate_max_cents, 'availability', j.availability,
           'skill_names', coalesce((select jsonb_agg(sk.name order by sk.sort) from public.junior_skills js join public.skills sk on sk.id = js.skill_id where js.junior_id = j.profile_id), '[]'))
    into card
  from public.juniors j join public.profiles p on p.id = j.profile_id
  where j.profile_id = junior_id and p.status = 'active' and j.discoverable;
  if card is null then perform public.fail('This teen isn''t available.'); end if;
  return card;
end $$;

-- ── Storage: job photos ───────────────────────────────────────────────────────
-- Public read (they're photos of yards and dogs, shown in search); uploads only into the
-- employer's own folder. Employers are told not to include people or house numbers.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-images', 'job-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "job-images: employers upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-images' and (storage.foldername(name))[1] = (select auth.uid())::text
              and public.current_role_is('employer'));
create policy "job-images: owners delete" on storage.objects for delete to authenticated
  using (bucket_id = 'job-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── RLS & grants ──────────────────────────────────────────────────────────────

alter table public.job_categories enable row level security;
alter table public.skills enable row level security;
alter table public.junior_skills enable row level security;
alter table public.jobs enable row level security;
alter table public.job_private_details enable row level security;
alter table public.job_shifts enable row level security;
alter table public.job_images enable row level security;

create policy "job_categories: readable" on public.job_categories for select to authenticated using (true);
create policy "skills: readable" on public.skills for select to authenticated using (true);

create policy "junior_skills: own" on public.junior_skills for select to authenticated using (junior_id = (select auth.uid()));
create policy "junior_skills: guardians" on public.junior_skills for select to authenticated using (public.is_guardian_of(junior_id, include_pending => true));

-- Employers manage their own jobs through RPCs and read them directly; teens use search_jobs /
-- job_detail (no direct table access, so approx_location can't be bulk-scraped).
create policy "jobs: owner reads" on public.jobs for select to authenticated using (employer_id = (select auth.uid()));
create policy "jobs: admins read" on public.jobs for select to authenticated using (public.is_admin());
create policy "job_private_details: owner reads" on public.job_private_details for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = (select auth.uid())));
create policy "job_shifts: owner reads" on public.job_shifts for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = (select auth.uid())));
create policy "job_images: owner reads" on public.job_images for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = (select auth.uid())));

grant select on public.job_categories, public.skills, public.junior_skills, public.jobs,
                public.job_private_details, public.job_shifts, public.job_images to authenticated;

grant execute on function
  public.save_junior_work_profile(text, int, int, text, text[], int, boolean),
  public.save_job(uuid, text, text, text, int, public.pay_type, int, text, text, text, text, text, jsonb, boolean),
  public.set_job_status(uuid, public.job_status),
  public.add_job_image(uuid, text),
  public.search_jobs(text, text, numeric, int),
  public.job_detail(uuid),
  public.search_juniors(text, text, numeric, int),
  public.junior_card(uuid)
to authenticated;
