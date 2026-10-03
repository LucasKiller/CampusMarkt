# Coolify Deployment Tasks

**Status:** Approved by the operator on 2026-10-02. The original request authorizes production publication and deployment.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| Deployment configuration | integration | Assert required services, private ports, isolated names, migration dependency, persistent volumes, and server-only secrets from DEPLOY-01. | `tests/integration/compose/coolify-compose.test.ts` | `npx vitest run tests/integration/compose/coolify-compose.test.ts` |
| Remote deployment | operational smoke | Observe valid HTTPS, HTTP 200 health responses, service health, and redacted SMTP authentication from DEPLOY-02. | release evidence | Coolify deployment and bounded HTTP/SMTP checks |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Configuration requirements | `npx vitest run tests/integration/compose/coolify-compose.test.ts` |
| Compose rendering | `docker compose -f compose.coolify.yaml config --no-interpolate --quiet` |
| Formatting | `npm run format:check` |
| Secret scanning | `npm run security:scan` |

## Execution Plan

```text
T1 -> T4 -> T2 -> T3
```

## Task Breakdown

### T1: Add complete Coolify deployment configuration

**Depends on**: none
**Requirements**: DEPLOY-01
**Deliverable**: Reproducible generator, generated Compose artifact, Caddy deployment ingress configuration, and operating instructions.
**Done when**: Required services are discovered; internal host ports and fixed cross-project names are absent; existing authorization routing and migration gate remain intact; secrets remain references.
**Tests**: Requirement-derived integration checks listed in the matrix.
**Gate**: Focused integration checks, Compose config rendering, formatting, secret scanning, and applicable build checks.

### T4: Fix Studio persistence in a fresh checkout

**Depends on**: T1
**Requirements**: DEPLOY-01
**Deliverable**: A scoped named volume for Studio snippets in the deployment derivative.
**Done when**: Generation and bind validation work from a fresh Git checkout without an ignored empty directory; vendored files remain unchanged.
**Tests**: Existing bind checks plus independent generation from a disposable checkout.
**Gate**: Focused configuration suite, typecheck, lint, and independent re-verification.

### T2: Validate the adaptation independently

**Depends on**: T4
**Requirements**: DEPLOY-01
**Deliverable**: Independent validation report with source evidence and a discrimination sensor.
**Done when**: A fresh verifier reports PASS for the repository adaptation and the structural completion gate passes.
**Tests**: Independent re-run of configuration checks; deliberate private-port and migration-gate faults in disposable copies must be detected.
**Gate**: Independent verification and `validate_state.py` for the adaptation scope.

### T3: Install and verify the owner progress release

**Depends on**: T2
**Requirements**: DEPLOY-02
**Deliverable**: Existing Coolify production resource configured and deployed from `production`, plus a release record.
**Done when**: Application, liveness, and readiness respond with HTTP 200 over valid HTTPS; SMTP authentication succeeds; diagnostic terminal sessions are disconnected; beta-readiness gaps remain recorded.
**Tests**: Bounded HTTPS and SMTP checks; inspect container health and persistence configuration.
**Gate**: Successful Coolify deployment and remote smoke checks. Missing or unhealthy services cannot be reported as complete.

## Status

### T5: Monitor public ingress readiness

Approved by the operator's request on 2026-10-03 to fix the Coolify healthcheck. DEPLOY-02: Caddy SHALL check `/health/ready` over local HTTP with a bounded GET, retain existing dependency checks, and report healthy in Coolify after deployment. Implement in the generator and derivative, assert the bounded command, independently verify, then publish and observe runtime health and HTTPS readiness.

- [x] T5

- [x] T1
- [x] T4
- [x] T2
- [x] T3



## T1 verification

Configuration suite: 58/58 tests pass with COMPOSE_DISABLE_ENV_FILE=true, preventing local .env values from contaminating absence tests. New suite: 5/5 pass. Typecheck, lint, formatting, tracked-secret scan, documentation check and production build passed. Docker Compose renders the complete artifact without interpolation. Existing vendored files have no diff.

| Acceptance criterion | Assertion evidence | Outcome |
| --- | --- | --- |
| Complete services and no includes | coolify-compose.test.ts: stack list and model.include assertions | Required services present; includes absent |
| Private ports and scoped names | coolify-compose.test.ts: per-service ports, container_name, network assertions | No host ports or global names |
| Persistent volumes and migration ordering | coolify-compose.test.ts: named volume mounts and dependency condition assertions | Separate data volumes; migration completes first |
| Credentials | coolify-compose.test.ts: exact credential references and missing.status assertion | References only; absent configuration rejected |
| Bind files and routing | coolify-compose.test.ts: existsSync and Auth-denial matcher equality | Existing files and preserved denial |

All five tests map to DEPLOY-01 criteria or listed edges. No existing tests were changed, skipped or removed.


