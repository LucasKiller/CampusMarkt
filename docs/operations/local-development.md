# Local development

Run all commands from the repository root. Install Node.js 24, npm 11, Docker with Compose v2, OpenSSL, and a POSIX shell (Git Bash or WSL is sufficient on Windows).

## Prepare the environment

Install the exact dependency graph from the lockfile. Copy `infra/supabase/.env.example` to the ignored root `.env`, then generate unique development secrets with the vendored Supabase utilities. The generators may display secrets while updating `.env`; use a private terminal and never paste their output into tickets or commits.

```console
$ npm ci
$ sh infra/supabase/utils/generate-keys.sh --update-env
$ sh infra/supabase/utils/add-new-auth-keys.sh --update-env
```

In `.env`, set `NEXT_PUBLIC_SUPABASE_URL`, `SITE_URL`, and `IDENTITY_ACTION_BASE_URL` to `http://localhost:8080`; set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the generated `SUPABASE_PUBLISHABLE_KEY`; include `identity_api` and `marketplace_api` in `PGRST_DB_SCHEMAS`; and leave `SMTP_USER` and `SMTP_PASS` empty for Inbucket. Keep all non-`NEXT_PUBLIC_` secrets server-only. Validate the resulting local contract:

```console
$ npm run env:validate
$ docker compose config --quiet
```

## Start, migrate, and smoke-test

One root command builds and starts the web app, Caddy, PostgreSQL, Auth, REST, Realtime, Storage, and their support services. The unprofiled migration gate applies pending migrations before the web service can become healthy.

```console
$ docker compose --profile local up --detach --wait
```

Check both application health levels and the public shell through Caddy:

```console
$ curl --fail --show-error http://localhost:8080/health/live
$ curl --fail --show-error http://localhost:8080/health/ready
$ curl --fail --show-error http://localhost:8080/
```

Registration confirmation emails are captured by the local Inbucket inbox at `http://localhost:9000`. They are not sent to external recipients.

To re-run migrations explicitly after adding a migration file:

```console
$ docker compose run --rm migration
$ npm run test:db
```

Stop the local stack without deleting the named PostgreSQL or Storage volumes. Never add `--volumes` unless destruction of local data is intentional and separately approved.

```console
$ docker compose --profile local down
```

## Repository gates

Use the focused gate while editing and the complete gate before handing off a feature. The final gate includes build, Compose, database, live stack, backup/restore, and browser checks.

```console
$ npm run check
$ npm run build
$ npm run docs:check
$ npm run verify
```
