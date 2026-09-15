# Validation: Web and Supabase Foundation - FAIL ❌

**Date**: 2026-09-15
**Spec**: `.specs/features/001-web-supabase-foundation/spec.md`
**Full diff range**: `11a9bb8..9256923`
**Repair diff range**: `e04edc1..9256923`
**Verifier**: fresh independent re-verifier (author ≠ first verifier ≠ re-verifier)

---

## Verdict

The repairs close the four previously reported implementation gaps, but the feature is not ready. The one allowed cold `npm run verify` invocation failed before the stack assertions because the test harness selected a host port that Docker Desktop could not bind. The expanded discrimination sensor also found that production probe tests do not assert the final not-ready classification or CLI exit status. One specified readiness edge case remains uncovered and is not implemented for Storage.

**Spec-anchored result**: 19/22 acceptance criteria have exact assertion evidence; 3 fail or have a verification gap; 0 spec-precision gaps.
**Edge cases**: 4/5 have exact outcome evidence; required-service readiness has a gap.
**Sensor**: 7 behavior mutations, 6 killed, 1 survived.

---

## Task Completion

| Tasks | Status | Evidence |
| --- | --- | --- |
| T1-T16 | ✅ Done | Commits `d0089b6` through `dd8e4a9`; all task checkboxes remain checked. |
| T17 | ✅ Done | Commit `6a94630`; Storage cold-start health override and bounded diagnostics are present. |
| T18 | ✅ Done | Commit `e814cb9`; live TLS, SMTP, and S3 probe implementation and integration fixtures are present. |
| T19 | ✅ Done | Commit `bfde906`; isolated advisor negative path is present. |
| T20 | ✅ Done | Commit `9256923`; isolated tracked-file scanner CLI negative path is present. |

`tasks.md` contains 20 task headings, 90 checked task items, and 0 open task items. Completion metadata does not override the failed final gate or surviving mutant.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + exact assertion evidence | Result |
| --- | --- | --- | --- |
| FOUND-01 AC1: root Compose startup | A clean documented start makes web, proxy, PostgreSQL, Auth, REST, Realtime, Storage, and gateway services healthy. | `tests/integration/stack/foundation-stack.test.ts:136-155` selects ports and fails on non-zero `compose up --detach --wait`; `infra/compose/supabase.override.yaml:15-21` supplies the repaired Storage window. The cold verifier run failed at `foundation-stack.test.ts:154` because Docker rejected `127.0.0.1:53835`, leaving all 7 stack tests skipped. | ❌ FAIL: clean startup remains nondeterministic. |
| FOUND-01 AC2: healthy public surface | Healthy services expose the shell and documented Supabase APIs through ingress. | `tests/integration/stack/foundation-stack.test.ts:183-206` asserts shell `200` + `CampusMarkt`, Auth/REST/Storage `[200,200,200]`, and RLS-filtered REST `[]`. | ✅ PASS |
| FOUND-01 AC3: missing required value | Startup validation fails and identifies the missing variable. | `tests/integration/compose/topology.test.ts:180-187` asserts non-zero and `POSTGRES_PASSWORD`; `scripts/config/validate-env.test.ts:75-94` asserts each required local variable name. | ✅ PASS |
| FOUND-01 AC4: persistence | A normal stop/start without volume deletion retains the database row and Storage object. | `tests/integration/stack/foundation-stack.test.ts:209-245` asserts the exact database marker and exact Storage marker after stop/start. | ✅ PASS |
| FOUND-01 AC5: private internal ports | PostgreSQL and internal Supabase services have no VPS-public bindings. | `tests/integration/compose/topology.test.ts:98-115` asserts no published ports for eight internal services; `tests/integration/compose/ingress.test.ts:100-105` asserts Caddy is the only published service. | ✅ PASS |
| FOUND-02 AC1: repeatable quality commands | Lockfile installation exposes typecheck, lint, unit, integration, build, and format commands. | `tests/unit/workspace-contract.test.ts:22-41` asserts the root command inventory; `tests/unit/workspace-contract.test.ts:44-55` asserts exact versions, lockfile v3, and package inventory. | ✅ PASS |
| FOUND-02 AC2: full quality gate | The full foundation gate completes with zero type, lint, test, build, or format errors. | `package.json:33` defines the complete command. The only cold verifier invocation passed check, build, 25 integration tests, and 7 database tests, then failed the stack suite at `tests/integration/stack/foundation-stack.test.ts:154`; 7 stack tests were skipped and operations/e2e were not reached. | ❌ FAIL |
| FOUND-02 AC3: explicit boundaries | Presentation, application, domain, validation, and transport code have explicit import boundaries. | `tests/architecture/import-boundaries.test.ts:20-76` asserts allowed public imports and three prohibited directions; `packages/domain/src/index.test.ts:12-21`, `packages/validation/src/index.test.ts:20-29`, and `packages/types/src/index.test.ts:22-31` assert public-only dependency-free contracts. | ✅ PASS |
| FOUND-02 AC4: forbidden import rejection | A prohibited presentation import fails with an identifying diagnostic. | `tests/architecture/import-boundaries.test.ts:51-62` asserts `no-restricted-imports` and `ARCH_PRESENTATION_INFRASTRUCTURE`; sensor M1 removed the rule and the named assertion failed. | ✅ PASS |
| FOUND-02 AC5: responsive shell | 360px and 1280px viewports render without horizontal overflow. | `apps/web/tests/shell.spec.ts:3-7` defines both widths; `apps/web/tests/shell.spec.ts:17-22` asserts `scrollWidth === clientWidth`. | ✅ PASS |
| FOUND-03 AC1: migration history | A clean migration applies once and is recorded once. | `supabase/tests/foundation-baseline.test.ts:115-132` asserts successful apply, table existence, history count `1`, and idempotent history count `1`. | ✅ PASS |
| FOUND-03 AC2: RLS enabled | Every exposed application table has RLS. | `supabase/tests/foundation-baseline.test.ts:135-150` asserts `relrowsecurity = t` and no unintended canary policy. | ✅ PASS |
| FOUND-03 AC3: deny without policy | `anon` and `authenticated` cannot read rows without an approved policy even when Data API grants exist. | `supabase/tests/foundation-baseline.test.ts:153-170` asserts grants `t|t` and exact row counts `0` for both roles. | ✅ PASS |
| FOUND-03 AC4: credential separation | Browser code receives only publishable credentials; server/database/SMTP/S3 secrets stay out of browser variables and tracked files. | `scripts/config/validate-env.test.ts:96-139` rejects named and value-equal browser secrets; `scripts/security/scan-secrets.test.ts:182-183` asserts the tracked inventory is clean. | ✅ PASS |
| FOUND-03 AC5: tracked-file secret gate | A configured credential in a tracked file makes the repository scanner fail with a redacted finding. | `scripts/security/scan-secrets.test.ts:131-180` creates a temporary Git repository, tracks `.env.production`, runs the real CLI subprocess, asserts non-zero, file/rule, redaction, empty stdout, cleanup, and unchanged real porcelain. Sensor M6 inverted the CLI condition and this test failed at line 165. | ✅ PASS |
| FOUND-03 AC6: advisor negative gate | A configured database finding makes the database gate fail and reports the finding. | `supabase/tests/foundation-baseline.test.ts:203-221` creates `public.advisor_violation`, runs the project Supabase advisor, asserts non-zero + `rls_disabled_in_public` + table name + password redaction, then drops it; lines `223-228` assert clean lint/advisor success. Sensor M5 removed `--fail-on error` and the negative test failed. | ✅ PASS |
| FOUND-04 AC1: HTTPS proxy topology | Production Caddy terminates public 80/443 and forwards only web and documented API routes. | `tests/integration/compose/ingress.test.ts:119-132` asserts hostname and public 80/443; lines `144-168` assert the gateway prefixes and web fallback; lines `171-176` reject Studio/PostgreSQL exposure. | ✅ PASS |
| FOUND-04 AC2: safe production example | The example contains names and inert placeholders, not operational credentials. | `infra/compose/production.env.example:1-34` contains empty/inert values; `scripts/security/scan-secrets.test.ts:182-183` asserts no tracked credential finding. | ✅ PASS |
| FOUND-04 AC3: pinned upgrades | Documentation requires changelog review, backup, update, health/smoke checks, and restore readiness. | `docs/operations/upgrades.md:5-51` defines the ordered contract; `scripts/operations/verify-doc-commands.ts:139-151` asserts the update, backup, changelog, and restore commands. | ✅ PASS |
| FOUND-04 AC4: external backup artifacts | Backup creates database and Storage artifacts outside primary volumes with verified hashes. | `tests/integration/operations/backup-restore.test.ts:191-217` asserts success, format/release, exact SHA-256 values, and destination containment. | ✅ PASS |
| FOUND-04 AC5: isolated restore | Restore reproduces the exact database fixture and Storage object in an isolated target. | `tests/integration/operations/backup-restore.test.ts:330-367` asserts successful isolated restore, the exact database marker, and exact Storage contents. Sensor M7 inverted the isolation guard and killed three assertions including lines 290 and 350. | ✅ PASS |
| FOUND-04 AC6: production dependency readiness | Missing or invalid TLS, SMTP, or S3 makes production not-ready while local remains offline and allowed. | `scripts/config/validate-env.test.ts:45-62` asserts local/complete static contracts; `tests/integration/config/production-probes.test.ts:151-225` opens real local TLS/SMTP/S3 sockets and asserts trusted success, hostname-invalid TLS, timeout, SMTP auth/reachability, and S3 rejection diagnostics. However lines `114-118` treat an S3 request as authenticated by access-key substring only, and no negative test asserts `result.ok === false` or the probe CLI's non-zero exit. Sensor M3 forced `ok: true` at `scripts/config/probe-production.ts:275` and all 6 probe tests still passed. | ❌ GAP: final classification/CLI and real S3 signature validity are not proven. |

**Status**: ❌ 19/22 acceptance criteria match the exact spec outcome; 3 fail or lack discriminating evidence; 0 spec-precision gaps.

---

## Prior Gap Re-check

| Prior gap | Fresh evidence | Result |
| --- | --- | --- |
| Deterministic cold start | 0 CampusMarkt containers, volumes, or networks existed before the one `npm run verify`. Storage became healthy within the repaired window, but Docker rejected the selected Caddy host port. | ❌ Not closed at feature level. |
| Actual TLS/SMTP/S3 probes | `production-probes.test.ts:103-145` starts actual HTTPS and implicit-TLS SMTP sockets; `probe-production.ts:90-260` performs HTTPS readiness, SMTP `EHLO`/`AUTH PLAIN`, and signed S3 `HEAD`. TLS/SMTP validity is proven. The S3 fixture checks only the access-key substring, and the aggregate not-ready result/CLI exit is unasserted. | ❌ Partially closed. |
| Advisor negative gate | `foundation-baseline.test.ts:203-228` executes the project-scoped Supabase CLI against an isolated RLS-disabled table, observes the expected non-zero finding, cleans it, and then passes the clean advisor path. Sensor M5 confirms discrimination. | ✅ Closed. |
| Tracked-file scanner CLI | `scan-secrets.test.ts:131-180` runs the real CLI in a temporary Git repository with an actually tracked secret and asserts non-zero/redaction/cleanup. Sensor M6 confirms discrimination. | ✅ Closed. |

---

## Edge Cases

- [ ] Required service unhealthy: `tests/integration/stack/foundation-stack.test.ts:248-266` proves the Storage health failure and bounded diagnostic, while lines `163-179` prove readiness 503 only when `api-gw` is stopped. `apps/web/src/modules/foundation/readiness.ts:13-27` checks only `/auth/v1/health`, and `compose.yaml:30-34` gates public Caddy only on web and `api-gw`. No assertion or implementation keeps public readiness false specifically when required Storage is unhealthy.
- [x] Migration failure: `tests/integration/stack/foundation-stack.test.ts:281-319` asserts non-zero, a migration diagnostic, bounded output, and non-200 readiness.
- [x] Insufficient host capacity: `scripts/config/validate-env.test.ts:225-238` asserts named CPU, memory, and disk failures.
- [x] Unreachable backup storage: `tests/integration/operations/backup-restore.test.ts:219-233` asserts non-zero and no success output.
- [x] Secret in a tracked environment file: `scripts/security/scan-secrets.test.ts:131-180` asserts the real scanner CLI exits non-zero and redacts the generated credential.

---

## Mandatory Gates

### Build

- **Command**: `npm run check && npm run build`
- **Outcome**: ✅ PASS on the first invocation.
- **Evidence**: 73 unit tests passed, 4 architecture tests passed, format/type/lint/secret/doc checks passed, and the Next.js production build completed.
- **Skipped/failed**: 0.

### Final verify

- **Cold-state proof before invocation**: 0 CampusMarkt containers, 0 CampusMarkt volumes, 0 CampusMarkt networks, empty `git status --porcelain=v1`.
- **Command**: `npm run verify`
- **Invocations**: exactly 1; no focused or full retry followed the failure.
- **Outcome**: ❌ FAIL.
- **Passed before failure**: 109 tests (73 unit, 4 architecture, 25 Compose/config integration, 7 database).
- **Failure**: stack `beforeAll` at `tests/integration/stack/foundation-stack.test.ts:154`; Docker could not bind `127.0.0.1:53835` selected by lines `38-50` and assigned at lines `136-143`.
- **Skipped**: 7 stack tests because setup aborted.
- **Not reached**: 7 operations tests and 2 Playwright tests because the root command short-circuited.
- **Current suite inventory**: 125 executable tests; pre-feature `11a9bb8` had 0; delta +125.

---

## Discrimination Sensor

All behavior mutations executed in detached scratch worktree `9256923`. Mutations never executed against real source files. The scratch and every Compose project/container/volume it created were removed. A junction-cleanup side effect temporarily removed tracked workspace files from the real tree; they were immediately restored from `HEAD`, normalized hashes matched, dependencies were reinstalled, and final `git status --porcelain=v1`, unstaged diff, and staged diff all matched the empty baseline. Docker Desktop remained active.

| Mutation | Behavior fault | Targeted test result | Outcome |
| --- | --- | --- | --- |
| M1 Architecture | Replaced presentation→infrastructure restricted paths with unrelated paths in `eslint.config.mjs:71-79`. | `import-boundaries.test.ts:57` failed because the named diagnostic disappeared. | ✅ Killed |
| M2 Cold health | Changed Storage `start_period` from `45s` to `0s` in `infra/compose/supabase.override.yaml:20`. | `topology.test.ts:150-158` failed on the exact health window. | ✅ Killed |
| M3 Production readiness | Forced `probeProductionDependencies()` to return `ok: true` despite collected errors at `probe-production.ts:275`. | All 6 production probe tests passed. | ❌ Survived |
| M4 TLS enforcement | Disabled HTTPS certificate verification at `probe-production.ts:74`. | `production-probes.test.ts:175` failed because hostname-invalid TLS was accepted. | ✅ Killed |
| M5 Advisor/RLS gate | Removed `--fail-on error` from the Supabase advisor helper at `foundation-baseline.test.ts:94-97`. | Negative advisor test failed because the RLS-disabled finding returned exit 0. | ✅ Killed |
| M6 Tracked-secret CLI | Inverted the CLI finding condition at `scan-secrets.ts:138`. | Isolated Git subprocess test failed at `scan-secrets.test.ts:165`. | ✅ Killed |
| M7 Backup guard | Inverted the isolated-target guard at `backup-restore.ts:218`. | Operations suite failed at active refusal, checksum path, and isolated restore assertions. | ✅ Killed |

**Sensor depth**: expanded P0-style manual sensor across architecture, cold health, production probes, advisor/RLS, tracked-secret CLI, and backup guard.
**Sensor outcome**: ❌ 6/7 killed, 1 survived.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / no deferred product scope | ✅ Repair diff stays within foundation health, production readiness, database checks, scanner, docs, and SDD metadata. |
| Surgical changes | ✅ T17-T20 change only the approved repair surfaces. |
| Matches repository patterns | ✅ CampusMarkt-owned Compose override preserves vendored Supabase files; security checks run at data/tool boundaries. |
| Current Supabase guidance | ✅ RLS/grants and advisor checks match the current official Supabase RLS and Database Advisor contracts; the current changelog's self-hosted Envoy/API changes are consistent with the pinned vendored release. |
| Spec-anchored outcomes | ❌ Cold startup and production not-ready classification are not proven. |
| Per-layer coverage | ❌ Required-service readiness omits Storage; S3 mock does not validate the signature/secret. |
| Every in-scope test claimed | ✅ Tests map to an AC, an edge case, or a task done-when criterion. |
| Project instructions | ✅ Reviewed against root `AGENTS.md`, TLC `validate.md`/`coding-principles.md`/`lessons.md`, and the Supabase/Supabase Postgres security guidance. |

---

## Ranked Gaps and Fix Plans

### 1. Make test ingress port allocation Docker-deterministic

- **Requirements**: FOUND-01 AC1, FOUND-02 AC2.
- **Evidence**: `foundation-stack.test.ts:38-50` asks the host OS for a free TCP port, closes it, then lines `136-143` also assume `port + 1`; the cold gate failed when Docker could not publish the selected HTTP port.
- **Root cause**: host-process availability is not proof that Docker Desktop/HNS can publish the port, and the close-before-publish sequence is a race.
- **Fix task**: let Docker allocate the test host ports and discover them with `docker compose port`, or add a bounded Docker-native allocation probe; assert both HTTP and HTTPS mappings before stack startup.
- **Priority**: Blocker.

### 2. Assert production not-ready and CLI exit behavior

- **Requirement**: FOUND-04 AC6.
- **Evidence**: `production-probes.test.ts:166-225` checks error strings only. M3 forced aggregate `ok: true` and all tests passed. No test spawns the probe/preflight CLI for invalid TLS, SMTP authentication, or S3 authentication.
- **Root cause**: negative tests observe diagnostics but not the contract's classification/exit boundary.
- **Fix task**: assert `ok: false` for each dependency failure and execute the same `preflight`/probe CLI entry point, asserting non-zero and redacted diagnostics.
- **Priority**: Major.

### 3. Make Storage health participate in public readiness

- **Requirement**: unhealthy-required-service edge case.
- **Evidence**: `readiness.ts:13-27` probes Auth only; `foundation-stack.test.ts:248-266` never checks public readiness while Storage is unhealthy.
- **Root cause**: the public readiness dependency model collapses Supabase to one Auth route and therefore cannot identify an unhealthy required Storage service.
- **Fix task**: probe every required public dependency needed by the foundation, return a bounded service identity, and assert 503 while Storage is unhealthy before restoring it.
- **Priority**: Major.

### 4. Validate S3 authentication, not an access-key substring

- **Requirement**: FOUND-04 AC6.
- **Evidence**: `production-probes.test.ts:114-118` accepts any Authorization header containing the expected access-key ID; it never verifies the SigV4 signature or secret. The rejection test at lines `219-225` forces a 403 independently of the supplied signature.
- **Root cause**: the mock proves an HTTPS `HEAD` occurred but not that the generated credentials/signature are accepted by an S3-compatible implementation.
- **Fix task**: run the probe against an isolated pinned S3-compatible fixture or independently verify the complete SigV4 request; include a wrong-secret negative case.
- **Priority**: Major.

---

## Requirement Traceability Update

The verifier changed only this report. `spec.md` remains untouched.

| Requirement | Recorded status | Re-verifier outcome |
| --- | --- | --- |
| FOUND-01 | Repaired; verification pending | ❌ Needs fix: Docker-native test port allocation and required-service readiness. |
| FOUND-02 | Repaired; verification pending | ❌ Needs fix: root verify failed. |
| FOUND-03 | Repaired; verification pending | ✅ Advisor and tracked-file CLI negative gates verified. |
| FOUND-04 | Repaired; verification pending | ❌ Needs fix: final not-ready/CLI contract and authentic S3 validation are not discriminating. |

---

## Grounded Lessons

- `gate_fail`, grounded in `tests/integration/stack/foundation-stack.test.ts:38-50`: Allocate integration-test ingress ports through the publishing runtime; host ephemeral availability does not prove Docker can bind them.
- `surviving_mutant`, grounded in sensor M3 at `scripts/config/probe-production.ts:275`: Negative dependency probes must assert the final readiness boolean and CLI exit code, not only diagnostic strings.
- `ac_gap`, grounded in `tests/integration/config/production-probes.test.ts:114-118`: S3 readiness fixtures must validate the complete authenticated request or use a real compatible service; an access-key substring is not authentication.
- `ac_gap`, grounded in `apps/web/src/modules/foundation/readiness.ts:13-27`: Public readiness must cover every required service named by the startup contract.

The user restricted real-tree writes to this `validation.md`, so the machine-owned `.specs/lessons.json` and `.specs/LESSONS.md` were not modified. The signals are distilled here only; the scratch-cleanup incident is not distilled because TLC lessons exclude methodology/process opinions.

---

## Hygiene

- Final real-tree porcelain before writing this report matched the empty pre-sensor baseline.
- Scratch worktree removed; only the main worktree remains.
- No CampusMarkt container, volume, or network remains.
- No verifier-started terminal, test runner, server, or watcher remains active.
- Docker Desktop remains active as required.
- `validate_state.py` ran with Python 3.13.1 and exited `1` with the expected message that a FAIL report cannot complete the feature.

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 19/22 ACs matched; 3 failed/gapped; 0 spec-precision gaps.
**Edge cases**: 4/5 exact; required-service readiness remains open.
**Build**: PASS, 77 tests plus production build and static checks.
**Final verify**: FAIL on its only cold invocation after 109 passing tests; 7 stack tests skipped; operations/e2e not reached.
**Sensor**: FAIL, 6/7 mutants killed and 1 survived.

Route the four ranked gaps into a second repair iteration, then run a fresh cold verification without retries.
