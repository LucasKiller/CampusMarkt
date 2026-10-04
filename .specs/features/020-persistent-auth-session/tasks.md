# Persistent Authentication Session Tasks

**Status:** Approved by the operator's 2026-10-04 request.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| Unit/integration | Vitest | SESS-01 login cookie attributes, near-expiry rotation, 30-day bound, legacy, invalid, dependency failure. | `tests/integration/identity/session-routes.test.ts`, `tests/integration/identity/session-refresh.test.ts` | `npx vitest run tests/integration/identity/session-routes.test.ts tests/integration/identity/session-refresh.test.ts` |
| Unit/integration | Vitest | SESS-02 current/all logout, recovery/deletion clearing, reauthentication token replacement. | Identity route and application tests | `npx vitest run tests/integration/identity apps/web/src/modules/identity/application/access/index.test.ts` |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Focused | `npx vitest run tests/integration/identity apps/web/src/modules/identity/application/access/index.test.ts tests/integration/hardening/security-headers.test.ts` |
| Types | `npm run typecheck` |
| Lint | `npx eslint apps/web/src/middleware.ts apps/web/src/modules/identity apps/web/src/app/api/identity tests/integration/identity tests/integration/hardening/security-headers.test.ts` |
| Format | `npx prettier --check apps/web/src/middleware.ts apps/web/src/modules/identity/session-cookie.ts apps/web/src/modules/identity/server/access.ts apps/web/src/app/api/identity/sessions/route.ts tests/integration/identity/session-refresh.test.ts` |
| Build | `npm run --workspace @campusmarkt/web build` |

## Execution Plan

```text
T1 -> T2 -> T3
```

## Task Breakdown

### T1: Persist and rotate bounded browser credentials

**Depends on:** none
**Requirements:** SESS-01, SESS-02.4
**Deliverable:** Real access and refresh cookies on sign-in, refresh middleware, and requirement-derived login/rotation tests.
**Done when:** Near-expiry requests rotate both credentials, old cookie age remains bounded, and missing/invalid/dependency-failed refresh follows the spec without granting expired private access.
**Tests:** Session route, refresh, and security-header tests.
**Gate:** Focused tests, types, lint, format, build, and atomic commit.

### T2: Complete session termination and replacement

**Depends on:** T1
**Requirements:** SESS-02.1, SESS-02.2, SESS-02.3
**Deliverable:** Current/global logout and account-ending routes clear both cookies; reauthentication writes real rotated credentials; provider revocation uses the current session where applicable.
**Done when:** All affected route tests prove both cookies are cleared or replaced, and no success path writes a placeholder access cookie.
**Tests:** Identity route and application tests.
**Gate:** Focused tests, types, lint, format, build, status update, and atomic commit.

### T3: Close verifier-identified refresh test gaps

**Depends on:** T2
**Requirements:** SESS-01.1, SESS-01.2
**Deliverable:** Test the exact 60-second refresh threshold and assert HttpOnly on each rotated credential.
**Done when:** Both verifier sensor mutants fail the requirement-derived tests.
**Tests:** Session-refresh integration test and verifier discrimination sensor.
**Gate:** Focused tests, types, lint, format, build, and atomic commit.

## Status

- [x] T1
- [x] T2
- [x] T3

T1 gate: 65 focused Vitest tests passed across session routes, refresh behavior, security headers, and access service. Typecheck, scoped ESLint, formatting, and the production web build passed. No server or watcher remains running.

T2 gate: 361 identity, cookie, and security-header Vitest tests passed; typecheck, scoped ESLint, and production web build passed. Formatting and diff checks passed. Provider logout now receives the current access JWT, and reauthentication writes a real token pair. No server or watcher remains running.

T3 gate: 362 focused tests, typecheck, lint, formatting, and a fresh production build passed. The independent verifier will rerun the two surviving mutations before the feature verdict.

After T2 is committed, a fresh independent verifier records evidence and a discrimination sensor in `validation.md`.
