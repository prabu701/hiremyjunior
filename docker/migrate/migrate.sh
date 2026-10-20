#!/usr/bin/env bash
# Applies supabase/migrations/*.sql once each, in filename order, tracked in
# supabase_migrations.schema_migrations (same table the Supabase CLI uses).
#   migrate  — apply pending migrations (default)
#   test     — run the pgTAP suite in supabase/tests; exits non-zero on any failure
#   seed     — load demo data (supabase/seed.sql); run via `pnpm db:seed`
set -euo pipefail
PSQL=(psql -v ON_ERROR_STOP=1 -X -q)

wait_for_auth_schema() {
  # GoTrue creates/updates auth.* on boot; migrations reference auth.users.
  for _ in $(seq 1 60); do
    if "${PSQL[@]}" -tAc "select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='raw_user_meta_data'" | grep -q 1; then
      return 0
    fi
    sleep 1
  done
  echo "auth.users never appeared — is the auth container healthy?" >&2
  exit 1
}

migrate() {
  wait_for_auth_schema
  "${PSQL[@]}" <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  name text,
  applied_at timestamptz not null default now()
);
SQL
  shopt -s nullglob
  local applied=0
  for file in /supabase/migrations/*.sql; do
    local base version
    base=$(basename "$file" .sql)
    version=${base%%_*}
    if "${PSQL[@]}" -tAc "select 1 from supabase_migrations.schema_migrations where version = '$version'" | grep -q 1; then
      continue
    fi
    echo "→ applying $base"
    "${PSQL[@]}" --single-transaction \
      -f "$file" \
      -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '${base#*_}')"
    applied=$((applied + 1))
  done
  # Tell PostgREST to pick up new tables/policies without a restart.
  "${PSQL[@]}" -c "notify pgrst, 'reload schema'"
  echo "migrations: $applied applied, database up to date"
}

run_tests() {
  shopt -s nullglob
  local failed=0 total=0
  for file in /supabase/tests/*.sql; do
    total=$((total + 1))
    echo "── $(basename "$file")"
    local out
    if ! out=$(psql -X -v ON_ERROR_STOP=1 -tA -f "$file" 2>&1); then
      echo "$out"; failed=$((failed + 1)); continue
    fi
    echo "$out" | grep -E '^(ok|not ok|#)' || true
    if echo "$out" | grep -qE '^not ok|Looks like you (failed|planned)'; then
      failed=$((failed + 1))
    fi
  done
  echo
  if [ "$failed" -gt 0 ]; then echo "pgTAP: $failed of $total files FAILED"; exit 1; fi
  echo "pgTAP: all $total files passed"
}

seed() {
  "${PSQL[@]}" -tA --single-transaction -f /supabase/seed.sql | grep '^seed:' || true
}

case "${1:-migrate}" in
  migrate) migrate ;;
  test) run_tests ;;
  seed) seed ;;
  *) echo "usage: migrate.sh [migrate|test|seed]" >&2; exit 2 ;;
esac
