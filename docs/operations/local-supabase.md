# Local Supabase stack and database clone

This repository uses the Supabase CLI to run the local Docker stack and Drizzle to manage the application schema. `supabase/config.toml` intentionally keeps Supabase migrations and seeds disabled; `packages/db/src/migrations` is the migration authority.

The clone procedure below restores the remote PostgreSQL schema and data into the local Supabase database. The dump contains user data, password hashes, sessions, and business records. Keep it in a private, encrypted location and never commit it.

## Prerequisites

- Docker Desktop is running.
- Bun is installed (`bun --version`).
- Supabase CLI is installed (`supabase --version`).
- `apps/server/.env` contains the remote `DATABASE_DIRECT_URL` when creating a fresh remote backup (this file is ignored by Git).
- `jq` is installed if chat Realtime local JWTs are needed (optional).

The host does not need `psql`; restore commands run `psql` inside the Supabase Postgres container.

## Start the local Docker stack

Run from the repository root:

```bash
supabase start
supabase status
```

With the checked-in config, the important endpoints are:

| Service         | Address                                                   |
| --------------- | --------------------------------------------------------- |
| PostgreSQL      | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Supabase API    | `http://127.0.0.1:54321`                                  |
| Supabase Studio | `http://127.0.0.1:54323`                                  |

`supabase start` recreates missing containers and reuses existing volumes. To stop the stack without deleting its data, use `supabase stop`. Do not use `supabase stop --no-backup` unless the local clone is disposable; that flag deletes the data volumes.

## Create a fresh remote backup

Run this section before switching `apps/server/.env` to local values, or temporarily restore the hosted `DATABASE_DIRECT_URL` while creating the backup. The restore section does not need the hosted value.

The following commands keep the connection string in a shell variable without printing it. The backup directory is under `tmp/`, which is ignored by Git.

```bash
BACKUP_DIR="$PWD/tmp/supabase-local"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

REMOTE_DB_URL="$(bun --env-file=apps/server/.env -e 'process.stdout.write(process.env.DATABASE_DIRECT_URL ?? "")')"
test -n "$REMOTE_DB_URL"

# The private schema is restored first because a public trigger references its function.
supabase db dump --db-url "$REMOTE_DB_URL" --schema private \
  --file "$BACKUP_DIR/private-schema.sql"
supabase db dump --db-url "$REMOTE_DB_URL" --schema public \
  --file "$BACKUP_DIR/public-schema.sql"
supabase db dump --db-url "$REMOTE_DB_URL" --data-only --schema public \
  --file "$BACKUP_DIR/public-data.sql"

# Preserve Drizzle's migration history so a later db:migrate starts from the remote state.
supabase db dump --db-url "$REMOTE_DB_URL" --schema drizzle \
  --file "$BACKUP_DIR/drizzle-schema.sql"
supabase db dump --db-url "$REMOTE_DB_URL" --data-only --schema drizzle \
  --file "$BACKUP_DIR/drizzle-data.sql"

unset REMOTE_DB_URL
chmod 600 "$BACKUP_DIR"/*.sql
```

If a backup was created on another machine, securely copy those five SQL files into the same directory instead of putting them in the repository or a public artifact store.

## Restore the backup into local Postgres

This reset is destructive to the local database only. It is required when initializing a new machine or when the local volume has been deleted.

```bash
supabase db reset --local --no-seed --yes

docker exec -i supabase_db_avin psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  < "$BACKUP_DIR/private-schema.sql"
docker exec -i supabase_db_avin psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  < "$BACKUP_DIR/public-schema.sql"
docker exec -i supabase_db_avin psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  < "$BACKUP_DIR/public-data.sql"
docker exec -i supabase_db_avin psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  < "$BACKUP_DIR/drizzle-schema.sql"
docker exec -i supabase_db_avin psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  < "$BACKUP_DIR/drizzle-data.sql"
```

`supabase db query --local --file` is not suitable for these files because a `pg_dump` file contains multiple SQL commands; restore it through the container's `psql` client as shown above.

The remote project has an additional `advisor-attachments` Storage bucket that is not created by the committed Drizzle foundation migration. Restore bucket metadata explicitly:

```bash
docker exec supabase_db_avin psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('advisor-attachments', 'advisor-attachments', false, 52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('dispute-evidence', 'dispute-evidence', false, 52428800, NULL),
  ('order-files', 'order-files', false, 52428800, NULL),
  ('public-media', 'public-media', true, 26214400,
    ARRAY['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp',
          'video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
SQL
```

This procedure copies database rows and bucket metadata, not the bytes stored in Supabase Storage. Storage files need a separate, explicitly authorized transfer and should not be copied into a normal source backup.

## Point the applications at local Supabase

You can edit the ignored `apps/server/.env` directly. Comment out the hosted-project values for `DATABASE_URL`, `DATABASE_DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`, then set their local values:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DATABASE_DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY from supabase status -o env>
SUPABASE_SECRET_KEY=<SECRET_KEY from supabase status -o env>
```

Keep one stable local `BETTER_AUTH_SECRET`; generate it once and save it in `.env` rather than regenerating it on every start. For a one-shell override instead of editing the file, use:

```bash
export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
export DATABASE_DIRECT_URL="$DATABASE_URL"
export SUPABASE_URL='http://127.0.0.1:54321'

# These values are generated by the local stack; do not use the hosted secret key locally.
export SUPABASE_PUBLISHABLE_KEY="$(supabase status -o env | sed -n 's/^PUBLISHABLE_KEY=//p')"
export SUPABASE_SECRET_KEY="$(supabase status -o env | sed -n 's/^SECRET_KEY=//p')"

export BETTER_AUTH_URL='http://localhost:3000'
export CORS_ORIGIN='http://localhost:3001,http://localhost:5174'
# Generate once and keep the same value for local sessions.
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"

export VITE_SERVER_URL='http://localhost:3000'
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"
export VITE_WEB_URL='http://localhost:3001' # used by the Admin app

bun run dev
```

The server's `.env` supplies other required development values. Replace external integration secrets (Google, Resend, SePay) with local placeholders if those integrations must not be called from development. If chat Realtime is needed, also set the private JWK generated by local Auth:

```bash
export SUPABASE_JWT_PRIVATE_JWK="$(docker exec supabase_auth_avin \
  printenv GOTRUE_JWT_KEYS | jq -c '.[0]')"
```

Do not leave a hosted `SUPABASE_JWT_PRIVATE_JWK` or hosted `SUPABASE_STORAGE_S3_*` value active when testing against local Supabase. Replace the JWK as above; comment the S3 values unless a separately configured local-compatible storage endpoint is being tested.

For a persistent local setup, put the same values in an ignored env file and start the server with `bun --env-file=apps/server/.env.local run --cwd apps/server dev`; Vite automatically reads `apps/web/.env.local` and `apps/admin/.env.local`.

## Verify the local clone

```bash
docker exec supabase_db_avin psql -U postgres -d postgres -Atc \
  "select json_build_object(
    'public_tables', (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'),
    'users', (select count(*) from public.\"user\"),
    'risk_reports', (select count(*) from public.protection_risk_report),
    'storage_buckets', (select count(*) from storage.buckets),
    'drizzle_migrations', (select count(*) from drizzle.__drizzle_migrations),
    'latest_migration_id', (select max(id) from drizzle.__drizzle_migrations)
  );"

DATABASE_DIRECT_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  bun run --cwd packages/db db:migrate
```

The migration command should complete successfully. If the remote backup was taken before the latest committed migration, Drizzle will apply that pending migration to local; otherwise it will be a no-op. The local application must use the local values above. If `.env` is switched between remote and local, restore the intended values before running production commands.

## Recreating containers on another machine

If only containers are removed in Docker Desktop, leave the volumes intact and run:

```bash
supabase start
```

If the `supabase_db_avin` volume was also removed, `supabase start` creates an empty database. Repeat the backup/restore steps above to load the cloned data again.
