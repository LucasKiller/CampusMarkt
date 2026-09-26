# Feature 014 Prelaunch Reconciliation Validation

**Date**: 2026-09-26
**Spec**: `.specs/features/014-prelaunch-reconciliation/spec.md`
**Diff range**: `a62a8a4^..0857fd7`
**Verifier**: independent sub-agent (author != verifier)
**Verdict**: PASS

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | PASS | Repository documentation, verified-feature markers, and the pre-beta boundary are reconciled. |
| T2 | PASS | Public contact identity is server-configured, validated, rendered, and documented with safe local fallbacks. |
| T3 | PASS | The moderation migration follows the real text-backed status model and the fresh migration chain executes. |
| T4 | PASS | Domain, PostgreSQL, UI, and current documentation enforce twelve calendar months. |
| T5 | PASS | Owner profile/update, university status, and avatar resolution use bounded JWT/service RPC boundaries. |

All task checkboxes are complete. Commit history is atomic for the planned work, with the final boundary repair in `0857fd7`.

---

## Spec-Anchored Acceptance Criteria

### RECON-01: Repository Truth

| Criterion | Spec-defined outcome | `file:line` + assertion/evidence | Result |
| --- | --- | --- | --- |
| README describes the implemented system | Next.js/TypeScript/self-hosted Supabase architecture, V1 limits, local setup, gates, and pre-beta status are present; no source-absent claim remains. | `README.md:9` states the pre-beta boundary; `README.md:15` lists V1 scope; `README.md:25` declares the TypeScript modular monolith; `README.md:27`-`README.md:31` name Next.js, domain packages, Supabase, PostgreSQL controls, and Compose; `README.md:48`-`README.md:81` provide setup and gate commands. `npm run docs:check` passed 37 documented commands. | PASS |
| Previously verified feature goals reflect completion without rewriting historical validation | Goal markers for the verified features are checked and prior validation evidence is byte-identical. | `.specs/features/003-university-verification/spec.md:13`, `.specs/features/007-favorites/spec.md:11`, `.specs/features/008-purchase-intent-offers-reservations/spec.md:11`, `.specs/features/009-messaging/spec.md:11`, and `.specs/features/010-pickup-completion/spec.md:11` contain completed goals. `git diff bf71b3d..0857fd7 -- '**/validation.md'` returned no files, and Feature 003 validation hashed identically at `bf71b3d` and HEAD (`674689745d43801296177298335907af4260f24f`). | PASS |
| STATE records the remaining pre-beta hardening | The release boundary names authentication/RPC, offer authorization/concurrency, and recovery proof as blockers. | `.specs/STATE.md:170` lists all three blocker classes; `.specs/STATE.md:167` records Feature 014 implementation complete pending independent validation. | PASS |

### RECON-02: Configurable Public Deployment Identity

| Criterion | Spec-defined outcome | `file:line` + assertion/evidence | Result |
| --- | --- | --- | --- |
| Production rejects missing or invalid contact values | Both contact keys produce key-specific missing and invalid errors. | `scripts/config/validate-env.test.ts:160`-`scripts/config/validate-env.test.ts:186` assert `Missing required variable: ${variable}`; `scripts/config/validate-env.test.ts:220`-`scripts/config/validate-env.test.ts:232` assert `Invalid production email variable: ${variable}` for both keys. | PASS |
| Legal pages use configured visible addresses and `mailto:` targets without the legacy hostname | Server configuration feeds both rendered address text and link targets. | `apps/web/src/app/impressum/page.test.tsx:40` asserts `mailto:kontakt@campusmarkt.inovv.co`; `apps/web/src/app/datenschutz/page.tsx:74` and `apps/web/src/app/datenschutz/page.tsx:77` use the same `privacyEmail` value for `href` and visible text. A repository search over active app/docs/config returned zero `campusmarkt.tu-braunschweig.de` matches. | PASS |
| Production example uses an editable provisional hostname | All public URL/contact examples are environment assignments using `campusmarkt.inovv.co`. | `infra/compose/production.env.example:11`-`infra/compose/production.env.example:19` assign editable URL, hostname, admin, contact, and privacy values; `tests/integration/compose/identity-compose.test.ts:160`-`tests/integration/compose/identity-compose.test.ts:164` assert the web service receives the two configured contacts. | PASS |
| Missing local contact variables use safe `.local` fallbacks | Both legal pages render role addresses under `campusmarkt.local`. | `apps/web/src/modules/config/server/public-contact.test.ts:16`-`apps/web/src/modules/config/server/public-contact.test.ts:19` assert both fallback values; `apps/web/src/app/impressum/page.test.tsx:63`-`apps/web/src/app/impressum/page.test.tsx:64` assert both rendered pages. | PASS |

### RECON-03: Twelve-Month University Verification

| Criterion | Spec-defined outcome | `file:line` + assertion/evidence | Result |
| --- | --- | --- | --- |
| Confirmation expires exactly twelve calendar months later in domain and database behavior | The domain result and persisted RPC result equal confirmation plus `interval '12 months'`. | `packages/domain/src/identity/university.test.ts:59`-`packages/domain/src/identity/university.test.ts:62` assert `2026-09-21` becomes `2027-09-21`; `supabase/tests/identity-university-persistence.test.ts:515`-`supabase/tests/identity-university-persistence.test.ts:524` assert `expires_at = verified_at + interval '12 months'`. | PASS |
| Variable month lengths and leap day use calendar arithmetic | A leap-day confirmation clamps to February 28 with time and milliseconds preserved. | `packages/domain/src/identity/university.test.ts:65`-`packages/domain/src/identity/university.test.ts:68` assert `2024-02-29T23:15:30.123Z -> 2025-02-28T23:15:30.123Z`; `supabase/tests/identity-university-persistence.test.ts:455`-`supabase/tests/identity-university-persistence.test.ts:463` assert the same PostgreSQL result. | PASS |
| Additive migration recalculates existing rows from original `verified_at` | A seeded 180-day row becomes the exact twelve-month anniversary. | `supabase/tests/identity-university-persistence.test.ts:466`-`supabase/tests/identity-university-persistence.test.ts:490` reapply the additive migration and assert `t|2027-01-31 10:00:00+00`. | PASS |
| Current UI and documentation state twelve months without an active old-policy claim | User-facing German/English wording and the operations guide state the annual period. | `apps/web/src/app/impressum/page.test.tsx:74` asserts `zwölf Kalendermonate`; `tests/integration/operations/identity-operations.test.ts:273`-`tests/integration/operations/identity-operations.test.ts:277` assert `12 calendar months`; the only remaining 180-day claims are explicitly historical migration/validation/amendment records. | PASS |
| Badge remains visible before expiry and disappears at/after expiry | Active verification is true strictly before expiry and false at the boundary; the live public projection becomes null after expiry. | `packages/domain/src/identity/university.test.ts:84`-`packages/domain/src/identity/university.test.ts:96` assert active-before-expiry; `packages/domain/src/identity/university.test.ts:120`-`packages/domain/src/identity/university.test.ts:132` assert false at/after expiry; `tests/integration/stack/identity/university-stack.test.ts:415`-`tests/integration/stack/identity/university-stack.test.ts:429` assert null badge and expired account status live. | PASS |

### RECON-04: Evidence Preservation and Traceability

| Criterion | Spec-defined outcome | `file:line` + assertion/evidence | Result |
| --- | --- | --- | --- |
| Feature 014 maps requirements to tasks and validation evidence | Every RECON requirement appears in the task matrix and all 24 acceptance criteria appear in this report with file-and-line evidence. | `.specs/features/014-prelaunch-reconciliation/tasks.md:5`-`.specs/features/014-prelaunch-reconciliation/tasks.md:11` map RECON-01 through RECON-06; this report's Spec-Anchored Acceptance Criteria section supplies the independent evidence map. Structural validators returned 0 errors. | PASS |
| Feature 003 history remains intact and points to Feature 014 | The historical validation file is unchanged and the active spec/design/tasks carry an amendment. | `.specs/features/003-university-verification/spec.md:5`, `.specs/features/003-university-verification/design.md:6`, and `.specs/features/003-university-verification/tasks.md:3` point to Feature 014/AD-019. The historical validation hash matched `674689745d43801296177298335907af4260f24f` before and after the feature. | PASS |
| AD-008 is superseded and AD-019 records the active annual policy | STATE keeps the old decision as history and activates the calendar-month decision. | `.specs/STATE.md:67` states `superseded by AD-019`; `.specs/STATE.md:141`-`.specs/STATE.md:147` record the twelve-calendar-month decision as active. | PASS |

### RECON-05: Clean Database Migration Chain

| Criterion | Spec-defined outcome | `file:line` + assertion/evidence | Result |
| --- | --- | --- | --- |
| Moderation migration extends the text-backed status constraint and does not alter a nonexistent enum | The migration contains the five text statuses including `removed` and no `alter type marketplace.listing_status`. | `supabase/tests/marketplace-moderation-persistence.test.ts:34`-`supabase/tests/marketplace-moderation-persistence.test.ts:39` assert both the correct constraint and absence of the enum alteration. | PASS |
| A fresh isolated PostgreSQL project applies every migration through Feature 014 | Database setup starts isolated services, executes the migration service, and fails setup on any migration error. | `supabase/tests/identity-university-persistence.test.ts:165`-`supabase/tests/identity-university-persistence.test.ts:180` execute and assert the fresh migration path; the final `npm run test:db` passed 133 structural, 190 identity, and 26 university tests. | PASS |
| Database test containers and volumes are removed | Suite teardown runs Compose down with volumes and orphan removal; no feature test containers remain. | `supabase/tests/identity-university-persistence.test.ts:183`-`supabase/tests/identity-university-persistence.test.ts:185` execute `down --volumes --remove-orphans`; a post-gate `docker ps` query returned zero matching containers. | PASS |

### RECON-06: Private Identity API Boundaries

| Criterion | Spec-defined outcome | `file:line` + assertion/evidence | Result |
| --- | --- | --- | --- |
| Live authenticated owner read derives identity from JWT/session and returns an allowlisted projection | The owner RPC accepts no caller-selected identity, resolves the live caller, and the repository rejects extra private fields. | `supabase/tests/identity-persistence.test.ts:2590`-`supabase/tests/identity-persistence.test.ts:2601` assert the caller's owner projection; `tests/integration/identity/identity-repository.test.ts:98`-`tests/integration/identity/identity-repository.test.ts:111` assert the argument-free user-client call and allowlisted DTO; `tests/integration/identity/identity-repository.test.ts:138` verifies a private-field projection is rejected. | PASS |
| Valid display-name update uses the user JWT and returns the refreshed owner projection | The mutation is sent only through the user client and the live HTTP response contains the changed name. | `tests/integration/identity/identity-repository.test.ts:322`-`tests/integration/identity/identity-repository.test.ts:337` assert `update_display_name` is called through `user` and never `service`; `tests/integration/stack/identity/university-stack.test.ts:251`-`tests/integration/stack/identity/university-stack.test.ts:262` assert HTTP 200 and `Gauss Student Updated`. | PASS |
| Missing or revoked session is rejected at the database boundary | The RPC is unavailable to unauthenticated roles and a deleted live session causes a database error. | `supabase/tests/identity-persistence.test.ts:2603`-`supabase/tests/identity-persistence.test.ts:2610` delete the session and assert nonzero status; `supabase/tests/identity-persistence.test.ts:2702`-`supabase/tests/identity-persistence.test.ts:2710` assert privileges `f|f|t|f`. | PASS |
| University status uses a service-only bounded RPC without email or token hashes | The repository calls one service RPC; its fixed return signature exposes only status, university ID, expiration, and token expiration. | `tests/integration/identity/university-repository.test.ts:249`-`tests/integration/identity/university-repository.test.ts:276` assert the exact service call/result; `supabase/tests/identity-persistence.test.ts:2613`-`supabase/tests/identity-persistence.test.ts:2631` assert the live bounded projection; `supabase/migrations/20260926070300_identity_owner_profile_boundary.sql:73`-`supabase/migrations/20260926070300_identity_owner_profile_boundary.sql:78` define the four-field return contract. | PASS |
| Avatar resolution is service-only, active-account-scoped, and exact-version-scoped | The repository sends public ID/version through the service client, and live SQL returns the key only for the current version. | `tests/integration/identity/identity-repository.test.ts:114`-`tests/integration/identity/identity-repository.test.ts:135` assert the service call and no user call; `supabase/tests/identity-persistence.test.ts:2634`-`supabase/tests/identity-persistence.test.ts:2650` assert version 3 resolves and version 2 returns zero rows; `supabase/migrations/20260926070300_identity_owner_profile_boundary.sql:116`-`supabase/migrations/20260926070300_identity_owner_profile_boundary.sql:119` require the public ID, active-confirmed state, exact version, and non-null key. | PASS |
| Privileges, SECURITY DEFINER, pinned search path, and private-schema isolation hold | Owner profile is authenticated-only; bounded university/avatar lookups are service-only; all composition RPCs are definer functions with empty search path; browser roles have no private schema/table privileges. | `supabase/tests/identity-persistence.test.ts:2674`-`supabase/tests/identity-persistence.test.ts:2688` assert service-only signatures; `supabase/tests/identity-persistence.test.ts:2702`-`supabase/tests/identity-persistence.test.ts:2710` assert owner privileges; `supabase/tests/identity-persistence.test.ts:2713`-`supabase/tests/identity-persistence.test.ts:2739` assert `prosecdef` and pinned search path; `supabase/tests/identity-persistence.test.ts:331`-`supabase/tests/identity-persistence.test.ts:341` assert no `identity` schema/base-table access for anon/authenticated. | PASS |

**Spec-anchored status**: 24/24 acceptance criteria match precise spec outcomes; 0 uncovered criteria; 0 spec-precision gaps.

---

## Edge Cases

- [x] Missing contact variables fail production preflight but use `.local` only in local/test rendering.
- [x] Invalid contact-email syntax produces key-specific production errors.
- [x] Leap-day and month-end anniversaries use calendar arithmetic.
- [x] Existing 180-day rows are deterministically recalculated from original verification time.
- [x] Badge visibility changes exactly at the expiration boundary.
- [x] Fresh migration order reaches Feature 014 without the removed-status enum mismatch.
- [x] Revoked identity sessions cannot reuse the owner projection.
- [x] Caller-selected owner IDs are impossible because `get_owner_profile()` accepts no arguments.
- [x] Wrong avatar versions and non-active accounts do not resolve private storage keys.
- [x] Browser roles cannot access the private identity schema or service-only bounded RPCs.

---

## Gate Check

| Gate | Fresh result |
| --- | --- |
| Spec validator | PASS - 0 errors, 0 warnings |
| Tasks validator | PASS - 0 errors, 1 non-blocking T1 granularity warning |
| Quick (`npm run check`) | PASS - 1,280 unit + 153 architecture tests; typecheck, lint, format, secret scan, and 37 documentation commands passed |
| Production build (`npm run build`) | PASS - Next.js 16.3.5 compiled, typechecked, and generated 61 static pages |
| Integration (`npm run test:integration`) | PASS - 521 tests |
| Database (`npm run test:db`) | PASS - 133 structural + 190 identity + 26 university tests = 349 |
| Focused live stack | PASS - 7 end-to-end identity/university journeys |

- **Comparable test count before feature**: 1,944 (`Feature 013`: 1,273 unit + 153 architecture + 518 integration)
- **Comparable test count after feature**: 1,954 (1,280 unit + 153 architecture + 521 integration)
- **Delta**: +10 tests, with an additional 349 database checks and 7 focused live-stack journeys run for this feature.
- **Skipped tests**: 0 in the complete gates.
- **Failures**: 0 in the final required gates. An earlier pre-final database run observed one nondeterministic legacy deletion-worker concurrency failure; the final full database command passed all 349 tests without changes to that test.
- **Runtime note**: dependency installation warned that the host runs Node 22.12 while the repository declares Node 24; all mandated gates passed, but operators must use the documented Node 24 runtime.

---

## Discrimination Sensor

The valid sensor ran in a detached temporary worktree with no shared junctions. The real-tree porcelain was empty before and after the run. The scratch was removed, the real dependency graph remained present, and no test containers remained active.

| Mutation | File:line | Fault | Killing assertion | Result |
| --- | --- | --- | --- | --- |
| M1 | `packages/domain/src/identity/university.ts:7` | Changed annual validity from 12 to 11 months. | `packages/domain/src/identity/university.test.ts:50`, `:62`, `:68` failed on constant, anniversary, and leap-day outputs. | KILLED |
| M2 | `scripts/config/validate-env.ts:93` | Made all public contact strings pass email validation. | `scripts/config/validate-env.test.ts:232` failed for both contact keys. | KILLED |
| M3 | `apps/web/src/modules/identity/infrastructure/supabase/repository/index.ts:273` | Routed owner projection through the service client instead of the user JWT client. | `tests/integration/identity/identity-repository.test.ts:108` failed because the user call was absent. | KILLED |
| M4 | `supabase/migrations/20260926070300_identity_owner_profile_boundary.sql:68` | Granted owner projection to `anon` instead of `authenticated`. | `supabase/tests/identity-persistence.test.ts:2710` received `f|t|f|f` instead of `f|f|t|f`. | KILLED |
| M5 | `supabase/migrations/20260926070300_identity_owner_profile_boundary.sql:27` | Disabled the live-session check. | `supabase/tests/identity-persistence.test.ts:2610` observed success after session deletion instead of rejection. | KILLED |
| M6 | `supabase/migrations/20260926070240_annual_university_verification.sql:6` | Changed existing-row and new-confirmation SQL from 12 to 11 months. | `supabase/tests/identity-university-persistence.test.ts:490` and `:524` failed exact expiration assertions. | KILLED |

**Sensor depth**: P0 manual full-depth, 6 behavior-level mutations across domain, configuration, application composition, database authorization, session revocation, and persisted calendar behavior.

**Result**: 6/6 killed; 0 survived - PASS.

An earlier scratch attempt was explicitly invalidated after its Windows junction teardown temporarily changed the real-tree baseline. The tracked tree was restored byte-for-byte from HEAD, dependencies were restored with `npm ci`, and the Quick gate passed again before this second, valid no-junction sensor run. No evidence from the invalidated run is counted above.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code and no broad rewrite | PASS - changes are limited to reconciliation, one migration-chain repair, and bounded identity RPC repair exposed by the required live test. |
| Surgical changes and no unrelated feature scope | PASS - known marketplace and recovery-hardening blockers remain explicitly out of scope in STATE. |
| Business/security rules outside UI | PASS - calendar logic is in the domain package and authorization is enforced in PostgreSQL RPCs. |
| Supabase security baseline | PASS - private schema isolation, explicit grants, live-session checks, service-only functions, SECURITY DEFINER justification, and pinned search paths are tested. |
| Spec-anchored outcome assertions | PASS - exact emails, dates, intervals, roles, RPC clients, status fields, and badge transitions are asserted. |
| Per-layer coverage | PASS - domain, repository, environment, database, Compose, rendered-page, build, and live-stack layers are covered proportionally. |
| No unclaimed tests in feature scope | PASS - added tests map to RECON-02, RECON-03, RECON-05, or RECON-06 and task done-when criteria. |
| Documented guidelines | PASS - `AGENTS.md`, `apps/web/AGENTS.md`, TLC validation rules, and Supabase security constraints were followed. |

No `SPEC_DEVIATION`, surviving mutant, uncovered acceptance criterion, or spec-precision gap was found. A clean PASS produces no lessons entry.

---

## Interactive UAT

Not required. The user-visible changes are deterministic legal/configuration text and verification duration; server-rendered tests and the live-stack identity journey cover the observable outcomes. No subjective visual interaction was introduced.

---

## Requirement Traceability Update

| Requirement | Previous status | Verified status |
| --- | --- | --- |
| RECON-01 | implemented | Verified |
| RECON-02 | implemented | Verified |
| RECON-03 | implemented | Verified |
| RECON-04 | implemented | Verified |
| RECON-05 | implemented | Verified |
| RECON-06 | implemented | Verified |

---

## Summary

**Overall**: PASS - Feature 014 is ready.

- **Spec-anchored check**: 24/24 acceptance criteria matched; 0 gaps.
- **Gate**: 2,310 non-overlapping checks across Quick, integration, database, and focused live stack; build and structural validators also passed.
- **Sensor**: 6/6 valid P0 mutations killed.
- **What works**: repository truth, configurable public identity, annual calendar verification, clean migrations, JWT-derived owner operations, bounded private-state RPCs, and immutable avatar resolution.
- **Remaining project blockers**: authenticated marketplace RPC composition, offer authorization/concurrency, and true ephemeral restore proof remain separate pre-beta work recorded in STATE; they are outside Feature 014 and do not alter this verdict.
