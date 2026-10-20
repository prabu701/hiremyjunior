-- Unlink → new invite → relink → confirm again (regression for "code says still linked").
begin;
\ir _helpers.psql

select plan(9);

select pg_temp.active_parent('mom@t.local') as mom \gset
select pg_temp.active_parent('dad@t.local') as dad \gset
select pg_temp.active_junior('kid@t.local', 15, '98074', :'mom') as kid \gset
select id as gid from guardianships where parent_id = :'mom' and junior_id = :'kid' \gset

-- Mom unlinks.
select pg_temp.act_as(:'mom');
select remove_guardianship(:'gid');
select pg_temp.act_as_system();
select is((select status::text from guardianships where id = :'gid'), 'revoked', 'unlinking keeps the row as revoked');

-- Mom invites again; the teen redeems.
select pg_temp.act_as(:'mom');
select create_guardian_invite() as code \gset
select pg_temp.act_as(:'kid');
select is(link_guardian(:'code')::text, :'gid', 'the revoked link is reopened, not duplicated');
select pg_temp.act_as_system();
select is((select status::text from guardianships where id = :'gid'), 'pending', 'it is pending again');
select is((select count(*)::int from guardianships where parent_id = :'mom' and junior_id = :'kid'), 1, 'still exactly one row for the pair');

-- A second code while pending gets a clear message.
select pg_temp.act_as(:'mom');
select create_guardian_invite() as code2 \gset
select pg_temp.act_as(:'kid');
select throws_like(format($$ select link_guardian(%L) $$, :'code2'), '%already sent this parent a request%', 'a duplicate request while pending is explained');

-- Mom re-confirms with a corrected DOB; no other guardian is vouching, so hers stands.
select pg_temp.act_as(:'mom');
select lives_ok(format($$ select confirm_guardianship(%L, %L) $$, :'gid', pg_temp.dob_for_age(16)), 'parent re-confirms with a different DOB');
select pg_temp.act_as_system();
select is((select dob from juniors where profile_id = :'kid'), pg_temp.dob_for_age(16), 'the new attestation replaces the old one');

-- With a second, active guardian vouching, a mismatched DOB is still refused.
select pg_temp.act_as(:'dad');
select create_guardian_invite() as code3 \gset
select pg_temp.act_as(:'kid');
select link_guardian(:'code3') as gid2 \gset
select pg_temp.act_as(:'dad');
select throws_like(format($$ select confirm_guardianship(%L, %L) $$, :'gid2', pg_temp.dob_for_age(15)), '%doesn''t match%', 'two guardians must agree');
select lives_ok(format($$ select confirm_guardianship(%L, %L) $$, :'gid2', pg_temp.dob_for_age(16)), 'matching DOB confirms');

select * from finish();
rollback;
