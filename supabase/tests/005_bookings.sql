-- Phase 5: the booking handshake on both tracks, enforced by the generated transition table.
begin;
\ir _helpers.psql

select plan(43);

select pg_temp.active_parent('mom@t.local') as mom \gset
select pg_temp.active_parent('stranger@t.local') as stranger \gset
select pg_temp.active_junior('maya@t.local', 15, '98074', :'mom') as maya \gset
select pg_temp.active_junior('jaden@t.local', 16, '98075') as jaden \gset
select pg_temp.new_user('pending@t.local', 'junior') as pending_teen \gset
select pg_temp.active_employer('chen@t.local', 'household') as chen \gset
select pg_temp.active_employer('shop@t.local', 'business') as shop \gset
select pg_temp.active_employer('other@t.local', 'household') as other \gset
select pg_temp.post_job(:'chen', 'pet_care', 'Weekend Dog Walking') as dogjob \gset
select pg_temp.post_job(:'chen', 'moving_help', 'Move Boxes') as movejob \gset
select pg_temp.post_job(:'shop', 'retail', 'Stock Associate', 1900) as stockjob \gset

-- ── Track A: apply → parent → employer → confirmed ───────────────────────────
select pg_temp.act_as(:'maya');
select apply_to_job(:'dogjob', 'Hi! I have two dogs. Text me at (425) 555-0101 or maya@gmail.com') as b1 \gset
select is((select state::text from bookings where id = :'b1'), 'parent_review', 'an application goes straight to parent review');
select results_eq($$ select event from booking_events where booking_id = $$ || quote_literal(:'b1') || $$ order by id $$,
  $$ values ('apply'), ('submit') $$, 'both steps are in the event log');
select throws_like(format($$ select apply_to_job(%L) $$, :'dogjob'), '%already an open request%', 'no duplicate applications');
select throws_like(format($$ select apply_to_job(%L) $$, :'movejob'), '%higher minimum age%', 'a 15-year-old cannot apply to a 16+ job');
select throws_like(format($$ select parent_decide(%L, true) $$, :'b1'), '%not found%', 'a teen cannot approve their own application');

select pg_temp.act_as(:'pending_teen');
select throws_like(format($$ select apply_to_job(%L) $$, :'dogjob'), '%Finish setting up%', 'unverified teens cannot apply');

select pg_temp.act_as(:'stranger');
select throws_like(format($$ select parent_decide(%L, true) $$, :'b1'), '%not found%', 'an unrelated parent cannot approve');

select pg_temp.act_as(:'chen');
select throws_like(format($$ select employer_decide(%L, true) $$, :'b1'), '%isn''t available right now%', 'the employer cannot accept before the parent approves');
select is((booking_detail(:'b1') -> 'junior' ->> 'name'), 'Maya T.', 'before confirmation the employer sees a short name');
select ok((booking_detail(:'b1') ->> 'message') not like '%555-0101%' and (booking_detail(:'b1') ->> 'message') not like '%gmail%',
  'phone numbers and e-mails in the note are masked before confirmation');
select is((booking_detail(:'b1') -> 'junior' ->> 'phone'), null, 'no teen phone before confirmation');

select pg_temp.act_as(:'maya');
select ok((booking_detail(:'b1') ->> 'message') like '%555-0101%', 'the author sees their own note unmasked');
select pg_temp.act_as(:'mom');
select ok((booking_detail(:'b1') ->> 'message') like '%555-0101%', 'the teen''s guardian sees it unmasked');
select is(parent_decide(:'b1', true)::text, 'parent_approved', 'the guardian approves');
select is((select count(*)::int from my_bookings() where id = :'b1' and not needs_action), 1, 'once decided it is no longer the parent''s move');

-- A second applicant for the same one-opening job.
select pg_temp.act_as(:'jaden');
select apply_to_job(:'dogjob') as b2 \gset

select pg_temp.act_as(:'maya');
select is((job_detail(:'dogjob') -> 'address'), 'null'::jsonb, 'no address for the teen before confirmation');

select pg_temp.act_as(:'chen');
select is((select needs_action from my_bookings() where id = :'b1'), true, 'now it is the employer''s move');
select is(employer_decide(:'b1', true)::text, 'confirmed', 'employer accepts → Track A booking is confirmed');
select is((select status::text from jobs where id = :'dogjob'), 'filled', 'the one-opening job is now filled');
select is((select state::text from bookings where id = :'b2'), 'expired', 'the other open application expires');
select is((select reason from booking_events where booking_id = :'b2' order by id desc limit 1), 'job_filled', '…with the reason recorded');
select is((booking_detail(:'b1') -> 'junior' ->> 'name'), 'Maya Tester', 'after confirmation the employer sees the full name');
select isnt((booking_detail(:'b1') -> 'junior' ->> 'phone'), null, '…and the teen''s phone');

select pg_temp.act_as(:'maya');
select is((job_detail(:'dogjob') -> 'address' ->> 'line'), '1 Test Way', 'the confirmed teen sees the address');
select isnt((booking_detail(:'b1') -> 'employer' ->> 'phone'), null, '…and the employer''s phone');
select pg_temp.act_as(:'mom');
select is((job_detail(:'dogjob') -> 'address' ->> 'line'), '1 Test Way', 'the guardian sees it too');

-- ── Track B: invite → accept → parent → handed off ───────────────────────────
select pg_temp.act_as(:'shop');
select invite_junior(:'stockjob', :'maya', 'We''d love you on Saturdays!') as b3 \gset
select is((select state::text from bookings where id = :'b3'), 'invited', 'an employer invite starts as invited');

select pg_temp.act_as(:'other');
select throws_like(format($$ select invite_junior(%L, %L) $$, :'stockjob', :'jaden'), '%Choose one of your posted jobs%', 'employers can only invite to their own jobs');
select is((select count(*)::int from bookings where id = :'b3'), 0, 'other employers cannot see the booking');

select pg_temp.act_as(:'maya');
select is(respond_to_invite(:'b3', true)::text, 'parent_review', 'the teen accepts → parent review');
select pg_temp.act_as(:'mom');
select is(parent_decide(:'b3', true)::text, 'handed_off', 'parent approves an invite → introduced (Track B, terminal)');
select is(
  (select array_agg(event order by id)::text from booking_events where booking_id = :'b3'),
  '{invite,accept_invite,parent_approve,invite_preaccepted,hand_off}',
  'Track B log: invite → accept → approve → pre-accepted → hand-off');
select is((select count(*)::int from booking_events e where e.booking_id = :'b3' and e.to_state::text in ('payment_authorized','captured','paid','confirmed')), 0,
  'Track B never touches confirmation or payment states');
select pg_temp.act_as(:'maya');
select throws_like(format($$ select cancel_booking(%L) $$, :'b3'), '%already closed%', 'terminal states cannot be changed');

-- ── Trusted employer fast path ───────────────────────────────────────────────
select pg_temp.act_as(:'mom');
select throws_like(format($$ select set_trusted_employer(%L, %L, true) $$, :'maya', :'chen'), '%finished a job%',
  'cannot trust an employer before a finished job with them');
select lives_ok(format($$ select set_trusted_employer(%L, %L, true) $$, :'maya', :'shop'), 'can trust after a clean hand-off');
select pg_temp.act_as_system();
select pg_temp.post_job(:'shop', 'retail', 'Holiday Stock Help', 1900) as stock2 \gset
select pg_temp.act_as(:'shop');
select invite_junior(:'stock2', :'maya') as b4 \gset
select pg_temp.act_as(:'maya');
select is(respond_to_invite(:'b4', true)::text, 'handed_off', 'with a trusted employer, parent review is skipped');
select is((select fast_path from bookings where id = :'b4'), true, '…and the booking is marked fast-path');

-- ── Declines, cancels, expiry ────────────────────────────────────────────────
select pg_temp.act_as_system();
select pg_temp.post_job(:'other', 'yard_work', 'Rake Leaves') as rakejob \gset
select pg_temp.act_as(:'other');
select invite_junior(:'rakejob', :'maya') as b5 \gset
select pg_temp.act_as(:'maya');
select is(respond_to_invite(:'b5', false)::text, 'junior_declined', 'a teen can decline an invitation');

select pg_temp.act_as(:'jaden');
select apply_to_job(:'rakejob') as b6 \gset
select pg_temp.act_as_system();
update bookings set state_changed_at = now() - interval '4 days' where id = :'b6';
select is(expire_stale_bookings() >= 1, true, 'the expiry job finds stale requests');
select is((select state::text from bookings where id = :'b6'), 'expired', 'requests unanswered for 72h expire');

select throws_like(format($$ update booking_events set reason = 'x' where booking_id = %L $$, :'b1'), '%append-only%', 'the event log is append-only');
select is(mask_contact_info('call 425.555.0199 or @maya_r'), 'call [contact hidden] or [contact hidden]', 'masking catches dotted phones and handles');

select * from finish();
rollback;
