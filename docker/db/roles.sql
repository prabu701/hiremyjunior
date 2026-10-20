-- Adapted from supabase/supabase docker/volumes/db/roles.sql. supabase_functions_admin removed:
-- it is created by webhooks.sql, which this stack does not run (no edge functions yet).
-- NOTE: change to your own passwords for production environments
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
