-- Phase 5 — bookings: applications, invitations, parent approval, trusted employers.
--
-- Every state change goes through booking_step(), which checks public.booking_transitions
-- (generated from packages/booking) for the booking's track and the acting role, and appends to
-- booking_events. Client RPCs decide *who* the caller is; the table decides *what* they may do.

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.jobs (id) on delete cascade,
  junior_id        uuid not null references public.juniors (profile_id) on delete cascade,
  employer_id      uuid not null references public.employers (profile_id) on delete cascade,
  track            public.job_track not null,
  origin           text not null check (origin in ('applied', 'invited')),
  state            public.booking_state not null,
  -- Note from whoever started it (teen's pitch or employer's invite). Contact details are masked
  -- until the booking is confirmed / handed off.
  message          text check (char_length(message) <= 500),
  -- Set when parent review was skipped because a guardian trusts this employer.
  fast_path        boolean not null default false,
  state_changed_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One live booking per teen per job.
create unique index bookings_one_live_per_job
  on public.bookings (job_id, junior_id)
  where not public.booking_is_terminal(state);
create index bookings_junior_idx on public.bookings (junior_id, updated_at desc);
create index bookings_employer_idx on public.bookings (employer_id, updated_at desc);
create index bookings_job_idx on public.bookings (job_id);
create trigger bookings_touch_updated_at before update on public.bookings for each row execute function public.touch_updated_at();

-- Append-only evidence log: every transition, who did it, and why. Disputes are decided from this.
create table public.booking_events (
  id          bigint generated always as identity primary key,
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_role  text not null check (actor_role in ('junior', 'parent', 'employer', 'system')),
  event       text not null,
  from_state  public.booking_state,
  to_state    public.booking_state not null,
  reason      text,
  at          timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, id);

create function public.booking_events_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'booking_events is append-only';
end $$;
create trigger booking_events_no_update before update or delete on public.booking_events
  for each row execute function public.booking_events_immutable();

-- A guardian's standing approval for one employer, earned after a clean first booking.
create table public.trusted_employers (
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  junior_id   uuid not null references public.juniors (profile_id) on delete cascade,
  employer_id uuid not null references public.employers (profile_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (parent_id, junior_id, employer_id)
);

-- ── Helpers ───────────────────────────────────────────────────────────────────

-- States in which the teen has been confirmed for the job (address + contacts are shared).
create function public.booking_is_confirmed(s public.booking_state) returns boolean
language sql immutable as $$
  select s in ('confirmed', 'payment_authorized', 'checked_in', 'in_progress', 'work_ended', 'captured', 'paid', 'closed', 'handed_off', 'disputed');
$$;

-- Strip phone numbers, e-mail addresses and social handles from free text shown before confirmation.
create function public.mask_contact_info(input text) returns text
language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(input, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[contact hidden]', 'g'),
             '(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', '[contact hidden]', 'g'),
           '(^|\s)@[A-Za-z0-9_.]{2,}', '\1[contact hidden]', 'g');
$$;

-- The one place state changes happen.
create function public.booking_step(b_id uuid, ev text, actor text, actor_id uuid, reason text default null)
returns public.booking_state
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  nxt public.booking_state;
begin
  select * into b from public.bookings where id = b_id for update;
  if b.id is null then perform public.fail('Booking not found.'); end if;

  select bt.to_state into nxt from public.booking_transitions bt
   where bt.track = b.track and bt.from_state = b.state and bt.event = ev and bt.actor = booking_step.actor;
  if nxt is null then
    perform public.fail(case when public.booking_is_terminal(b.state)
      then 'This request is already closed.'
      else 'That action isn''t available right now.' end);
  end if;

  update public.bookings set state = nxt, state_changed_at = now() where id = b.id;
  insert into public.booking_events (booking_id, actor_id, actor_role, event, from_state, to_state, reason)
  values (b.id, actor_id, booking_step.actor, ev, b.state, nxt, reason);
  return nxt;
end $$;

-- Mark the job filled once every opening is taken; expire the other open requests on it.
create function public.booking_fill_check(job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  jb public.jobs;
  taken int;
  other uuid;
begin
  select * into jb from public.jobs where id = job for update;
  select count(*) into taken from public.bookings where job_id = job and public.booking_is_confirmed(state);
  if taken >= jb.openings and jb.status = 'posted' then
    update public.jobs set status = 'filled' where id = job;
    for other in select id from public.bookings where job_id = job and not public.booking_is_terminal(state) and not public.booking_is_confirmed(state) loop
      perform public.booking_step(other, 'expire', 'system', null, 'job_filled');
    end loop;
  end if;
end $$;

-- Apply every automatic (system) step that the current state allows, in order.
create function public.booking_autoadvance(b_id uuid) returns public.booking_state
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  trusted boolean;
begin
  loop
    select * into b from public.bookings where id = b_id;
    if b.state = 'applied' then
      perform public.booking_step(b.id, 'submit', 'system', null);
    elsif b.state = 'parent_review' then
      select exists (
        select 1 from public.trusted_employers te
        join public.guardianships g on g.parent_id = te.parent_id and g.junior_id = te.junior_id and g.status = 'active'
        where te.junior_id = b.junior_id and te.employer_id = b.employer_id
      ) into trusted;
      exit when not trusted;
      update public.bookings set fast_path = true where id = b.id;
      perform public.booking_step(b.id, 'trusted_auto_approve', 'system', null, 'trusted_employer');
    elsif b.state = 'parent_approved' and b.origin = 'invited' then
      perform public.booking_step(b.id, 'invite_preaccepted', 'system', null);
    elsif b.state = 'employer_accepted' then
      perform public.booking_step(b.id, case when b.track = 'casual' then 'confirm' else 'hand_off' end, 'system', null);
      perform public.booking_fill_check(b.job_id);
    else
      exit;
    end if;
  end loop;
  return (select state from public.bookings where id = b_id);
end $$;

-- Common checks that a teen may take this job.
create function public.assert_teen_can_take(j public.jobs, junior uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select status from public.profiles where id = junior) <> 'active' then
    perform public.fail('This teen''s account isn''t fully set up yet.');
  end if;
  if j.status <> 'posted' then perform public.fail('This job is no longer taking requests.'); end if;
  if not exists (select 1 from public.job_shifts s where s.job_id = j.id and s.start_at > now()) then
    perform public.fail('This job has no upcoming dates.');
  end if;
  if public.junior_age(junior) < (select min_age from public.job_categories where id = j.category_id) then
    perform public.fail('This kind of job has a higher minimum age.');
  end if;
  if exists (select 1 from public.bookings b where b.job_id = j.id and b.junior_id = junior and not public.booking_is_terminal(b.state)) then
    perform public.fail('There''s already an open request for this job.');
  end if;
end $$;

-- ── Client RPCs ───────────────────────────────────────────────────────────────

create function public.apply_to_job(job_id uuid, message text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  j public.jobs;
  b_id uuid;
begin
  if not public.current_role_is('junior') then perform public.fail('Only teens can apply.'); end if;
  if (select status from public.profiles where id = uid) <> 'active' then
    perform public.fail('Finish setting up your account before applying.');
  end if;
  select * into j from public.jobs where id = job_id;
  if j.id is null then perform public.fail('Job not found.'); end if;
  perform public.assert_teen_can_take(j, uid);
  if (select count(*) from public.bookings b where b.junior_id = uid and not public.booking_is_terminal(b.state) and not public.booking_is_confirmed(b.state)) >= 15 then
    perform public.fail('You have 15 open requests. Wait for some answers first.');
  end if;

  insert into public.bookings (job_id, junior_id, employer_id, track, origin, state, message)
  values (j.id, uid, j.employer_id, j.track, 'applied', 'applied', nullif(trim(message), ''))
  returning id into b_id;
  insert into public.booking_events (booking_id, actor_id, actor_role, event, from_state, to_state)
  values (b_id, uid, 'junior', 'apply', null, 'applied');

  perform public.booking_autoadvance(b_id);
  return b_id;
end $$;

create function public.invite_junior(job_id uuid, junior_id uuid, message text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  j public.jobs;
  b_id uuid;
begin
  if not public.current_role_is('employer') or (select status from public.profiles where id = uid) <> 'active' then
    perform public.fail('Finish verification before sending hire requests.');
  end if;
  select * into j from public.jobs where id = job_id and employer_id = uid;
  if j.id is null then perform public.fail('Choose one of your posted jobs.'); end if;
  if not exists (select 1 from public.juniors x where x.profile_id = junior_id and x.discoverable) then
    perform public.fail('This teen isn''t available.');
  end if;
  perform public.assert_teen_can_take(j, junior_id);
  if (select count(*) from public.bookings b where b.employer_id = uid and b.origin = 'invited'
        and b.created_at > now() - interval '1 day') >= 30 then
    perform public.fail('You''ve sent a lot of requests today. Try again tomorrow.');
  end if;

  insert into public.bookings (job_id, junior_id, employer_id, track, origin, state, message)
  values (j.id, junior_id, uid, j.track, 'invited', 'invited', nullif(trim(message), ''))
  returning id into b_id;
  insert into public.booking_events (booking_id, actor_id, actor_role, event, from_state, to_state)
  values (b_id, uid, 'employer', 'invite', null, 'invited');
  return b_id;
end $$;

create function public.respond_to_invite(booking_id uuid, accept boolean) returns public.booking_state
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  b public.bookings;
begin
  select * into b from public.bookings where id = booking_id and junior_id = uid;
  if b.id is null then perform public.fail('Request not found.'); end if;
  if accept then
    perform public.assert_teen_can_take_existing(b);
    perform public.booking_step(b.id, 'accept_invite', 'junior', uid);
    return public.booking_autoadvance(b.id);
  end if;
  return public.booking_step(b.id, 'decline_invite', 'junior', uid);
end $$;

create function public.parent_decide(booking_id uuid, approve boolean, reason text default null) returns public.booking_state
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  b public.bookings;
begin
  select * into b from public.bookings where id = booking_id;
  if b.id is null or not public.is_guardian_of(b.junior_id) then perform public.fail('Request not found.'); end if;
  if approve then
    perform public.booking_step(b.id, 'parent_approve', 'parent', uid, nullif(trim(reason), ''));
    return public.booking_autoadvance(b.id);
  end if;
  return public.booking_step(b.id, 'parent_decline', 'parent', uid, nullif(trim(reason), ''));
end $$;

create function public.employer_decide(booking_id uuid, accept boolean, reason text default null) returns public.booking_state
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  b public.bookings;
begin
  select * into b from public.bookings where id = booking_id and employer_id = uid;
  if b.id is null then perform public.fail('Request not found.'); end if;
  if accept then
    perform public.booking_step(b.id, 'employer_accept', 'employer', uid, nullif(trim(reason), ''));
    return public.booking_autoadvance(b.id);
  end if;
  return public.booking_step(b.id, 'employer_decline', 'employer', uid, nullif(trim(reason), ''));
end $$;

create function public.cancel_booking(booking_id uuid, reason text default null) returns public.booking_state
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  b public.bookings;
  actor text;
begin
  select * into b from public.bookings where id = booking_id;
  if b.id is null then perform public.fail('Request not found.'); end if;
  actor := case
    when b.junior_id = uid then 'junior'
    when b.employer_id = uid then 'employer'
    when public.is_guardian_of(b.junior_id) then 'parent'
  end;
  if actor is null then perform public.fail('Request not found.'); end if;
  return public.booking_step(b.id, 'cancel', actor, uid, nullif(trim(reason), ''));
end $$;

-- Re-check eligibility when a teen accepts an invitation (the job may have changed since).
create function public.assert_teen_can_take_existing(b public.bookings) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  j public.jobs;
begin
  select * into j from public.jobs where id = b.job_id;
  if j.status <> 'posted' then perform public.fail('This job is no longer taking requests.'); end if;
  if not exists (select 1 from public.job_shifts s where s.job_id = j.id and s.start_at > now()) then
    perform public.fail('This job has no upcoming dates.');
  end if;
end $$;

-- A guardian can trust an employer after at least one clean, finished booking with them.
create function public.set_trusted_employer(junior_id uuid, employer_id uuid, trusted boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if not public.is_guardian_of(junior_id) then perform public.fail('Only a linked guardian can do this.'); end if;
  if not trusted then
    delete from public.trusted_employers te where te.parent_id = uid and te.junior_id = set_trusted_employer.junior_id and te.employer_id = set_trusted_employer.employer_id;
    return;
  end if;
  if not exists (
    select 1 from public.bookings b
    where b.junior_id = set_trusted_employer.junior_id and b.employer_id = set_trusted_employer.employer_id
      and b.state in ('closed', 'handed_off')
  ) then
    perform public.fail('You can trust an employer after your teen has finished a job with them.');
  end if;
  insert into public.trusted_employers (parent_id, junior_id, employer_id)
  values (uid, junior_id, employer_id) on conflict do nothing;
end $$;

-- Is the caller one of this booking's parties, and in what role?
create function public.booking_role(b public.bookings) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when b.junior_id = (select auth.uid()) then 'junior'
    when b.employer_id = (select auth.uid()) then 'employer'
    when public.is_guardian_of(b.junior_id) then 'parent'
    when public.is_admin() then 'admin'
  end;
$$;

-- Everything the booking screen shows, shaped for the caller's role. Contact details and the
-- address appear only once the booking is confirmed (Track A) or handed off (Track B).
create function public.booking_detail(booking_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.bookings;
  viewer_role text;
  revealed boolean;
  j public.jobs;
  jp public.profiles;
  ep public.profiles;
  e public.employers;
  trusted boolean;
  can_trust boolean;
begin
  select * into b from public.bookings where id = booking_id;
  viewer_role := public.booking_role(b);
  if b.id is null or viewer_role is null then perform public.fail('Request not found.'); end if;
  revealed := public.booking_is_confirmed(b.state);
  select * into j from public.jobs where id = b.job_id;
  select * into jp from public.profiles where id = b.junior_id;
  select * into ep from public.profiles where id = b.employer_id;
  select * into e from public.employers where profile_id = b.employer_id;

  if viewer_role = 'parent' then
    trusted := exists (select 1 from public.trusted_employers te where te.parent_id = (select auth.uid()) and te.junior_id = b.junior_id and te.employer_id = b.employer_id);
    can_trust := exists (select 1 from public.bookings x where x.junior_id = b.junior_id and x.employer_id = b.employer_id and x.state in ('closed', 'handed_off'));
  end if;

  return jsonb_build_object(
    'id', b.id, 'state', b.state, 'track', b.track, 'origin', b.origin, 'fast_path', b.fast_path,
    'role', viewer_role, 'revealed', revealed, 'created_at', b.created_at, 'state_changed_at', b.state_changed_at,
    'message', case when revealed or viewer_role in ('admin') then b.message else public.mask_contact_info(b.message) end,
    'job', jsonb_build_object(
      'id', j.id, 'title', j.title, 'category_id', j.category_id, 'rate_cents', j.rate_cents, 'pay_type', j.pay_type,
      'city', j.city, 'schedule_note', j.schedule_note,
      'shifts', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'start_at', s.start_at, 'end_at', s.end_at) order by s.start_at)
                          from public.job_shifts s where s.job_id = j.id), '[]'),
      'address', case when revealed or viewer_role = 'employer' then
                   (select jsonb_build_object('line', d.address_line, 'notes', d.access_notes) from public.job_private_details d where d.job_id = j.id) end),
    'junior', jsonb_build_object(
      'id', b.junior_id,
      'name', case when viewer_role = 'employer' and not revealed then public.short_name(jp.full_name) else jp.full_name end,
      'age_band', public.age_band(public.junior_age(b.junior_id)),
      'phone', case when revealed and viewer_role <> 'junior' then jp.phone end,
      'guardians', case when revealed or viewer_role = 'parent' then coalesce((
          select jsonb_agg(jsonb_build_object('name', gp.full_name, 'phone', case when revealed then gp.phone end))
          from public.guardianships g join public.profiles gp on gp.id = g.parent_id
          where g.junior_id = b.junior_id and g.status = 'active'), '[]') end),
    'employer', jsonb_build_object(
      'id', b.employer_id, 'name', e.display_name, 'kind', e.kind,
      'contact_name', case when revealed or viewer_role = 'employer' then ep.full_name end,
      'phone', case when revealed and viewer_role <> 'employer' then ep.phone end,
      'supervisor', case when e.kind = 'business' and (revealed or viewer_role = 'employer') then
                      jsonb_build_object('name', e.supervisor_name, 'email', e.supervisor_email) end),
    'trusted', trusted, 'can_trust', can_trust,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('event', ev.event, 'actor_role', ev.actor_role, 'to_state', ev.to_state, 'reason', ev.reason, 'at', ev.at) order by ev.id)
      from public.booking_events ev where ev.booking_id = b.id), '[]')
  );
end $$;

-- The caller's bookings, with what's needed for list rows. `needs_action` = it's their move.
create function public.my_bookings()
returns table (
  id uuid, state public.booking_state, track public.job_track, origin text, job_id uuid, job_title text,
  rate_cents int, pay_type public.pay_type, city text, employer_name text, junior_id uuid, junior_name text,
  next_shift_at timestamptz, updated_at timestamptz, needs_action boolean, fast_path boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r public.app_role;
begin
  select p.role into r from public.profiles p where p.id = uid;
  return query
  select b.id, b.state, b.track, b.origin, b.job_id, j.title, j.rate_cents, j.pay_type, j.city, e.display_name,
         b.junior_id,
         case when r = 'employer' and not public.booking_is_confirmed(b.state) then public.short_name(jp.full_name) else jp.full_name end,
         (select min(s.start_at) from public.job_shifts s where s.job_id = j.id and s.end_at > now()),
         b.updated_at,
         case r
           when 'junior' then b.state = 'invited'
           when 'parent' then b.state = 'parent_review'
           when 'employer' then b.state = 'parent_approved' and b.origin = 'applied'
           else false
         end,
         b.fast_path
  from public.bookings b
  join public.jobs j on j.id = b.job_id
  join public.employers e on e.profile_id = b.employer_id
  join public.profiles jp on jp.id = b.junior_id
  where (r = 'junior' and b.junior_id = uid)
     or (r = 'employer' and b.employer_id = uid)
     or (r = 'parent' and public.is_guardian_of(b.junior_id))
  order by (case r
              when 'junior' then b.state = 'invited'
              when 'parent' then b.state = 'parent_review'
              when 'employer' then b.state = 'parent_approved' and b.origin = 'applied'
            end) desc nulls last,
           public.booking_is_terminal(b.state), b.updated_at desc;
end $$;

-- ── Expiry (pg_cron) ──────────────────────────────────────────────────────────
-- Requests don't hang forever: 72h without a response, or the job's first upcoming shift has
-- started before the booking was confirmed.
create function public.expire_stale_bookings() returns int
language plpgsql security definer set search_path = '' as $$
declare
  b record;
  n int := 0;
begin
  for b in
    select x.id from public.bookings x
    where x.state in ('invited', 'applied', 'parent_review', 'parent_approved', 'employer_accepted')
      and (x.state_changed_at < now() - interval '72 hours'
           or not exists (select 1 from public.job_shifts s where s.job_id = x.job_id and s.start_at > now()))
  loop
    perform public.booking_step(b.id, 'expire', 'system', null, 'no_response');
    n := n + 1;
  end loop;
  return n;
end $$;

create extension if not exists pg_cron;
select cron.schedule('expire-stale-bookings', '*/15 * * * *', 'select public.expire_stale_bookings()');

-- ── job_detail: teens and guardians with a booking can still open the job; confirmed ones see
-- the address. (Replaces the Phase 4 definition.)
create or replace function public.job_detail(job_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r public.app_role;
  jb public.jobs;
  origin extensions.geography;
  involved boolean;
  confirmed boolean;
begin
  select role into r from public.profiles where id = uid;
  select * into jb from public.jobs where id = job_id;
  if jb.id is null then perform public.fail('Job not found.'); end if;

  select exists (select 1 from public.bookings b where b.job_id = jb.id and (b.junior_id = uid or public.is_guardian_of(b.junior_id))),
         exists (select 1 from public.bookings b where b.job_id = jb.id and (b.junior_id = uid or public.is_guardian_of(b.junior_id)) and public.booking_is_confirmed(b.state))
    into involved, confirmed;

  if r = 'employer' and jb.employer_id <> uid then perform public.fail('Job not found.'); end if;
  if jb.employer_id <> uid and jb.status <> 'posted' and not involved then perform public.fail('This job is no longer available.'); end if;

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
    'address', case when jb.employer_id = uid or confirmed then (select jsonb_build_object('line', d.address_line, 'notes', d.access_notes)
                                                                  from public.job_private_details d where d.job_id = jb.id) end,
    'my_booking', (select jsonb_build_object('id', b.id, 'state', b.state) from public.bookings b
                   where b.job_id = jb.id and b.junior_id = uid order by b.created_at desc limit 1)
  );
end $$;

-- ── RLS & grants ──────────────────────────────────────────────────────────────

alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.trusted_employers enable row level security;

create policy "bookings: parties read" on public.bookings for select to authenticated
  using (junior_id = (select auth.uid()) or employer_id = (select auth.uid()) or public.is_guardian_of(junior_id) or public.is_admin());
create policy "booking_events: parties read" on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));  -- inherits the bookings policy
create policy "trusted_employers: guardian reads own" on public.trusted_employers for select to authenticated
  using (parent_id = (select auth.uid()));

grant select on public.bookings, public.booking_events, public.trusted_employers to authenticated;

revoke execute on function
  public.booking_step(uuid, text, text, uuid, text), public.booking_autoadvance(uuid),
  public.booking_fill_check(uuid), public.expire_stale_bookings(),
  public.assert_teen_can_take(public.jobs, uuid), public.assert_teen_can_take_existing(public.bookings)
from public, anon, authenticated;

grant execute on function
  public.apply_to_job(uuid, text), public.invite_junior(uuid, uuid, text), public.respond_to_invite(uuid, boolean),
  public.parent_decide(uuid, boolean, text), public.employer_decide(uuid, boolean, text), public.cancel_booking(uuid, text),
  public.set_trusted_employer(uuid, uuid, boolean), public.booking_detail(uuid), public.my_bookings()
to authenticated;
