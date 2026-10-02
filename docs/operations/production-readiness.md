# Production readiness

This feature defines a deployable contract; it does not authorize a deployment. A production operator must satisfy every item below before starting the stack on a VPS.

## Topology and ingress

- Point a real DNS hostname at the VPS and set `CADDY_SITE_ADDRESS` to that hostname so Caddy obtains and terminates valid HTTPS.
- Expose only Caddy's HTTP/HTTPS bindings. PostgreSQL, Studio, Auth, REST, Realtime, Storage, and the gateway remain on the private Compose network; never add host port bindings for them.
- Set every public URL (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, and `SITE_URL`) to its `https://` value.
- Provision at least 4 CPU cores, 8 GB RAM, and 80 GB SSD before the production preflight.

## Secrets and external services

Start with `infra/supabase/.env.example`, merge the variable names from `infra/compose/production.env.example` into the ignored root `.env`, and replace every placeholder. Generate keys on a trusted host and keep the root `.env` readable only by the service account.

Configure a production SMTP provider with implicit TLS (`SMTP_TLS_MODE=implicit`, normally port 465); the bundled development mail service is not production delivery. Configure Supabase Storage with a provider-specific S3-compatible override following the [official S3 backend guide](https://supabase.com/docs/guides/self-hosting/self-hosted-s3). Setting `STORAGE_BACKEND=s3` alone is not sufficient: the active Compose model must render the endpoint, bucket, region, access key ID, and secret for the Storage service.

Set `BACKUP_TARGET` to mounted storage that is replicated or transferred off the primary VPS. Named Docker volumes provide restart persistence, not disaster recovery. Database dumps do not contain Storage objects, so both artifacts in the CampusMarkt manifest are required.

Validate resources and configuration, then probe the public TLS certificate, authenticate to SMTP, and issue an authenticated S3 `HeadBucket`, all with bounded redacted failures. The same `preflight` command performs both layers without printing secret values. Render the exact Compose model before any production start:

```console
$ npm run preflight
$ docker compose config --quiet
```

The preflight must fail when HTTPS, SMTP, S3-compatible Storage, off-host backup configuration, or minimum capacity is absent. That failure does not block the local workflow in `local-development.md`.

## Release smoke checks

After an authorized deployment, require healthy containers and verify the public TLS routes. Replace `campusmarkt.example` only with the deployed hostname.

```console
$ curl --fail --show-error https://campusmarkt.example/health/live
$ curl --fail --show-error https://campusmarkt.example/health/ready
$ curl --fail --show-error https://campusmarkt.example/
```

Keep operational logs and monitoring outside the containers. Record the pinned value in `infra/supabase/.supabase-version`, the application Git revision, the backup manifest path, and smoke-check results for each release.

## Coolify installation

Deploy the Git repository with the Compose build pack from `production`. Set Base Directory to `/`, Docker Compose Location to `/compose.coolify.yaml`, and enable Preserve Repository During Deployment. Assign `https://campusmarkt.inovv.co:80` only to Caddy. Coolify owns public TLS; all other services stay on the installation's private backend network.

`compose.coolify.yaml` and `infra/caddy/Caddyfile.coolify` are generated derivatives. Regenerate with `node --experimental-strip-types scripts/operations/generate-coolify-compose.ts`, then format the YAML with Prettier. The generator does not interpolate credentials or edit vendored Supabase files. Run `npx vitest run tests/integration/compose/coolify-compose.test.ts` to check the deployment boundary.

Set `STACK_ID` to the persistent Coolify resource identifier. It namespaces the private network, data volumes, and web image. Keep it unchanged on redeployments. Do not assign domains to Studio, the API gateway, PostgreSQL, Storage, or MinIO. Realtime retains its tenant hostname as a private network alias.

Generate fresh PostgreSQL, JWT, service-role, encryption, identity-pepper, dashboard, and MinIO credentials for this installation. Never reuse development values. Store them in Coolify Environment Variables; never commit an installation `.env`. Required variables use `${VARIABLE:?}` so missing values fail before startup. The public Supabase key is the only credential intended for the browser.

The public URLs (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_PUBLIC_URL`, `SITE_URL`, and `IDENTITY_ACTION_BASE_URL`) use the HTTPS application origin. `API_EXTERNAL_URL` adds `/auth/v1`. Supply public contact and privacy email addresses. For Google SMTP, use `smtp.gmail.com`, port `465`, and TLS mode `implicit`; insert the account and application password directly in Coolify. `SMTP_ADMIN_EMAIL` supplies the sender address, and `SMTP_SENDER_NAME` supplies its display name. SMTP authentication verification must not send mail or print credentials.

For the existing symmetric JWT configuration, leave optional `JWT_JWKS` empty. Coolify can interpret its nested Compose fallback as literal text and inject that invalid JSON into Storage. Enable asymmetric keys only with a separately validated Auth and API configuration. If an old empty bind placeholder conflicts with a tracked file during repository preservation, inspect and move that exact placeholder aside before retrying; never remove data volumes.

PostgreSQL persists in the resource's `campusmarkt-postgres-data` volume. Objects persist in its separate `minio-data` volume. The bucket initialization service must complete successfully before Storage starts. The application waits for the database migration gate. Do not delete these volumes or change `STACK_ID` during routine deployment.

Check the deployment logs, service health, `/`, `/health/live`, and `/health/ready` over valid HTTPS. An unhealthy service or failed migration is an incomplete deployment. Disconnect diagnostic terminal sessions immediately after each check.

This installation is initially for owner progress review. External backup was deferred by the operator. A volume on the same VPS does not provide recovery from losing the server. Before real-user beta, configure off-host backups, prove restoration, and resolve the beta security blockers recorded in `.specs/STATE.md`. The existing production preflight remains authoritative and must not be weakened or marked passing while its requirements are unmet.

