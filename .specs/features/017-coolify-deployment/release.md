# Owner progress release evidence

Date: 2026-10-02. This is an owner review installation, with beta readiness pending.

## Installed revision and platform

- Application revision: `6cd4fb203ac475dd7b9dfc0285d05d3fb227618d`, branch `production`.
- Git default and local working branch: `development`; production publication was explicitly authorized.
- Vendored Supabase: `self-hosted/v0.8.1`, unchanged.
- Coolify 4.3.14, Compose build pack, `/compose.coolify.yaml`, repository preservation enabled.
- Successful deployment: `soisqeaibmneb70qgd5w91lj` (queue record 560), normal Coolify worker, finished successfully.
- Only Caddy has a configured public domain. The application is available at <https://campusmarkt.inovv.co>.

## Remote observations

| Check | Observed result |
| --- | --- |
| Valid HTTPS `/` | HTTP 200, marketplace interface rendered in browser |
| Valid HTTPS `/health/live` | HTTP 200, `{"status":"live"}` |
| Valid HTTPS `/health/ready` | HTTP 200, `{"status":"ready","unavailable":[]}` |
| Running services | Web, Storage, Auth, REST, Realtime, database, gateway, functions, Studio, metadata, image proxy, pooler and MinIO healthy; Caddy running |
| Migration gate | Exited with code 0 before web startup |
| Bucket initialization | Exited with code 0 before Storage startup |
| Published container host ports | Empty bindings for all installation containers |
| PostgreSQL persistence | Named resource-scoped `campusmarkt-postgres-data` volume at `/var/lib/postgresql/data` |
| Object persistence | Separate named resource-scoped `minio-data` volume at `/data` |
| SMTP authentication | Initial 2026-10-02 check reached SMTP AUTH but Google rejected credentials with code 535. Recheck on 2026-10-03 returned 235 authentication success, without printing credentials. |
| Diagnostic sessions | Disconnected after each bounded check; deployed services remain running |

Coolify adds its resource-scoped network to the services alongside the declared private backend. Caddy additionally has the Compose default ingress network. No database, administration or object-storage host ports are published. This evidence does not claim that Coolify leaves the rendered network list unchanged.

Coolify attaches a health check to the completed migration container; Docker displays its inactive health state as unhealthy after successful exit. Its exit code is 0 and the dependency gate completed successfully; this is not a running service failure.

## Installation corrections

The first deployment built successfully but repository preservation found an old empty directory where the tracked Caddyfile belonged. The exact empty placeholder was moved to a sibling preservation directory, without deleting data or volumes. The next deployment copied the repository successfully.

Coolify interpreted the optional nested `JWT_JWKS` fallback as a literal variable value and injected it into Storage. Storage rejected that value as invalid JSON. Clearing the optional variable restored the existing symmetric JWT configuration; the third deployment reported Storage healthy and completed all migrations.

The control-plane queue had hundreds of duplicate file-inspection jobs for this application. Each pending installation job was uniquely identified by its application/deployment record and moved to the queue front atomically. Queue counts were preserved and no other jobs were removed. The normal worker executed every deployment.

## Remaining obligations

On 2026-10-03, a bounded SMTP check from the deployed web container returned 235 authentication success. A single direct test message to the operator-designated mailbox was accepted by the SMTP server with code 250 and appeared in that mailbox. The deployed application's `POST /api/identity/confirmation-resends` returned HTTP 200 and `status: accepted` for the same address; the corresponding confirmation message appeared in the mailbox. The confirmation link and credentials are omitted from this record. The diagnostic Coolify terminal was closed immediately after the check. Independent HTTPS requests to `/`, `/health/live`, and `/health/ready` each returned HTTP 200. DEPLOY-02 and T3 are complete for the owner progress release.

Off-host backup is deferred by the operator. Named volumes provide persistence, not disaster recovery. Before real-user beta, prove off-host backup restoration and resolve the existing authenticated marketplace RPC composition and offer authorization/concurrency blockers in STATE.md. No production preflight PASS is claimed.

## T5 ingress healthcheck release — 2026-10-03

Production now runs commit `cc151bc32095b63ad78a1a7bed1475ce5fe83153`, published by manual Coolify deployment `jdu1x5bcxkw2bcnv4hrh7r8s`. The deployment imported that exact production revision and completed successfully. The fresh application status menu reports Container Running and Healthcheck Healthy, replacing the previous no-healthcheck status.

Caddy checks local `/health/ready` using a bounded GET every ten seconds. Existing dependency checks and the successful migration gate remain intact. Before publication, the exact command returned exit 0 for readiness and exit 1 for a nonexistent route in the deployed Caddy image. Independent post-deployment HTTPS requests to `/`, `/health/live`, and `/health/ready` returned 200 with normal certificate validation. The focused configuration suite passed 6/6; independent sensor evidence is recorded in validation.md. Diagnostic terminals were exited.

Automatic deployment remains separately pending webhook signature validation. The initial GitHub ping returned pong without exercising signature verification; actual push deliveries returned an invalid-signature response. Browser credential redaction prevented copying the shared secret correctly. The operator is correcting it directly between the existing Coolify and GitHub webhook panels; no secret is recorded here. This successful manual deployment does not establish a passing push-triggered deployment.

## Native GitHub automatic deployment — 2026-10-03

This supersedes the pending automatic-deployment finding above. The operator installed the native `lucaskiller-github` GitHub App for the personal account. The existing production application now uses that source with repository `LucasKiller/CampusMarkt`, branch `production`, and commit `HEAD`. The previous public-URL source required a separate manual webhook; the native integration receives repository events directly.

A normal push advanced production from `cc151bc` to the existing verified documentation commit `ceb4946162902e978d9b7420c3d4cfb4ecf3381d`. Without clicking Redeploy, Coolify created deployment `tergr8w2u2lvymukn5a7k2o5` with source Webhook and that exact commit. It finished Success in 1m39s; the fresh status menu reports Container Running and Healthcheck Healthy. Public HTTPS root, liveness and readiness returned 200 after completion. The redundant repository webhook `691720132` was deactivated reversibly. No diagnostic service remains running. Beta security/recovery obligations above remain unchanged.
