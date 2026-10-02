# Coolify Deployment Design

Preserve the vendored Supabase release and root Compose workflow. Generate a separate complete Compose artifact for Coolify from the existing Compose model, using `--no-interpolate`. Normalize repository bind paths for Linux and prevent globally shared container/network names. The generated artifact is a deployment derivative, not a rewrite of upstream configuration.

Coolify terminates public HTTPS. Only Caddy receives public application traffic; it retains the existing gateway routing and denied public Auth routes. PostgreSQL, Studio, gateway, and S3 administration stay private. Google SMTP uses outbound TLS.

Use a pinned S3-compatible service with its own persistent volume on this VPS. Preserve the migration gate's dependencies and successful-completion requirement. Keep operation-only services out of ordinary startup.

Create fresh installation secrets, independent of the local development `.env`. Store them only in the resource's environment configuration. Preserve the operator's SMTP values during configuration updates.

Record deployment smoke evidence separately from a production-readiness verdict. Deferring external backup does not modify or weaken the current production preflight.

The deployment artifact, relevant tests, and operating documentation are the only repository implementation surface. No marketplace behavior or database schema changes are planned.
