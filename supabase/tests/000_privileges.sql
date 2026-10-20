-- Guardrail: clients never get table-level write access. Writes go through RPCs; the only
-- exception is profiles, whose appearance columns are granted UPDATE column-by-column.
begin;
\ir _helpers.psql

select plan(3);

select is_empty($$
  select c.relname || ' → ' || r.rolname || ' ' || p.priv
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  cross join (values ('anon'), ('authenticated')) r(rolname)
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
  where c.relkind in ('r', 'p', 'v', 'm')
    and has_table_privilege(r.rolname, c.oid, p.priv)
$$, 'no public table grants INSERT/UPDATE/DELETE/TRUNCATE to anon or authenticated');

select is_empty($$
  select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relkind in ('r', 'p') and has_table_privilege('anon', c.oid, 'SELECT')
$$, 'anon cannot read any public table');

select is_empty($$
  select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relkind in ('r', 'p') and not c.relrowsecurity
    and c.relname not in ('spatial_ref_sys')
$$, 'every public table has row-level security enabled');

select * from finish();
rollback;
