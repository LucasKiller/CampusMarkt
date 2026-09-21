# University Verification Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/003-university-verification/design.md`  
**Status**: Draft

---

## Test Coverage Matrix

> Generated from `AGENTS.md`, existing vitest & Playwright configs, and the approved specification. Guidelines found: `AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain policy | unit | 1:1 mapping to spec ACs, all branches, time calculations, expiry logic | `packages/domain/src/identity/**/*.test.ts` | `npm run test:unit` |
| Input validation | unit | Valid/invalid formats, domain allowlists, boundary cases, CRLF/injection attacks | `packages/validation/src/identity/**/*.test.ts` | `npm run test:unit` |
| Transport DTOs | unit | Exact allowlisted shapes, parsing, rejection of invalid fields | `packages/types/src/identity/**/*.test.ts` | `npm run test:unit` |
| Architectural boundaries | architecture | Boundary checks ensuring no framework or secret leaks | `tests/architecture/**/*.test.ts` | `npm run test:architecture` |
| PostgreSQL schema & RPC | database integration | Table RLS, constraints, grants, uniqueness on active hash, initiation/confirm/disconnect RPCs | `supabase/tests/identity-university-persistence.test.ts` | `npm run test:db` |
| Application & repository services | unit + integration | Orchestration, rate-limiting enforcement, HMAC hashing, email dispatch, error handling | `apps/web/src/modules/identity/**/*.test.ts`, `tests/integration/identity/**` | `npm run test:unit && npm run test:integration` |
| HTTP API routes | integration | Request validation, origin checks, rate limits (429), collision (409), error envelopes | `tests/integration/identity/**/*.test.ts` | `npm run test:integration` |
| User journeys & UI | e2e | Account verification section, profile badge display, reverify/disconnect flows | `apps/web/tests/university-verification.spec.ts` | `npm run test:e2e` |
| Stack integration | stack | Real running services: initiation, Inbucket email capture, confirmation, badge check, purge cascade | `tests/integration/stack/identity/university-stack.test.ts` | `npm run test:stack` |
| Operations & runbook | operations integration | Preflight configuration, docs commands check, full suite run | `tests/integration/operations/**` | `npm run test:operations` |

---

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Domain, validation, types, and unit tests | `npm run check` |
| Integration | HTTP routes and provider adapters | `npm run check && npm run build && npm run test:integration` |
| Database | Schema migrations, RLS policies, and RPC functions | `npm run check && npm run test:db` |
| Browser | UI journey work | `npm run check && npm run build && npm run test:integration && npm run test:e2e` |
| Stack | Full Compose stack integration tests | `npm run check && npm run build && npm run test:integration && npm run test:db && npm run test:stack` |
| Full | Final implementation task and verification | `npm run verify` |

---

## Execution Plan

Phases execute strictly in order. Intra-phase dependencies are shown below; each phase depends on the completion of the preceding phase.

### Phase 1: Contracts and Guardrails
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Database Persistence and RPC Boundary
```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Server Services and HTTP Routes
```text
T9 -> T10 -> T11 -> T12
```

### Phase 4: User Journeys and System Verification
```text
T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### Phase 1: Contracts and Guardrails

### T1: Define university verification domain policy
**What**: Add `SupportedUniversity` definition (TU Braunschweig, domains `tu-braunschweig.de`, `tu-bs.de`), 24-hour token TTL, 6-month (180 days) validity constant, and verification active-state evaluator.
**Where**: `packages/domain/src/identity/university.ts`
**Depends on**: None
**Requirement**: UNIV-01, UNIV-02, UNIV-04
**Done when**:
- [x] Domain policy defines supported universities allowlist and domain mappings.
- [x] Active status evaluates `status === 'verified'` and `now < expiresAt`.
- [x] Unit tests cover all validity, expiration, and boundary conditions.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(university): define domain verification policies`

### T2: Implement institutional email validation
**What**: Implement `validateInstitutionalEmail` validating RFC 5322 syntax, length <= 254 chars, CRLF/header-injection rejection, and domain matching against supported universities allowlist.
**Where**: `packages/validation/src/identity/university/`
**Depends on**: T1
**Requirement**: UNIV-01, UNIV-06
**Done when**:
- [x] Validates `@tu-braunschweig.de` and `@tu-bs.de` emails, normalizes casing/whitespace.
- [x] Rejects unsupported domains, control characters, header injection, and malformed inputs.
- [x] Validation unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(university): implement institutional email validation`

### T3: Define verification transport DTOs
**What**: Add transport types and parse helpers for verification initiation, confirmation, status response, and public profile university badge extension.
**Where**: `packages/types/src/identity/university.ts`
**Depends on**: T2
**Requirement**: UNIV-01, UNIV-02, UNIV-03
**Done when**:
- [x] Allowlisted transport types cover initiation, confirmation, status, and public badge.
- [x] DTO parse tests assert strict schema conformity and reject unexpected fields.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(university): define transport contracts and badge types`

### T4: Add architectural boundary checks for university module
**What**: Enforce architecture rules preventing domain and validation packages from importing web/framework modules or exposing secret keys.
**Where**: `tests/architecture/identity-boundaries/university.test.ts`
**Depends on**: T3
**Requirement**: UNIV-03, UNIV-06
**Done when**:
- [x] Architecture tests assert import directions and verify secret separation.
- [x] Architecture test gate passes.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(university): add architectural boundary tests`

### Phase 2: Database Persistence and RPC Boundary

### T5: Create university verifications migration
**What**: Migration adding `identity.university_verifications` table with primary key `auth_user_id`, RLS enabled and forced, foreign key on `identity.accounts` on delete cascade, and indexes.
**Where**: `supabase/migrations/20260921080000_identity_university_verifications.sql`
**Depends on**: T4
**Requirement**: UNIV-01, UNIV-02, UNIV-05
**Done when**:
- [x] Table `identity.university_verifications` created with RLS enabled and forced.
- [x] Cascade from `identity.accounts` configured for account deletion.
- [x] Migration applies cleanly and passes DB tests.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(university): add verifications table migration`

### T6: Implement verification initiation and token RPC
**What**: `identity_api.initiate_university_verification` function checking active account state, verifying active institutional hash uniqueness, setting 24-hour token expiry, and upserting pending row.
**Where**: `supabase/migrations/20260921081000_identity_university_initiate_rpc.sql`
**Depends on**: T5
**Requirement**: UNIV-01, UNIV-06
**Done when**:
- [x] Function checks unconfirmed/deletion-pending accounts and denies initiation.
- [x] Uniqueness check rejects initiation if hash is currently active on another account.
- [x] 24-hour token expiry set and pending row persisted.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(university): add initiate verification rpc`

### T7: Implement verification confirmation and disconnect RPC
**What**: `identity_api.confirm_university_verification` setting `expires_at = now() + 180 days`, `verified_at = now()`, clearing tokens, and `identity_api.disconnect_university_verification` deleting record.
**Where**: `supabase/migrations/20260921082000_identity_university_confirm_rpc.sql`
**Depends on**: T6
**Requirement**: UNIV-02, UNIV-04, UNIV-05
**Done when**:
- [x] Confirmation validates token, sets 180-day expiry, and clears token hash.
- [x] Disconnect deletes verification record for authenticated owner.
- [x] Database integration tests cover success, expiry, collision, and race conditions.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(university): add confirm and disconnect rpcs`

### T8: Update public profile RPC with active university badge
**What**: Extend `identity_api.get_public_profile` to left join `identity.university_verifications` and project `university_id` and `badge_label` when active and unexpired.
**Where**: `supabase/migrations/20260921083000_identity_public_profile_badge.sql`
**Depends on**: T7
**Requirement**: UNIV-03, UNIV-04
**Done when**:
- [x] Active verification projects university ID and label.
- [x] Expired, pending, or revoked verification projects null badge.
- [x] Database tests assert exact public profile projection.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(university): extend public profile rpc with trust badge`

### Phase 3: Server Services and HTTP Routes

### T9: Implement university verification repository and email template
**What**: Repository adapter calling verification RPCs and verification email template rendering with action link and 24-hour expiry notice.
**Where**: `apps/web/src/modules/identity/infrastructure/supabase/repository/university.ts`
**Depends on**: T8
**Requirement**: UNIV-01, UNIV-02
**Done when**:
- [x] Repository implements typed methods for initiation, confirmation, and disconnect.
- [x] Email template renders action link and 24-hour expiration notice.
- [x] Repository integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(university): add verification repository and email template`

### T10: Implement UniversityVerificationService application service
**What**: Application service coordinating email normalization, HMAC-SHA-256 fingerprinting, dual rate limiting, audit event logging, and email delivery.
**Where**: `apps/web/src/modules/identity/application/university/index.ts`
**Depends on**: T9
**Requirement**: UNIV-01, UNIV-02, UNIV-04, UNIV-05, UNIV-06
**Done when**:
- [ ] Enforces dual rate limits (3/hr per account, 30/hr per IP) before email dispatch.
- [ ] Records audit events with pseudonymous hashes.
- [ ] Handles SMTP delivery failures gracefully with 503.
- [ ] Application unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(university): implement verification application service`

### T11: Implement verification initiation and confirmation HTTP endpoints
**What**: `POST /api/identity/university-verifications` and `POST /api/identity/university-verifications/confirm` with origin validation, error envelopes, and 429 / 409 mappings.
**Where**: `apps/web/src/app/api/identity/university-verifications/route.ts`
**Depends on**: T10
**Requirement**: UNIV-01, UNIV-02, UNIV-06
**Done when**:
- [ ] Endpoints validate same-origin request, payload syntax, and authentication.
- [ ] Returns 202 on initiation, 200 on confirmation, 400 on invalid domain, 409 on collision, 429 on rate limit.
- [ ] Route integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(university): add verification api endpoints`

### T12: Implement disconnect and account status HTTP endpoints
**What**: `DELETE /api/identity/me/university-verification` and `GET /api/identity/me/university-verification` returning verification status.
**Where**: `apps/web/src/app/api/identity/me/university-verification/route.ts`
**Depends on**: T11
**Requirement**: UNIV-04, UNIV-05
**Done when**:
- [ ] GET endpoint returns current status (none, pending, verified, expired) with expiry time.
- [ ] DELETE endpoint disconnects verification and returns 200.
- [ ] Route integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(university): add disconnect and status endpoints`

### Phase 4: User Journeys and System Verification

### T13: Implement university verification UI in Account Settings
**What**: Account settings UI component showing current verification status, initiation form with validation, reverification action, and disconnect confirmation modal.
**Where**: `apps/web/src/app/account/university-verification-section.tsx`
**Depends on**: T12
**Requirement**: UNIV-01, UNIV-04, UNIV-05
**Done when**:
- [ ] Renders current status in Account settings with accessible form controls.
- [ ] Handles submit, error summary, reverify prompt, and disconnect modal.
- [ ] Browser E2E tests verify interaction and responsive layout (360px & 1280px).
**Tests**: e2e
**Gate**: Browser
**Commit**: `feat(university): add account verification settings ui`

### T14: Implement public profile trust badge UI
**What**: Render TU Braunschweig trust badge on `/profiles/[publicId]` when verified and unexpired, with deterministic fallback when absent.
**Where**: `apps/web/src/app/profiles/[publicId]/page.tsx`
**Depends on**: T13
**Requirement**: UNIV-03, UNIV-04
**Done when**:
- [ ] Profile renders TU Braunschweig badge when verified.
- [ ] Badge is omitted when unverified, expired, or pending.
- [ ] Browser E2E tests pass.
**Tests**: e2e
**Gate**: Browser
**Commit**: `feat(university): add trust badge to public profile page`

### T15: Prove full-stack verification journeys in running stack
**What**: End-to-end stack test covering initiation, Inbucket mail capture, token staging, confirmation, profile badge projection, 6-month expiry query evaluation, and account deletion cascade.
**Where**: `tests/integration/stack/identity/university-stack.test.ts`
**Depends on**: T14
**Requirement**: UNIV-01, UNIV-02, UNIV-03, UNIV-04, UNIV-05, UNIV-06
**Done when**:
- [ ] Complete live stack journey passes in isolated test compose environment.
- [ ] Proves initiation -> Inbucket delivery -> confirmation -> badge visible.
- [ ] Proves account deletion cascades verification purge.
**Tests**: stack
**Gate**: Stack
**Commit**: `test(university): prove live stack verification journeys`

### T16: Add operational runbook and preflight validation for university verification
**What**: Operational runbook documenting institutional domain maintenance, verification audit procedures, preflight environment validation, and full test suite verification.
**Where**: `docs/operations/identity/university-verification.md`
**Depends on**: T15
**Requirement**: UNIV-01, UNIV-06
**Done when**:
- [ ] Runbook documents operational procedures, configuration, and verification commands.
- [ ] Docs verification script passes.
- [ ] Full gate (`npm run verify`) passes cleanly.
**Tests**: operations integration
**Gate**: Full
**Commit**: `docs(university): add operational runbook and complete feature gates`
