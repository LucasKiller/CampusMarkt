#!/bin/sh

set -eu

migrations_directory="${MIGRATIONS_DIRECTORY:-/app/migrations}"

psql -X --set ON_ERROR_STOP=1 <<'SQL'
create schema if not exists app_migrations;
revoke all on schema app_migrations from public, anon, authenticated;

create table if not exists app_migrations.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

revoke all on table app_migrations.schema_migrations from public, anon, authenticated;
SQL

for migration in "$migrations_directory"/*.sql; do
  [ -f "$migration" ] || continue
  filename="${migration##*/}"
  version="${filename%.sql}"

  case "$version" in
    *[!0-9A-Za-z_]*)
      echo "Invalid migration filename: $filename" >&2
      exit 1
      ;;
  esac

  applied="$(psql -X --tuples-only --no-align --set ON_ERROR_STOP=1 \
    --command "select count(*) from app_migrations.schema_migrations where version = '$version';")"

  if [ "$applied" = "0" ]; then
    psql -X --set ON_ERROR_STOP=1 --single-transaction \
      --file "$migration" \
      --command "insert into app_migrations.schema_migrations (version) values ('$version');"
  fi
done
