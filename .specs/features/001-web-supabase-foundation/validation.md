# Validation: Web and Supabase Foundation - FAIL ❌

**Date**: 2026-09-15
**Spec**: `.specs/features/001-web-supabase-foundation/spec.md`
**Full diff range**: `11a9bb8..58d8a54`
**Latest repair diff range**: `16de636..58d8a54`
**Verifier**: fresh independent final verifier (author ≠ prior verifiers)

---

## Verdict

The implementation satisfies all 22 specification acceptance criteria and all 5 listed edge cases, and the only clean/cold `npm run verify` invocation passed all 127 tests with no skips. The feature is still not ready because the expanded discrimination sensor found three uncovered production-readiness branches. Tests allow the real CLI to exit zero specifically for a TLS timeout or unreachable SMTP, and they allow an unreachable S3 dependency to be classified as ready. These surviving mutants contradict the approved T18/T23 completion claims.

**Spec-anchored result**: 22/22 acceptance criteria match exact specified outcomes; 0 spec-precision gaps.
**Edge cases**: 5/5 have exact outcome evidence.
**Gate**: PASS, 127/127 tests, 0 failed, 0 skipped.
**Sensor**: FAIL, 13/16 behavior mutations killed, 3 survived.

---

## Task Completion

| Tasks | Evidence status | Notes |
| --- | --- | --- |
| T1-T17, T19-T22, T24 | ✅ Done | Implementation, exact assertions, green build/final gate, and killed mutants support the checked completion claims. |
| T18 | ❌ Partial | `tasks.md:506-508` requires successful S3 connectivity plus exact timeout/certificate/authentication/reachability assertions. M16 accepted unreachable S3 and all 6 production-probe tests still passed. |
| T23 | ❌ Partial | `tasks.md:613-627` requires non-zero CLI exits for every TLS/SMTP/S3 failure, including SMTP reachability. M14 and M15 preserved exit zero for SMTP unreachable and TLS timeout; all 6 production-probe tests still passed. |

`tasks.md` contains 24 task headings, 108 checked items, and 0 open items. The checked metadata for T18/T23 is contradicted by the surviving mutants and therefore does not establish completion.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + exact assertion evidence | Result |
| --- | --- | --- | --- |
| FOUND-01 AC1: root Compose startup | A clean documented start makes web, proxy, PostgreSQL, Auth, REST, Realtime, Storage, and gateway services healthy. | `tests/integration/compose/topology.test.ts:76-95` asserts the required service inventory; `tests/integration/stack/foundation-stack.test.ts:144-163` requires `compose up --detach --wait --build` to exit zero; the cold final gate reached and passed all 9 stack tests. | ✅ PASS |
| FOUND-01 AC2: healthy public surface | Healthy services expose the web shell and documented Supabase APIs through ingress. | `tests/integration/stack/foundation-stack.test.ts:215-238` asserts shell `200` + `CampusMarkt`, ready `200` + exact payload, Auth/REST/Storage `[200,200,200]`, and REST `[]`. | ✅ PASS |
| FOUND-01 AC3: missing required value | Startup validation fails before health and names the missing variable. | `tests/integration/compose/topology.test.ts:180-187` asserts non-zero Compose validation and `POSTGRES_PASSWORD`; `scripts/config/validate-env.test.ts:75-94` asserts every required local variable name. | ✅ PASS |
| FOUND-01 AC4: restart persistence | Stop/start without deleting volumes retains PostgreSQL and local Storage data. | `tests/integration/stack/foundation-stack.test.ts:241-278` inserts exact database/Storage markers, stops and starts without deleting volumes, then asserts both exact marker values. | ✅ PASS |
| FOUND-01 AC5: private internal ports | PostgreSQL and internal Supabase ports are not publicly bound. | `tests/integration/compose/topology.test.ts:98-115` asserts no published ports for eight internal services; `tests/integration/compose/ingress.test.ts:100-105` asserts Caddy is the only published service. | ✅ PASS |
| FOUND-02 AC1: repeatable quality commands | Lockfile installation provides typecheck, lint, unit, integration, build, and format commands. | `tests/unit/workspace-contract.test.ts:22-41` asserts the command inventory; `tests/unit/workspace-contract.test.ts:44-55` asserts exact tool versions and lockfile v3. | ✅ PASS |
| FOUND-02 AC2: full quality gate | The full foundation gate has zero type, lint, test, build, or format errors. | The single cold `npm run verify` exited zero after check, build, 73 unit, 4 architecture, 25 Compose/config, 7 database, 9 stack, 7 operations, and 2 browser tests; 0 skips. | ✅ PASS |
| FOUND-02 AC3: explicit boundaries | Presentation, application, domain, validation, and transport code have explicit import boundaries. | `tests/architecture/import-boundaries.test.ts:20-76` asserts allowed public entry points and three prohibited directions; all 4 architecture tests passed. | ✅ PASS |
| FOUND-02 AC4: forbidden import rejection | A prohibited presentation import fails with an identifying diagnostic. | `tests/architecture/import-boundaries.test.ts:51-62` asserts `no-restricted-imports` and `ARCH_PRESENTATION_INFRASTRUCTURE`; M1 removed the rule and this exact assertion failed. | ✅ PASS |
| FOUND-02 AC5: responsive shell | 360px and 1280px render without horizontal page overflow. | `apps/web/tests/shell.spec.ts:3-22` runs both widths and asserts `scrollWidth === clientWidth`; both Playwright cases passed. | ✅ PASS |
| FOUND-03 AC1: migration history | A clean migration applies once and is recorded once. | `supabase/tests/foundation-baseline.test.ts:115-132` asserts successful apply, exact table name, history count `1`, and idempotent history count `1`. | ✅ PASS |
| FOUND-03 AC2: RLS enabled | Every application table in the exposed schema has RLS enabled. | `supabase/tests/foundation-baseline.test.ts:135-150` asserts `relrowsecurity = t` and zero unintended policies; M10 disabled RLS and the test failed at line 143. | ✅ PASS |
| FOUND-03 AC3: deny without policy | `anon` and `authenticated` receive zero rows without an approved policy. | `supabase/tests/foundation-baseline.test.ts:153-170` asserts Data API grants `t|t` and exact row counts `0` for both roles; M10 exposed the row and failed at line 165. | ✅ PASS |
| FOUND-03 AC4: credential separation | Browser code receives publishable credentials only; server/database/SMTP/S3 secrets remain out of browser variables and tracked files. | `scripts/config/validate-env.test.ts:96-139` rejects named and value-equal browser secrets; `scripts/security/scan-secrets.test.ts:182-183` asserts the tracked repository is clean. | ✅ PASS |
| FOUND-03 AC5: tracked secret gate | A configured credential in a tracked file makes the scanner CLI fail with a redacted finding. | `scripts/security/scan-secrets.test.ts:131-179` creates an isolated Git repository, tracks `.env.production`, runs the real CLI, and asserts non-zero, file/rule, redaction, cleanup, and unchanged real porcelain; M12 inverted the CLI condition and failed at line 165. | ✅ PASS |
| FOUND-03 AC6: database findings block the gate | A migration/policy finding makes the configured database gate fail and reports the finding. | `supabase/tests/foundation-baseline.test.ts:203-220` asserts non-zero plus `rls_disabled_in_public`, table identity, redaction, and cleanup; lines `223-228` assert clean lint/advisors; M11 removed `--fail-on` and failed at line 213. | ✅ PASS |
| FOUND-04 AC1: HTTPS proxy topology | Production Caddy terminates public 80/443 and forwards only web/documented API paths. | `tests/integration/compose/ingress.test.ts:119-132` asserts hostname and 80/443; lines `144-176` assert exact API prefixes, web fallback, and no Studio/PostgreSQL exposure. | ✅ PASS |
| FOUND-04 AC2: safe production example | The example contains variable names and inert placeholders, never operational credentials. | `infra/compose/production.env.example:1-34` contains empty/inert values; `scripts/security/scan-secrets.test.ts:182-183` asserts no tracked credential finding. | ✅ PASS |
| FOUND-04 AC3: pinned upgrades | Documentation requires changelog review, backup, update, health/smoke checks, and restore readiness. | `docs/operations/upgrades.md:5-51` defines the ordered contract; `scripts/operations/verify-doc-commands.ts:138-155` asserts required update/changelog/backup/restore commands. | ✅ PASS |
| FOUND-04 AC4: external backup artifacts | Backup writes database and Storage artifacts outside primary volumes with verified hashes. | `tests/integration/operations/backup-restore.test.ts:191-216` asserts success, manifest format/release, exact SHA-256 values, and destination containment. | ✅ PASS |
| FOUND-04 AC5: isolated restore | Restore reproduces the exact database fixture and referenced Storage object in an isolated target. | `tests/integration/operations/backup-restore.test.ts:330-367` asserts isolated restore status, exact database marker, and exact Storage contents; M13 inverted the isolation guard and failed at line 291. | ✅ PASS |
| FOUND-04 AC6: configured production dependencies | Missing TLS/SMTP/S3 configuration yields not-ready while local development remains allowed. | `scripts/config/validate-env.test.ts:45-62` asserts local offline success and complete production success; lines `141-222` assert missing production variables, HTTPS, S3 backend, and SMTP TLS failures; `tests/integration/config/production-probes.test.ts:264-363` asserts live success plus TLS/SMTP/S3 failure classifications. | ✅ PASS |

**Status**: ✅ 22/22 acceptance criteria match exact spec outcomes; 0 spec-precision gaps. The overall feature verdict remains FAIL because approved T18/T23 outcome coverage is incomplete.

---

## Edge Cases

| Edge case | Exact evidence | Result |
| --- | --- | --- |
| Required service unhealthy keeps readiness failing and names the service. | `tests/integration/stack/foundation-stack.test.ts:178-213` asserts exact `503` payloads naming `auth` and `storage`, then `200` after recovery; lines `281-310` assert bounded Storage-unhealthy diagnostics. | ✅ PASS |
| Migration failure exits non-zero and does not report ready. | `tests/integration/stack/foundation-stack.test.ts:314-352` injects invalid SQL and asserts non-zero, `migration`, bounded diagnostics, and readiness not `200`. | ✅ PASS |
| Host below minimum reports CPU, memory, or disk before production startup. | `scripts/config/validate-env.test.ts:225-240` asserts exact `CPU_CORES`, `MEMORY_GB`, and `DISK_GB` diagnostics. | ✅ PASS |
| Unreachable backup storage exits non-zero without success. | `tests/integration/operations/backup-restore.test.ts:219-233` asserts non-zero and empty success output for an unreachable destination. | ✅ PASS |
| Secret in a tracked environment file exits non-zero. | `scripts/security/scan-secrets.test.ts:131-179` asserts tracked `.env.production`, non-zero CLI, redacted rule diagnostic, scratch removal, and unchanged real tree. | ✅ PASS |

---

## Mandatory Gates

### Build

- **Command**: `npm run check && npm run build`
- **Invocations**: 1
- **Outcome**: ✅ PASS
- **Evidence**: 73 unit tests, 4 architecture tests, typecheck, lint, format, tracked-secret scan, documentation check, and Next.js production build all passed.
- **Failed/skipped**: 0/0.

### Final verify

- **Cold-state proof**: before invocation, 0 CampusMarkt test containers, volumes, networks, or processes; empty real-tree porcelain.
- **Command**: `npm run verify`
- **Invocations**: exactly 1; no retry or focused rerun followed it.
- **Outcome**: ✅ PASS.
- **Tests**: 127 passed: 73 unit + 4 architecture + 25 Compose/config + 7 database + 9 stack + 7 operations + 2 Playwright.
- **Failed/skipped**: 0/0.
- **Pre-feature test count**: 0 at `11a9bb8`.
- **Delta**: +127 executable tests.

---

## Discrimination Sensor

Every mutation ran only in detached temporary worktrees at `58d8a54`. Each mutation was restored before the next. Both worktrees, their `node_modules`, and every test container/network/volume were removed. Real-tree porcelain stayed equal to the empty baseline. Docker Desktop remained active.

| ID | Protected behavior / mutation | Target result | Outcome |
| --- | --- | --- | --- |
| M1 | Architecture: removed presentation→infrastructure restriction in `eslint.config.mjs:71-79`. | `import-boundaries.test.ts:57` failed because the named diagnostic disappeared. | ✅ Killed |
| M2 | Docker port allocation: replaced `CADDY_HTTP_PORT=0` with fixed `43123` at `foundation-stack.test.ts:147`. | Exact Docker-assigned contract failed at `foundation-stack.test.ts:171`. | ✅ Killed |
| M3 | Docker health: changed Storage `start_period` from `45s` to `0s` at `infra/compose/supabase.override.yaml:20`. | Exact topology assertion failed at `topology.test.ts:150-158`. | ✅ Killed |
| M4 | Storage readiness: redirected the Storage dependency probe to Auth at `readiness.ts:6`. | Live Storage-stop test timed out expecting `503` but received `200` at `foundation-stack.test.ts:203`. | ✅ Killed |
| M5 | Aggregate readiness: forced `ok: true` despite collected errors at `probe-production.ts:275`. | Five negative probe assertions failed at `production-probes.test.ts:294,309,323,340,357`. | ✅ Killed |
| M6 | Generic CLI exit: changed failure exit code from `1` to `0` at `probe-production.ts:282`. | TLS/SMTP-auth/S3-auth CLI assertions failed at `production-probes.test.ts:297,327,361`. | ✅ Killed |
| M7 | TLS: disabled HTTPS certificate verification at `probe-production.ts:74`. | Hostname-invalid TLS was accepted; assertion failed at `production-probes.test.ts:294`. | ✅ Killed |
| M8 | S3 wrong-secret use: ignored `AWS_SECRET_ACCESS_KEY` and signed with the fixture secret in `probe-production.ts`. | Wrong-secret aggregate assertion failed at `production-probes.test.ts:357`. | ✅ Killed |
| M9 | Full SigV4 fixture: regressed verification to access-key substring acceptance in `production-probes.test.ts:142`. | Wrong-secret aggregate assertion failed at `production-probes.test.ts:357`. | ✅ Killed |
| M10 | RLS: disabled RLS in `20260914221752_foundation_canary.sql:9`. | RLS, anonymous denial, and clean advisor assertions failed at `foundation-baseline.test.ts:143,165,228`. | ✅ Killed |
| M11 | Advisor: removed `--fail-on error` from the project CLI helper at `foundation-baseline.test.ts:94-99`. | Isolated advisor negative-path assertion failed at line 213. | ✅ Killed |
| M12 | Tracked secret: suppressed scanner CLI failure at `scan-secrets.ts:138`. | Isolated tracked-secret CLI assertion failed at `scan-secrets.test.ts:165`. | ✅ Killed |
| M13 | Backup guard: inverted the `isolated` restore guard at `backup-restore.ts:218`. | Active-target diagnostic assertion failed at `backup-restore.test.ts:291`. | ✅ Killed |
| M14 | SMTP reachability CLI: preserved exit zero only for `SMTP dependency is unreachable.` at `probe-production.ts:280-283`. | All 6 production-probe tests passed because the SMTP-reachability case at lines `335-348` never runs the CLI. | ❌ Survived |
| M15 | TLS-timeout CLI: preserved exit zero only for `TLS dependency timed out.` at `probe-production.ts:280-283`. | All 6 production-probe tests passed because the timeout case at lines `305-315` never runs the CLI. | ❌ Survived |
| M16 | S3 connectivity: returned success for an unreachable S3 socket at `probe-production.ts:256-259`. | All 6 production-probe tests passed because no S3 reachability/timeout fixture exists. | ❌ Survived |

**Sensor depth**: expanded manual P0-style sensor across architecture, Docker port allocation and health, Storage readiness, aggregate result and CLI exits, TLS, complete SigV4/wrong secret, RLS/advisor, tracked secrets, and backup guard.
**Sensor outcome**: ❌ 13/16 killed, 3 survived.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / no deferred product scope | ✅ The full diff adds only the approved foundation and one non-product canary. |
| Surgical repair diff | ✅ `16de636..58d8a54` is limited to SDD metadata, readiness, and the two relevant integration suites. |
| Vendored Supabase boundary | ✅ CampusMarkt changes remain in owned overrides; the pinned upstream snapshot stays isolated under `infra/supabase/`. |
| Supabase RLS/grants | ✅ Explicit grants are paired with forced RLS and zero policies; live role tests assert zero rows. |
| Spec-anchored outcomes | ✅ 22/22 exact spec outcomes; no precision gaps. |
| Task-derived production probe coverage | ❌ Three failure-specific mutants survived, contradicting T18/T23. |
| Test ownership | ✅ Every in-scope test maps to an AC, edge case, or approved done-when criterion. |
| Project instructions | ✅ Reviewed root/app `AGENTS.md`, TLC validate/coding-principles/lessons, Supabase, and Supabase Postgres security/RLS guidance. |

The full diff's only `git diff --check` findings are four whitespace artifacts inside the pinned vendored Supabase function snapshot; the latest repair diff is clean and the repository formatter intentionally excludes `infra/supabase/`.

---

## Ranked Gaps and Fix Plan

### 1. Exercise the real CLI for every negative production dependency class

- **Requirement**: T23 `tasks.md:613-627`.
- **Evidence**: `production-probes.test.ts:285-303`, `317-333`, and `351-367` execute the CLI for hostname-invalid TLS, SMTP authentication, and S3 authentication. The TLS-timeout test at lines `305-315` and SMTP-unreachable test at lines `335-348` assert only the returned object. M14 and M15 survived.
- **Fix**: invoke `runProbeCli()` in the timeout and reachability fixtures; assert non-zero, exact bounded/redacted diagnostic, and no success output.
- **Priority**: Major.

### 2. Add a real unreachable/timeout S3 negative fixture

- **Requirement**: T18 `tasks.md:491-508`.
- **Evidence**: `probe-production.ts:256-259` classifies S3 timeout/certificate/reachability failures, but `production-probes.test.ts:351-367` covers only wrong-secret `403`. M16 changed an unreachable S3 socket to success and the full production-probe suite passed.
- **Fix**: point the S3 endpoint at an unreachable local port or bounded hanging TLS fixture, then assert `ok: false`, exact S3 reachability/timeout diagnostic, real CLI non-zero, and redaction.
- **Priority**: Major.

---

## Requirement Traceability

The verifier changed only this report. `spec.md`, `tasks.md`, and `STATE.md` remain untouched.

| Requirement | Recorded status | Final verifier outcome |
| --- | --- | --- |
| FOUND-01 | Repaired; verification pending | ✅ Verified: Docker-assigned ports, full cold stack, and Auth/Storage readiness all passed and discriminated. |
| FOUND-02 | Repaired; verification pending | ✅ Verified: full gate/build/boundaries/responsive shell passed. |
| FOUND-03 | Repaired; verification pending | ✅ Verified: migration history, RLS/denial, advisor, and tracked-secret gates passed and discriminated. |
| FOUND-04 | Repaired; verification pending | ❌ Needs test repair: spec ACs pass, but T18/T23 connectivity/CLI completion claims are not discriminating. |

---

## Grounded Lessons

New validation signal exists:

- `surviving_mutant`, grounded in M14/M15 at `scripts/config/probe-production.ts:280-283`: Execute the real readiness CLI for every negative dependency class; testing the returned object does not prove the process exit contract.
- `surviving_mutant`, grounded in M16 at `scripts/config/probe-production.ts:256-259`: Every external dependency probe needs an unreachable or timeout fixture in addition to an authentication failure fixture.

The explicit “replace only `validation.md`” restriction prevents updating machine-owned `.specs/lessons.json` and `.specs/LESSONS.md`; the new lessons are distilled here without changing any second file.

---

## Hygiene

- Exactly one clean/cold `npm run verify` invocation; no retry masking.
- Both scratch worktrees removed; only the main worktree remains.
- No CampusMarkt test container, network, volume, temporary process, or scratch directory remains.
- Docker Desktop remains active (`29.4.1`).
- Real-tree porcelain matched the empty baseline before this report was written.
- `validate_state.py` ran under Python 3.11.9 and exited `1` with the expected FAIL-verdict completion block.

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 22/22 ACs matched; 0 spec-precision gaps.
**Edge cases**: 5/5 matched.
**Build**: PASS.
**Final cold verify**: PASS, 127/127, 0 skipped.
**Sensor**: FAIL, 13/16 killed, 3 survived.

Add the missing real-CLI timeout/reachability assertions and an unreachable S3 fixture, then run a fresh independent verification.
