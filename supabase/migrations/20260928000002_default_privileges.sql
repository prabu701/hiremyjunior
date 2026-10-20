-- Supabase's defaults grant anon/authenticated ALL on every new table in public, leaving RLS as
-- the only barrier. We want two: every table must also say explicitly what clients may do
-- (usually SELECT only; writes go through security-definer RPCs). Column-level grants — like
-- hiding verifications.secret — only work once the blanket table grant is gone.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
