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
