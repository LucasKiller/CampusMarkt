# Identity and Accounts Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/002-identity-accounts/design.md`
**Status**: Approved on 2026-09-15

---

## Test Coverage Matrix

> Generated from `AGENTS.md`, `apps/web/AGENTS.md`, root/package test commands, Playwright configuration, the approved specification/design, and samples from 12 existing tests. Existing tests set style/location floors; the specification's 54 acceptance criteria and 8 edge cases set the required depth.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain policies and value objects | unit | Every branch, expiry boundary, lifecycle transition, and applicable AC/edge case | `packages/domain/src/**/*.test.ts` | `npm run test:unit` |
| Input validation and normalization | unit | Valid/invalid/boundary/property cases for email, password, display name, redirect, token, identifier, and avatar crop | `packages/validation/src/**/*.test.ts` | `npm run test:unit` |
| Transport DTOs and API client | unit | Exact allowlisted shapes, result parsing, rejection of malformed/unexpected payloads | `packages/{types,api-client}/src/**/*.test.ts` | `npm run test:unit` |
| Application services | unit | Every orchestration branch, dependency order, compensation, idempotency, generic response, and listed dependency failure | `apps/web/src/modules/identity/**/*.test.ts` | `npm run test:unit` |
| Session DAL and provider adapters | unit + integration | Cookie attributes/chunks, session/account checks, provider mapping, user/service-role separation, and error paths | `apps/web/src/modules/identity/**/*.test.ts`, `tests/integration/identity/**` | `npm run test:unit && npm run test:integration` |
| HTTP routes and middleware helpers | integration | Every route: success, invalid input, unauthenticated/unauthorized, origin/content limits, rate limit, provider failure, redaction | `tests/integration/identity/**/*.test.ts` | `npm run test:integration` |
| PostgreSQL schema, RPC, grants, RLS, triggers, queues | database integration | Constraints, exact grants, role isolation, concurrency, expiry, idempotency, queue locking, public allowlists, all SQL failure paths | `supabase/tests/identity-*.test.ts` | `npm run test:db` |
| Compose, ingress, and environment | integration + stack | Rendered topology/config plus running proof of private endpoints, Auth settings, SMTP/Storage wiring, and worker lifecycle | `tests/integration/{compose,config,stack}/**/*.test.ts` | `npm run test:integration && npm run test:stack` |
| Avatar image processing and media | integration | Supported formats, signatures, malformed/animated/high-pixel input, EXIF/crop, dimensions, metadata stripping, races, Storage denial | `tests/integration/identity/avatar*.test.ts` | `npm run test:integration` |
| User-facing identity journeys | e2e | Desktop/mobile happy paths plus field/focus/error/fallback/privacy behavior and multi-browser session/deletion cases | `apps/web/tests/identity-*.spec.ts` | `npm run test:e2e` |
| Cleanup worker and operational probes | operations integration | Claim concurrency, bounded retry, idempotent absence, deadlines, partial dependency failure, diagnostics/redaction | `tests/integration/operations/identity-*.test.ts` | `npm run test:operations` |
| Static config/entity-only change | none | Build/type/lint/format/architecture/secret gate; no behavior is accepted without another tested layer | Existing root checks | `npm run check && npm run build` |

## Gate Check Commands

> Generated from the repository's existing scripts. Docker-backed gates own their Compose project and must always stop it in teardown, including failure paths.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Domain, validation, contracts, application unit work | `npm run check` |
| Integration | HTTP/provider/avatar/config work without full stack | `npm run check && npm run build && npm run test:integration` |
| Database | Migrations, functions, RLS, Storage metadata | `npm run check && npm run test:db` |
| Browser | UI journey work | `npm run check && npm run build && npm run test:integration && npm run test:e2e` |
| Operations | Worker and operational tooling | `npm run check && npm run test:db && npm run test:operations` |
| Stack | Compose/ingress/real Supabase journey work | `npm run check && npm run build && npm run test:integration && npm run test:db && npm run test:stack` |
| Full | Final implementation task and adequacy review | `npm run verify` |

---

## Execution Plan

Phases and tasks execute strictly in order. Cross-phase dependencies are stated in task bodies; the arrows below show complete intra-phase dependencies.

### Phase 1: Contracts and Guardrails

```text
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7
```

### Phase 2: Identity Persistence and Security

```text
T8 -> T9 -> T10 -> T11 -> T12 -> T13 -> T14
```

### Phase 3: Server Adapters and Application Services

```text
T15 -> T16 -> T17 -> T18 -> T19 -> T20 -> T21 -> T22
```

### Phase 4: HTTP and User Journeys

```text
T23 -> T24 -> T25 -> T26 -> T27 -> T28 -> T29 -> T30
```

### Phase 5: Operations and System Proof

```text
T31 -> T32 -> T33 -> T34 -> T35 -> T36
```

---

## Task Breakdown

### Phase 1: Contracts and Guardrails

### T1: Encode identity lifecycle policies

**What**: Add framework-independent account states, participation/deletion guards, token lifetimes, recent-authentication policy, and deterministic avatar fallback rules.
**Where**: `packages/domain/src/identity/`
**Depends on**: None
**Reuses**: Existing domain package public-entry and dependency-free conventions.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] State transitions fail closed for unconfirmed, revoked, missing, deletion-pending, and expired identities.
- [x] Exact 24-hour, 30-minute, 30-day, 10-minute, and 24-hour cleanup boundaries are represented without framework clocks.
- [x] At least 18 new requirement-derived unit tests pass with no baseline test deletion.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): define account lifecycle policies`

### T2: Validate registration and account inputs

**What**: Implement strict normalization/validation for primary email, password, display name, adult declaration, and versioned consent.
**Where**: `packages/validation/src/identity/account/`
**Depends on**: T1
**Reuses**: Existing validation public-entry convention and domain value contracts.
**Requirement**: IDAC-01, IDAC-03, IDAC-04, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Email/password/name bounds, Unicode NFC, whitespace, control-character, markup, consent, and unknown-field cases match the spec.
- [x] Password values never appear in validation errors or serialized fixtures.
- [x] At least 20 new boundary/invalid/property unit tests pass with no baseline deletion.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): validate account inputs`

### T3: Validate redirects, action tokens, and avatar requests

**What**: Implement strict public-ID, same-origin return-path, action-token, media declaration, and square-crop validation.
**Where**: `packages/validation/src/identity/security/`
**Depends on**: T2
**Reuses**: Validation exports and approved canonical-origin rules.
**Requirement**: IDAC-02, IDAC-03, IDAC-04, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] External, protocol-relative, backslash, control-character, alternate-host/port, malformed, and loop redirects use the safe fallback.
- [x] Token/public-ID/crop schemas reject malformed, unbounded, unknown, and non-finite values.
- [x] At least 20 new security-input unit tests pass with no baseline deletion.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): validate security inputs`

### T4: Define identity transport contracts

**What**: Add allowlisted API envelopes, public-profile DTO, field-error, rate-limit, session, and lifecycle result types.
**Where**: `packages/types/src/identity/`
**Depends on**: T3
**Reuses**: Existing transport-only package and single public entry point.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Public profile has exactly public ID, display name, UTC join month, and nullable same-origin avatar URL.
- [x] Failure codes cannot carry provider details, secrets, Auth IDs, or email values.
- [x] At least 8 new compile/runtime contract tests pass with no baseline deletion.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): define transport contracts`

### T5: Add the same-origin identity API client

**What**: Implement typed request/response parsing for identity routes without importing server providers or storing tokens.
**Where**: `packages/api-client/src/identity/`
**Depends on**: T4
**Reuses**: Existing API-client dependency on the public types package.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Client uses same-origin credentials and parses only the approved success/failure envelopes.
- [x] Malformed/unknown provider payloads become bounded client failures and no token persistence API exists.
- [x] At least 10 new API-client unit tests pass with no baseline deletion.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): add typed api client`

### T6: Pin identity dependencies and configuration contract

**What**: Add compatible pinned Supabase server, schema, SMTP, image-processing, and server-only dependencies plus validated identity environment variables.
**Where**: `scripts/config/identity/`
**Depends on**: T5
**Reuses**: Root workspace lockfile, deployment validator, secret redaction, and exact-version tests.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-06

**Tools**:

- MCP: `web` for official package/runtime documentation
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] Lockfile pins compatible dependencies and the Node 24 production build resolves native image processing.
- [x] Root unit/integration scripts include the new web identity and identity-integration test locations so later gates cannot silently skip them.
- [x] Internal URL, service key, HMAC pepper, action origin, policy versions, SMTP, worker, and 30-day timebox are validated/redacted.
- [x] Production rejects placeholders, weak/missing secrets, non-HTTPS or mismatched origins, and timeboxes above 30 days.
- [x] At least 16 new config/workspace tests pass with no baseline deletion.
- [x] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `chore(identity): pin dependencies and config`

### T7: Enforce identity import and secret boundaries

**What**: Extend lint and negative architecture tests so provider/admin/SMTP/Sharp imports and secrets remain in server infrastructure modules.
**Where**: `tests/architecture/identity-boundaries/`
**Depends on**: T6
**Reuses**: Existing ESLint restriction messages and discrimination-style import tests.
**Requirement**: IDAC-04, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] Domain, validation, DTO, API-client, page, and client-component forbidden imports fail with stable diagnostics.
- [x] Only server infrastructure modules may import service-role, SMTP, server-only, or image-processing adapters.
- [x] At least 10 new positive/negative architecture tests pass with no baseline deletion.
- [x] Quick gate passes.

**Tests**: unit + architecture
**Gate**: Quick
**Commit**: `test(identity): enforce server boundaries`

### Phase 2: Identity Persistence and Security

### T8: Create accounts, profiles, and consent persistence

**What**: Add private identity tables, constraints, provisioning trigger, safe public-profile RPC, exact grants, RLS, and indexes.
**Where**: `supabase/identity/accounts/`
**Depends on**: T7
**Reuses**: Foundation migration runner, database test Compose project, Auth schema, and private-by-default RLS convention.
**Requirement**: IDAC-01, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for current official Supabase/PostgreSQL behavior when needed
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] Auth insert atomically creates exactly one constrained account/profile/consent set and no invalid partial identity.
- [x] Public RPC returns only four approved fields for confirmed active profiles; other states are identical not-found.
- [x] Base tables deny anon/authenticated direct access and all foreign-key/RLS lookup columns are indexed.
- [x] At least 20 new DB tests pass with no baseline deletion.
- [x] Database gate passes and its Compose project is stopped in teardown.

**Tests**: database integration
**Gate**: Database
**Commit**: `feat(identity): persist accounts and profiles`

### T9: Add one-time identity action tokens

**What**: Add confirmation/recovery token storage and service-only issue, stage, consume, invalidate, and expiry-cleanup RPCs.
**Where**: `supabase/identity/action-tokens/`
**Depends on**: T8
**Reuses**: Private identity schema, service-role grant pattern, and database clock.
**Requirement**: IDAC-01, IDAC-03, IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] Digests are unique/purpose-bound; lifetimes are exactly 24 hours and 30 minutes; raw tokens have no column.
- [x] Concurrent/wrong-purpose/expired/used callbacks yield at most one successful transition.
- [x] Reissue invalidates earlier unused tokens and deletion cascades token data.
- [x] At least 16 new DB tests pass with no baseline deletion.
- [x] Database gate passes and its Compose project is stopped.

**Tests**: database integration
**Gate**: Database
**Commit**: `feat(identity): add action token store`

### T10: Enforce atomic abuse limits and redacted audit

**What**: Add dual identity/IP rate buckets and append-only pseudonymous security events with service-only RPCs.
**Where**: `supabase/identity/abuse/`
**Depends on**: T9
**Reuses**: Private schema, short-transaction upsert patterns, and root redaction conventions.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] Fixed windows enforce 10/15m, 3/1h, 100/15m, and 30/1h with the longest retry duration.
- [x] Both counters are consumed in one fixed-lock-order transaction and concurrency cannot exceed the limit.
- [x] Audit allows only bounded types/outcomes/hashes/correlation IDs and cascades user-linked events on purge.
- [x] At least 18 new DB/concurrency/grant tests pass with no baseline deletion.
- [x] Database gate passes and its Compose project is stopped.

**Tests**: database integration
**Gate**: Database
**Commit**: `feat(identity): persist abuse controls`

### T11: Add session assurance and immediate revocation RPCs

**What**: Persist password assurance and add active-session, identity-status, record-assurance, and all-session revocation functions.
**Where**: `supabase/identity/sessions/`
**Depends on**: T10
**Reuses**: Supabase `auth.sessions`, JWT claims, private schema, and service-only owner functions.
**Requirement**: IDAC-02, IDAC-03, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for official session semantics when needed
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] Active-session checks bind JWT `session_id` and user, and revoked/deleted/expired sessions fail closed.
- [x] Assurance is service-only, session-bound, unchanged by refresh, and exact at the 10-minute boundary.
- [x] Revocation removes every target session and concurrent/idempotent calls remain safe.
- [x] At least 16 new DB/security tests pass with no baseline deletion.
- [x] Database gate passes and its Compose project is stopped.

**Tests**: database integration
**Gate**: Database
**Commit**: `feat(identity): enforce session revocation`

### T12: Add avatar state, private bucket, and cleanup queue

**What**: Add avatar version/CAS/removal functions, immutable-key constraints, private Storage bucket policy, and cleanup-job claims.
**Where**: `supabase/identity/avatars/`
**Depends on**: T11
**Reuses**: Supabase Storage metadata/RLS, profile table, and `SKIP LOCKED` queue pattern.
**Requirement**: IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for official Storage policy behavior when needed
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] Only service credentials access the private `profile-avatars` bucket; browser roles cannot read or write directly.
- [x] Concurrent replacements expose one winning version and queue every prior/losing key before 24 hours.
- [x] Removal clears the public pointer immediately and repeated cleanup treats absence as success.
- [x] At least 18 new DB/Storage/grant/concurrency tests pass with no baseline deletion.
- [x] Database gate passes and its Compose project is stopped.

**Tests**: database integration
**Gate**: Database
**Commit**: `feat(identity): persist avatar lifecycle`

### T13: Add deletion-pending lifecycle and purge queue

**What**: Add recent-auth deletion request, immediate depublication, idempotent deletion jobs, deadline constraints, and worker claim/retry functions.
**Where**: `supabase/identity/deletion/`
**Depends on**: T12
**Reuses**: Account/session/avatar state and non-blocking queue patterns.
**Requirement**: IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] Only a live session assured within 10 minutes can create exactly one deletion-pending job.
- [x] Profile/avatar lookup disappears in the same transaction and pending accounts cannot mutate.
- [x] Queue claims are non-blocking, leases recover, retries retain privacy, and purge due never exceeds 30 days.
- [x] At least 18 new DB/lifecycle/concurrency tests pass with no baseline deletion.
- [x] Database gate passes and its Compose project is stopped.

**Tests**: database integration
**Gate**: Database
**Commit**: `feat(identity): persist account deletion`

### T14: Add identity reconciliation and confirmation synchronization

**What**: Add idempotent functions to synchronize Auth-confirmed accounts and repair valid missing profile/consent projections without enabling incomplete identities.
**Where**: `supabase/identity/reconciliation/`
**Depends on**: T13
**Reuses**: Provisioning constraints, Auth users, account state, and service-only RPC pattern.
**Requirement**: IDAC-01, IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] Sync confirms application state only when Auth is confirmed and never creates another identity/profile.
- [x] Repair validates bootstrap data, upserts exactly once, and participation remains unavailable on invalid/missing consent.
- [x] Concurrent sync/repair callbacks converge on one valid result.
- [x] At least 14 new DB/concurrency tests pass with no baseline deletion.
- [x] Database gate passes and its Compose project is stopped.

**Tests**: database integration
**Gate**: Database
**Commit**: `feat(identity): reconcile auth projections`

### Phase 3: Server Adapters and Application Services

### T15: Create server-only Supabase clients and cookie adapter

**What**: Implement isolated user-scoped/admin Supabase clients and complete read/write/clear handling for chunked HttpOnly Auth cookies.
**Where**: `apps/web/src/modules/identity/infrastructure/supabase/client/`
**Depends on**: T14
**Reuses**: Pinned Supabase dependencies, validated internal URL/secrets, and Next.js async cookie APIs.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for official Next.js and Supabase server-cookie docs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] User client receives only request cookies; admin client and service key cannot enter client bundles.
- [x] Every chunk is HttpOnly, SameSite=Lax, Path=/, <=30 days, Secure in production, and fully cleared on denial/logout.
- [x] Rotation/expiry/malformed/chunk-removal/provider errors fail closed and set no `localStorage` path.
- [x] At least 16 new adapter unit/integration tests pass with no baseline deletion.
- [x] Integration gate passes.

**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(identity): add supabase server clients`

### T16: Implement the identity RPC repository

**What**: Implement typed user/service-role RPC calls and fixed result mapping for profiles, sessions, tokens, abuse, avatars, deletion, and jobs.
**Where**: `apps/web/src/modules/identity/infrastructure/supabase/repository/`
**Depends on**: T15
**Reuses**: Approved `identity_api` function surface and transport contracts.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for official Supabase JS RPC behavior when needed
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Each method chooses the minimum credential and passes owner/session IDs only from typed server identity.
- [ ] Database/provider errors map to stable internal outcomes without SQL text, inputs, hashes, or credentials.
- [ ] Public-profile parsing rejects any field outside the four-field DTO.
- [ ] At least 18 new repository integration tests pass with no baseline deletion.
- [ ] Integration gate passes.

**Tests**: integration
**Gate**: Integration
**Commit**: `feat(identity): add rpc repository`

### T17: Implement the Supabase Auth gateway

**What**: Wrap unconfirmed-user creation, password sign-in, confirmation, password update, current logout, session rotation, and Auth-user deletion behind typed ports.
**Where**: `apps/web/src/modules/identity/infrastructure/supabase/auth/`
**Depends on**: T16
**Reuses**: Server clients and approved Supabase Auth ownership.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for current official Admin/Auth APIs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Admin/user methods expose no raw provider response or secret and preserve confirmed/unconfirmed semantics.
- [ ] Duplicate, invalid, disabled, expired, revoked, absent, and dependency failures map to bounded internal codes.
- [ ] Current/all-session and Auth-user delete operations are safe to retry.
- [ ] At least 16 new gateway unit/integration tests pass with no baseline deletion.
- [ ] Integration gate passes.

**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(identity): add auth gateway`

### T18: Implement action-link hashing and SMTP delivery

**What**: Generate/stage purpose-bound 256-bit links, render redaction-safe confirmation/recovery mail, and deliver through an isolated SMTP adapter.
**Where**: `apps/web/src/modules/identity/action-links/`
**Depends on**: T17
**Reuses**: Action-token repository, Web Crypto, canonical action origin, and existing SMTP variables.
**Requirement**: IDAC-01, IDAC-03, IDAC-06

**Tools**:

- MCP: `web` for official Node crypto/SMTP-library behavior when needed
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Only SHA-256 digests persist; raw tokens exist only during mail/staging and never enter errors/audit/log fixtures.
- [ ] Confirmation/recovery URLs and expiry copy are purpose-correct; a send failure invalidates the new token.
- [ ] Token staging sets short-lived HttpOnly SameSite=Strict state and redirects to a tokenless page with no-referrer policy.
- [ ] At least 18 new unit/integration tests pass with no baseline deletion.
- [ ] Integration gate passes.

**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(identity): deliver action links`

### T19: Implement request fingerprints, rate-limit, and audit services

**What**: Derive HMAC identity/IP fingerprints from trusted ingress context and enforce/audit a decision before protected dependencies run.
**Where**: `apps/web/src/modules/identity/security/`
**Depends on**: T18
**Reuses**: Atomic abuse RPC, validated pepper, Caddy forwarding boundary, and correlation-ID contract.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Raw email/IP never persist and spoofed forwarding headers cannot select a different trusted IP.
- [ ] Denial returns the longest retry and proves Auth/SMTP/account callbacks were not invoked.
- [ ] Audit accepts allowlisted values only and redacts passwords, tokens, full emails, keys, images, and provider text.
- [ ] At least 18 new application unit tests pass with no baseline deletion.
- [ ] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): enforce abuse boundary`

### T20: Implement session and participation authorization DAL

**What**: Resolve optional/active/participating/recent identities by validating Auth, backing session existence, account state, confirmation, profile, and consent.
**Where**: `apps/web/src/modules/identity/server/session/`
**Depends on**: T19
**Reuses**: Cookie/Auth adapters, identity status RPCs, and server-only boundary.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for relevant local Next.js auth/data-security docs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Every invalid/revoked/expired/missing/deleting/unconfirmed path fails closed and clears malformed session state.
- [ ] Participation requires one complete profile/consent projection; recent auth uses assurance, not refreshed JWT issue time.
- [ ] Safe return destinations are preserved only through typed local paths and no result is cross-request cached.
- [ ] At least 20 new DAL unit/integration tests pass with no baseline deletion.
- [ ] Integration gate passes.

**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(identity): authorize active sessions`

### T21: Implement registration and confirmation services

**What**: Orchestrate registration, resend, confirmation, delivery compensation, confirmation sync, and missing-projection repair behind application ports.
**Where**: `apps/web/src/modules/identity/application/registration/`
**Depends on**: T20
**Reuses**: Validation, Auth, action-link, abuse/audit, and reconciliation adapters.
**Requirement**: IDAC-01, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Rate checks precede Auth/SMTP mutation and all enumeration-sensitive states share one accepted result.
- [ ] Valid registration yields one unconfirmed Auth/account/profile/consent identity; failure/retry/race paths never duplicate it.
- [ ] Confirmation is one-time, does not auto-sign-in, and partial Auth/application sync repairs idempotently.
- [ ] At least 22 new use-case unit tests pass with no baseline deletion.
- [ ] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): implement registration services`

### T22: Implement session and recovery services

**What**: Orchestrate sign-in, current/all logout, reauthentication, generic recovery, password reset, fail-closed revocation order, and safe redirects.
**Where**: `apps/web/src/modules/identity/application/access/`
**Depends on**: T21
**Reuses**: Auth/session DAL, action links, abuse/audit, validation, and session-revocation RPC.
**Requirement**: IDAC-02, IDAC-03, IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Sign-in records assurance for the actual session and maps invalid/unconfirmed/deleting states identically.
- [ ] Logout-current preserves other sessions; logout-all/reset/deletion deny all sessions on their next server request.
- [ ] Recovery consumes once, revokes sessions before password update, handles provider failure safely, and never identifies an account.
- [ ] At least 24 new use-case unit tests pass with no baseline deletion.
- [ ] Quick gate passes.

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(identity): implement access services`

### Phase 4: HTTP and User Journeys

### T23: Add the identity HTTP security adapter

**What**: Implement request-size/content/origin validation, server correlation IDs, no-store envelopes, generic error mapping, Retry-After, and action-cookie staging helpers.
**Where**: `apps/web/src/modules/identity/http/`
**Depends on**: T22
**Reuses**: Transport contracts, input validators, and canonical origin config.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for local Next.js Route Handler/security docs
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Cross-origin, absent/malformed browser origin, unsupported content, oversized body, and untrusted correlation inputs are rejected before use cases.
- [ ] Stable status/envelopes never expose provider details and every mutation/no-profile response has the required cache/privacy headers.
- [ ] At least 18 new HTTP-helper unit/integration tests pass with no baseline deletion.
- [ ] Integration gate passes.

**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(identity): secure http boundary`

### T24: Deliver registration and confirmation journeys

**What**: Add registration, resend, action-staging, and confirmation routes/pages/forms as one complete unconfirmed-to-confirmed journey.
**Where**: `apps/web/src/app/(identity)/registration/`
**Depends on**: T23
**Reuses**: Registration services, HTTP adapter, typed client, responsive shell, and accessible field-error pattern.
**Requirement**: IDAC-01, IDAC-06

**Tools**:

- MCP: `web` for local Next.js form/Route Handler docs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] All registration/resend/confirmation endpoint outcomes, 429 behavior, generic responses, and token staging are integration-tested.
- [ ] Form supports paste/password managers, current consent/18+ controls, focusable field/error summary, pending dedupe, and never repopulates passwords.
- [ ] At least 16 new route integration tests and 5 browser tests pass with no baseline deletion.
- [ ] Browser gate passes and Playwright stops its server.

**Tests**: integration + e2e
**Gate**: Browser
**Commit**: `feat(identity): deliver registration journey`

### T25: Deliver sign-in and logout journeys

**What**: Add sign-in, current logout, all-device logout, private-route redirect, and account-security controls.
**Where**: `apps/web/src/app/(identity)/sessions/`
**Depends on**: T24
**Reuses**: Access services, session DAL, HTTP adapter, typed client, and shell navigation.
**Requirement**: IDAC-02, IDAC-06

**Tools**:

- MCP: `web` for local Next.js cookie/redirect docs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Valid/invalid/unconfirmed/deleting/rate-limited sign-in and redirect attacks have exact HTTP coverage.
- [ ] Cookie flags, restart persistence, current logout, all logout, and next-request revocation are browser/integration tested in separate contexts.
- [ ] At least 18 new route integration tests and 6 browser tests pass with no baseline deletion.
- [ ] Browser gate passes and Playwright stops its server.

**Tests**: integration + e2e
**Gate**: Browser
**Commit**: `feat(identity): deliver session journey`

### T26: Deliver password recovery journey

**What**: Add generic recovery request, token staging, reset form, password update, and old-session revocation routes/pages.
**Where**: `apps/web/src/app/(identity)/recovery/`
**Depends on**: T25
**Reuses**: Recovery services, action-cookie helper, HTTP adapter, typed client, and accessible password form.
**Requirement**: IDAC-03, IDAC-06

**Tools**:

- MCP: `web` for local Next.js form/security docs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Existing/absent/deleting emails have indistinguishable accepted responses and delivery/token failures leak nothing.
- [ ] Valid, expired, malformed, reused, wrong-purpose, boundary-time, provider-failure, and concurrent resets have exact coverage.
- [ ] At least 16 new route integration tests and 5 browser tests pass with no baseline deletion.
- [ ] Browser gate passes and Playwright stops its server.

**Tests**: integration + e2e
**Gate**: Browser
**Commit**: `feat(identity): deliver recovery journey`

### T27: Deliver public and owner profile journeys

**What**: Add public profile read/page and owner display-name read/update account UI through safe DTOs.
**Where**: `apps/web/src/app/profiles/`
**Depends on**: T26
**Reuses**: Public RPC, identity repository, session DAL, validation, typed client, and shell.
**Requirement**: IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for local Next.js dynamic route docs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Visitor/owner/non-owner responses expose only the safe DTO; absent/unconfirmed/deleting IDs share one 404.
- [ ] Owner update accepts exact Unicode bounds, rejects crafted/private fields, and non-owner/session-invalid mutation changes nothing.
- [ ] Fallback initials/neutral icon and last-successful-write display-name behavior are visible and tested.
- [ ] At least 14 new route integration tests and 5 browser tests pass with no baseline deletion.
- [ ] Browser gate passes and Playwright stops its server.

**Tests**: integration + e2e
**Gate**: Browser
**Commit**: `feat(identity): deliver profile journey`

### T28: Implement secure avatar processing and private media access

**What**: Decode/crop/render bounded inputs, manage immutable private Storage objects, and stream active-profile WebP derivatives through the BFF.
**Where**: `apps/web/src/modules/identity/avatar/`
**Depends on**: T27
**Reuses**: Sharp, Storage/RPC adapters, avatar CAS/cleanup queue, public profile lookup, and server-only limits.
**Requirement**: IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for official Sharp and Supabase Storage APIs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] JPEG/PNG/WebP magic/decode/type, 5 MB, pixel/dimension, animation, EXIF, crop, and malformed cases are enforced.
- [ ] Output is exactly one 512x512 metadata-free WebP and sources/temp files are removed in all paths.
- [ ] CAS races preserve the winner/old avatar and queue losing/superseded keys; media is 404 immediately when profile is hidden.
- [ ] At least 24 new image/Storage/integration tests pass with no baseline deletion.
- [ ] Integration gate passes.

**Tests**: integration
**Gate**: Integration
**Commit**: `feat(identity): process private avatars`

### T29: Deliver avatar upload, removal, and display UI

**What**: Add owner upload/crop/replace/remove routes and accessible responsive avatar controls backed by the secure avatar service.
**Where**: `apps/web/src/app/account/avatar/`
**Depends on**: T28
**Reuses**: Avatar service, HTTP adapter, session DAL, typed client, profile fallback, and responsive shell.
**Requirement**: IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for local Next.js upload limits/docs
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Multipart limit/origin/owner/version errors and dependency failures retain the previous avatar and expose stable errors.
- [ ] Crop preview, pending state, fallback, replacement/removal, broken-source handling, keyboard/focus, and responsive layout work.
- [ ] At least 16 new route integration tests and 6 browser tests pass with no baseline deletion.
- [ ] Browser gate passes and Playwright stops its server.

**Tests**: integration + e2e
**Gate**: Browser
**Commit**: `feat(identity): deliver avatar journey`

### T30: Deliver reauthentication and account deletion journey

**What**: Add password reauthentication/session rotation, explicit deletion confirmation, immediate sign-out/depublication, and pending-state UI.
**Where**: `apps/web/src/app/account/delete/`
**Depends on**: T29
**Reuses**: Access service, deletion RPC, Auth/session gateways, HTTP adapter, and account shell.
**Requirement**: IDAC-02, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for current Supabase password sign-in semantics when needed
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Older-than/equal-to 10-minute assurance requires password reauthentication and rotates without leaving an unintended session.
- [ ] Explicit confirmation changes state once, clears cookies, revokes sessions, hides profile/avatar immediately, and blocks all pending-account paths.
- [ ] Partial Auth revocation failure still denies through DB state and reports only a bounded outcome.
- [ ] At least 18 new route integration tests and 6 browser tests pass with no baseline deletion.
- [ ] Browser gate passes and Playwright stops its server.

**Tests**: integration + e2e
**Gate**: Browser
**Commit**: `feat(identity): deliver account deletion journey`

### Phase 5: Operations and System Proof

### T31: Implement identity cleanup and reconciliation worker

**What**: Add a bounded one-shot worker for avatar cleanup, deletion purge, session-assurance pruning, token/bucket expiry, and projection reconciliation.
**Where**: `scripts/identity/worker/`
**Depends on**: T30
**Reuses**: RPC/Auth/Storage ports, `SKIP LOCKED` jobs, root Node script conventions, and redacted diagnostics.
**Requirement**: IDAC-01, IDAC-03, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [ ] Claims commit before external calls; retries use capped jittered backoff and lease recovery without duplicate visible state.
- [ ] Deletion removes Storage first and Auth last; absence is success; feature-owned rows disappear without touching future data.
- [ ] Diagnostics/exit codes expose backlog/deadline/service names but no subject, token, email, IP, key, or provider details.
- [ ] At least 20 new operations integration tests pass with no baseline deletion.
- [ ] Operations gate passes and every Compose project/process is stopped.

**Tests**: operations integration
**Gate**: Operations
**Commit**: `feat(identity): add cleanup worker`

### T32: Wire identity Auth, SMTP, worker, and environment in Compose

**What**: Configure the 30-day Auth timebox, disabled autoconfirm/native action mail, web secrets, local mail capture, and one-shot worker in the root stack.
**Where**: `infra/compose/identity/`
**Depends on**: T31
**Reuses**: Root Compose includes/overrides, environment examples, health dependencies, and topology/config tests.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for official self-hosted Auth configuration
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Rendered local/production Compose carries exact session/email/secret/worker settings without exposing internal ports or secret values.
- [ ] Local mail capture is test-only; production requires TLS SMTP and strong secrets; worker is bounded and not a persistent web dependency.
- [ ] At least 16 new compose/config tests pass with no baseline deletion.
- [ ] Stack gate passes and the stack is stopped afterward.

**Tests**: integration + stack
**Gate**: Stack
**Commit**: `chore(identity): wire compose services`

### T33: Block direct public Auth mutations at ingress

**What**: Allow only Auth health/JWKS reads through Caddy and deny public signup, token, recovery, user, verify, settings, and admin mutation paths.
**Where**: `infra/caddy/Caddyfile`
**Depends on**: T32
**Reuses**: Caddy single-ingress boundary and internal web-to-Kong network path.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-06

**Tools**:

- MCP: `web` for official Caddy matcher semantics when needed
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Health/JWKS and documented non-Auth APIs remain reachable while every listed Auth bypass returns the fixed deny response.
- [ ] Internal BFF Auth operations still work and Caddy overwrites trusted client-IP forwarding headers.
- [ ] At least 12 new ingress integration/stack tests pass with no baseline deletion.
- [ ] Stack gate passes and the stack is stopped afterward.

**Tests**: integration + stack
**Gate**: Stack
**Commit**: `fix(identity): block public auth bypass`

### T34: Prove real identity dependency journeys in the stack

**What**: Add a running-stack suite for real Auth/PostgREST/SMTP-capture/Storage behavior, concurrency, outage recovery, and restart persistence.
**Where**: `tests/integration/stack/identity/`
**Depends on**: T33
**Reuses**: Foundation stack harness/diagnostics and all implemented identity adapters/routes.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [ ] Captured mail drives real confirmation/recovery at exact expiry/reuse bounds without exposing raw tokens in diagnostics.
- [ ] Multiple sessions, restart persistence, current/all logout, reset/deletion revocation, repair, avatar races, and idempotent purge pass.
- [ ] SMTP/Auth/Storage outages yield bounded failures and recovery without false completion.
- [ ] At least 24 new real-stack tests pass with no baseline deletion.
- [ ] Stack gate passes and teardown removes the isolated project/processes.

**Tests**: stack integration
**Gate**: Stack
**Commit**: `test(identity): prove stack journeys`

### T35: Complete acceptance-level browser coverage

**What**: Add cross-journey Playwright coverage for all 54 ACs and 8 edge cases requiring browser-observable evidence at 360px and 1280px.
**Where**: `apps/web/tests/identity-acceptance/`
**Depends on**: T34
**Reuses**: Existing Playwright server lifecycle, identity journey fixtures, and responsive shell checks.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Requirement-to-browser matrix has evidence for every observable happy/error/privacy/accessibility/session/deletion outcome.
- [ ] Separate contexts prove owner/non-owner and logout scope; no horizontal overflow, broken image, password echo, email leak, or external redirect occurs.
- [ ] At least 20 new acceptance browser tests pass with no baseline deletion.
- [ ] Browser gate passes and Playwright stops its server.

**Tests**: e2e
**Gate**: Browser
**Commit**: `test(identity): cover browser acceptance`

### T36: Document and gate identity operations

**What**: Add operator guidance and automated preflight/probes for SMTP, secrets, session settings, action URLs, worker schedule/backlog, cleanup deadlines, and incident recovery.
**Where**: `docs/operations/identity/`
**Depends on**: T35
**Reuses**: Existing production-readiness, upgrades, backup/restore, docs-check, preflight, and security scan tooling.
**Requirement**: IDAC-01, IDAC-02, IDAC-03, IDAC-04, IDAC-05, IDAC-06

**Tools**:

- MCP: `web` for official self-hosted operational references when needed
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [ ] Commands are executable/verified and state that no VPS/deploy/account action occurs without separate authorization.
- [ ] Preflight fails on unsafe Auth/SMTP/action-origin/worker/deadline settings and prints names/codes only.
- [ ] Legal-review and future-feature deletion-participant launch blockers remain explicit.
- [ ] At least 14 new operations/docs/config tests pass with no baseline deletion.
- [ ] Full gate passes, test counts are recorded, and all servers/Compose projects are stopped.

**Tests**: operations integration
**Gate**: Full
**Commit**: `docs(identity): add operations runbook`

---

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5

Phase 1: T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7
Phase 2: T8 -> T9 -> T10 -> T11 -> T12 -> T13 -> T14
Phase 3: T15 -> T16 -> T17 -> T18 -> T19 -> T20 -> T21 -> T22
Phase 4: T23 -> T24 -> T25 -> T26 -> T27 -> T28 -> T29 -> T30
Phase 5: T31 -> T32 -> T33 -> T34 -> T35 -> T36
```

The 36 tasks pack into five sequential whole-phase batches (7, 7, 8, 8, and 6 tasks). Before Execute, the user must choose whether those batches use sub-agents; no sub-agent is authorized by task approval alone. A fresh independent Verifier is mandatory after T36 either way.

---

## Task Granularity Check

| Tasks | Atomic scope | Status |
| --- | --- | --- |
| T1-T3 | One domain or validation module each | PASS |
| T4-T5 | One transport/client contract each | PASS |
| T6-T7 | One dependency/config or architecture guardrail each | PASS |
| T8-T14 | One cohesive migration/RPC capability plus its co-located DB evidence each | PASS |
| T15-T20 | One provider/security/DAL adapter each | PASS |
| T21-T22 | One application use-case family each | PASS |
| T23 | One shared HTTP boundary | PASS |
| T24-T27 | One complete identity journey each | PASS |
| T28-T29 | One avatar service and one avatar UI journey | PASS |
| T30 | One reauthentication/deletion journey | PASS |
| T31-T33 | One worker, Compose contract, or ingress boundary each | PASS |
| T34-T35 | One system-evidence layer each; lower layers already retain co-located tests | PASS |
| T36 | One operations/runbook and preflight capability | PASS |

---

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | phase start | PASS |
| T2 | T1 | T1 -> T2 | PASS |
| T3 | T2 | T2 -> T3 | PASS |
| T4 | T3 | T3 -> T4 | PASS |
| T5 | T4 | T4 -> T5 | PASS |
| T6 | T5 | T5 -> T6 | PASS |
| T7 | T6 | T6 -> T7 | PASS |
| T8 | T7 | phase boundary | PASS |
| T9 | T8 | T8 -> T9 | PASS |
| T10 | T9 | T9 -> T10 | PASS |
| T11 | T10 | T10 -> T11 | PASS |
| T12 | T11 | T11 -> T12 | PASS |
| T13 | T12 | T12 -> T13 | PASS |
| T14 | T13 | T13 -> T14 | PASS |
| T15 | T14 | phase boundary | PASS |
| T16 | T15 | T15 -> T16 | PASS |
| T17 | T16 | T16 -> T17 | PASS |
| T18 | T17 | T17 -> T18 | PASS |
| T19 | T18 | T18 -> T19 | PASS |
| T20 | T19 | T19 -> T20 | PASS |
| T21 | T20 | T20 -> T21 | PASS |
| T22 | T21 | T21 -> T22 | PASS |
| T23 | T22 | phase boundary | PASS |
| T24 | T23 | T23 -> T24 | PASS |
| T25 | T24 | T24 -> T25 | PASS |
| T26 | T25 | T25 -> T26 | PASS |
| T27 | T26 | T26 -> T27 | PASS |
| T28 | T27 | T27 -> T28 | PASS |
| T29 | T28 | T28 -> T29 | PASS |
| T30 | T29 | T29 -> T30 | PASS |
| T31 | T30 | phase boundary | PASS |
| T32 | T31 | T31 -> T32 | PASS |
| T33 | T32 | T32 -> T33 | PASS |
| T34 | T33 | T33 -> T34 | PASS |
| T35 | T34 | T34 -> T35 | PASS |
| T36 | T35 | T35 -> T36 | PASS |

Cross-phase dependencies point backward and are represented by the phase-order arrow; intra-phase arrows exactly match every task-body dependency.

---

## Test Co-location Validation

| Tasks | Code layer | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain | unit | unit | PASS |
| T2-T3 | Validation | unit | unit | PASS |
| T4-T5 | DTO/API client | unit | unit | PASS |
| T6 | Config/dependencies | unit/build | unit + Quick | PASS |
| T7 | Architecture | unit/architecture | unit + architecture | PASS |
| T8-T14 | Database/RPC/RLS | database integration | database integration | PASS |
| T15 | Cookie/provider adapter | unit + integration | unit + integration | PASS |
| T16 | Data access | integration | integration | PASS |
| T17-T18 | Provider adapters | unit + integration | unit + integration | PASS |
| T19 | Security application service | unit | unit | PASS |
| T20 | Session DAL | unit + integration | unit + integration | PASS |
| T21-T22 | Application services | unit | unit | PASS |
| T23 | HTTP boundary | unit + integration | unit + integration | PASS |
| T24-T27 | HTTP/UI journeys | integration + e2e | integration + e2e | PASS |
| T28 | Avatar/media service | integration | integration | PASS |
| T29-T30 | HTTP/UI journeys | integration + e2e | integration + e2e | PASS |
| T31 | Worker | operations integration | operations integration | PASS |
| T32-T33 | Compose/ingress | integration + stack | integration + stack | PASS |
| T34 | Running dependency system | stack integration | stack integration | PASS |
| T35 | Acceptance UI | e2e | e2e | PASS |
| T36 | Operations/config/docs | operations + full build | operations integration + Full | PASS |

Every production-code task includes its required test layer. T34 and T35 add independent system/acceptance evidence after lower-layer tests rather than deferring tests for earlier code.

---

## Requirement-to-Task Traceability

| Requirement | Planned tasks |
| --- | --- |
| IDAC-01 | T1-T2, T4-T6, T8-T10, T14-T22, T23-T26, T31-T36 |
| IDAC-02 | T1, T3-T4, T6, T10-T11, T15-T17, T19-T20, T22-T23, T25, T30, T32-T36 |
| IDAC-03 | T1-T4, T6, T9-T11, T15-T19, T22-T23, T26, T31-T36 |
| IDAC-04 | T1-T7, T8, T12-T13, T16, T23, T27-T29, T31, T34-T36 |
| IDAC-05 | T1, T4-T5, T8-T9, T11-T17, T20, T22-T23, T27-T36 |
| IDAC-06 | T2-T4, T6-T23, T24-T36 |

All six requirements are mapped before implementation. Per-acceptance-criterion evidence and actual test counts are recorded as each task completes and are independently re-derived in `validation.md`.
