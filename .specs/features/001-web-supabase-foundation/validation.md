# Validation: Web and Supabase Foundation - FAIL ❌

**Date**: 2026-09-15
**Spec**: `.specs/features/001-web-supabase-foundation/spec.md`
**Diff range**: `11a9bb8..dd8e4a9`
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Commit `d0089b6`; all task checkboxes complete. |
| T2 | ✅ Done | Commit `896329e`; all task checkboxes complete. |
| T3 | ✅ Done | Commit `c5c36b2`; all task checkboxes complete. |
| T4 | ✅ Done | Commit `92bd5f3`; all task checkboxes complete. |
| T5 | ✅ Done | Commit `c060dca`; all task checkboxes complete. |
| T6 | ✅ Done | Commit `f01ac87`; all task checkboxes complete. |
| T7 | ✅ Done | Commit `4abdfb6`; all task checkboxes complete. |
| T8 | ✅ Done | Commit `63e2bd6`; all task checkboxes complete. |
| T9 | ✅ Done | Commit `95983a4`; all task checkboxes complete. |
| T10 | ✅ Done | Commit `c6c0440`; all task checkboxes complete. |
| T11 | ✅ Done | Commit `a20c507`; all task checkboxes complete. |
| T12 | ✅ Done | Commit `d009c98`; all task checkboxes complete. |
| T13 | ✅ Done | Commit `4b6a283`; all task checkboxes complete. |
| T14 | ✅ Done | Commit `0ecb2ce`; all task checkboxes complete. |
| T15 | ✅ Done | Commit `a6d8753`; all task checkboxes complete. |
| T16 | ✅ Done | Commit `dd8e4a9`; all task checkboxes complete. |

All 16 task headings are present, 72 task checkboxes are checked, and none is open. Task completion does not override the failed feature gate below.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| FOUND-01 AC1: documented root Compose start | All required application and Supabase containers become healthy. | `tests/integration/stack/foundation-stack.test.ts:151` starts `compose up --detach --wait`; `tests/integration/stack/foundation-stack.test.ts:152-153` fails the suite on non-zero. The first verifier `npm run verify` observed non-zero with `container supabase-storage is unhealthy`; the focused retry later passed 6/6. | ❌ FAIL, cold-start gate is nondeterministic. |
| FOUND-01 AC2: healthy public surface | The shell and documented Supabase APIs respond through ingress. | `tests/integration/stack/foundation-stack.test.ts:185-186` asserts HTTP 200 and `CampusMarkt`; `tests/integration/stack/foundation-stack.test.ts:204-205` asserts Auth/REST/Storage `200,200,200` and RLS-filtered REST `[]`. | ✅ PASS |
| FOUND-01 AC3: missing required environment value | Validation fails and names the variable. | `tests/integration/compose/topology.test.ts:167-168` asserts non-zero and `POSTGRES_PASSWORD`; `scripts/config/validate-env.test.ts:86-92` asserts every missing local variable name. | ✅ PASS |
| FOUND-01 AC4: persistence without volume deletion | PostgreSQL row and Storage object survive stop/start. | `tests/integration/stack/foundation-stack.test.ts:225-235` asserts restart and the exact row marker; `tests/integration/stack/foundation-stack.test.ts:243-244` asserts the exact Storage marker. | ✅ PASS |
| FOUND-01 AC5: private internal service ports | PostgreSQL and internal Supabase services have no public bindings. | `tests/integration/compose/topology.test.ts:94-107` asserts no `ports` for eight internal services; `tests/integration/compose/ingress.test.ts:100-105` asserts Caddy is the only published service. | ✅ PASS |
| FOUND-02 AC1: repeatable quality commands | Lockfile install exposes typecheck, lint, unit, integration, build, and format commands. | `tests/unit/workspace-contract.test.ts:25-41` asserts the complete required script set; `tests/unit/workspace-contract.test.ts:51-55` asserts exact versions, lockfile v3, and package inventory. | ✅ PASS |
| FOUND-02 AC2: full quality gate | The full foundation gate completes with zero errors. | `package.json:33` defines `npm run verify`. Verifier runtime evidence: the first invocation reached 98 passing tests, then `tests/integration/stack/foundation-stack.test.ts:151-153` failed because Storage was unhealthy and skipped all 6 stack cases. | ❌ FAIL |
| FOUND-02 AC3: explicit application boundaries | Presentation, application, domain, validation, and transport contracts have enforced directions. | `tests/architecture/import-boundaries.test.ts:20-35` asserts allowed public imports; `packages/domain/src/index.test.ts:20-21`, `packages/validation/src/index.test.ts:28-29`, and `packages/types/src/index.test.ts:30-31` assert public-only dependency-free contracts. | ✅ PASS |
| FOUND-02 AC4: prohibited import rejection | A forbidden presentation import fails with a named diagnostic. | `tests/architecture/import-boundaries.test.ts:51-62` asserts `no-restricted-imports` and `ARCH_PRESENTATION_INFRASTRUCTURE`; sensor mutation M1 proved the assertion fails when the restriction is removed. | ✅ PASS |
| FOUND-02 AC5: 360px and 1280px responsive shell | Both viewports have no horizontal overflow. | `apps/web/tests/shell.spec.ts:3-7` supplies both widths; `apps/web/tests/shell.spec.ts:17-22` asserts `scrollWidth === clientWidth`. Verifier run: 2/2 passed. | ✅ PASS |
| FOUND-03 AC1: clean migration history | The canary migration applies once and is recorded once. | `supabase/tests/foundation-baseline.test.ts:92-101` asserts successful apply, table existence, and history count `1`; `supabase/tests/foundation-baseline.test.ts:104-109` asserts idempotent count `1`. | ✅ PASS |
| FOUND-03 AC2: RLS on exposed application tables | The canary has RLS and no unintended policy. | `supabase/tests/foundation-baseline.test.ts:112-127` asserts `relrowsecurity = t` and policy count `0`. | ✅ PASS |
| FOUND-03 AC3: deny roles without policy | `anon` and `authenticated` see zero rows despite Data API grants. | `supabase/tests/foundation-baseline.test.ts:130-147` asserts both grants are true and both role queries return `0`; sensor mutation M4 added a permissive policy and was killed. | ✅ PASS |
| FOUND-03 AC4: browser/server credential separation | Only the publishable key may enter browser configuration; tracked server secrets remain absent. | `scripts/config/validate-env.test.ts:95-106` rejects named browser secrets; `scripts/config/validate-env.test.ts:109-121` rejects a server secret copied to any other `NEXT_PUBLIC_` variable; `scripts/security/scan-secrets.test.ts:123-124` asserts no configured secret in tracked files. | ✅ PASS |
| FOUND-03 AC5: tracked-file secret gate negative path | Running the repository scanner on a tracked secret exits non-zero with a redacted finding. | `scripts/security/scan-secrets.test.ts:43-91` asserts in-memory detectors and redaction, while `scripts/security/scan-secrets.test.ts:123-124` exercises only the clean tracked repository. No test invokes the CLI against an isolated Git inventory containing a tracked secret and asserts its exit status. | ❌ GAP, no exact tracked-file gate assertion. |
| FOUND-03 AC6: Supabase database-check negative path | A migration/policy finding makes the full gate fail and reports the finding. | `supabase/tests/foundation-baseline.test.ts:225-226` asserts only that lint/advisors pass on the clean schema. `supabase/tests/foundation-baseline.test.ts:171-177` covers SQL failure/rollback, not a configured lint/advisor finding. | ❌ GAP, no injected database finding assertion. |
| FOUND-04 AC1: production HTTPS proxy topology | Caddy terminates public 80/443 and forwards only web/API routes. | `tests/integration/compose/ingress.test.ts:119-132` asserts production hostname and public 80/443; `tests/integration/compose/ingress.test.ts:144-168` asserts the exact gateway prefixes and web fallback. | ✅ PASS |
| FOUND-04 AC2: safe production environment example | The example contains names/placeholders and no operational credentials. | `infra/compose/production.env.example:4-33` contains empty or inert values; `scripts/security/scan-secrets.test.ts:123-124` asserts the tracked repository is clean. | ✅ PASS |
| FOUND-04 AC3: pinned upgrade sequence | Documentation requires changelog review, backup, update, health/smoke checks, and restore readiness. | `scripts/operations/verify-doc-commands.ts:139-151` asserts the required update/backup/changelog contracts; `docs/operations/upgrades.md:9-48` documents the ordered commands and checks. | ✅ PASS |
| FOUND-04 AC4: backup outside primary volumes | Backup emits database/Storage artifacts and exact SHA-256 manifest values under an external destination. | `tests/integration/operations/backup-restore.test.ts:191-217` asserts format, pinned release, both artifact hashes, and destination containment. | ✅ PASS |
| FOUND-04 AC5: isolated database and Storage restore | Isolated restore reproduces the exact row and object. | `tests/integration/operations/backup-restore.test.ts:330-367` asserts successful isolated restore, exact database marker, and exact Storage contents. | ✅ PASS |
| FOUND-04 AC6: incomplete production dependencies | Missing SMTP, S3, or valid TLS configuration is not production-ready while local remains allowed. | `scripts/config/validate-env.test.ts:44-61` asserts local success and complete production success; `scripts/config/validate-env.test.ts:140-184` asserts missing variables and non-HTTPS URLs; `scripts/config/validate-env.test.ts:203-210` asserts non-S3 rejection. There is no assertion for actual TLS certificate validity or external SMTP/S3 reachability before classification. | ❌ GAP |

**Status**: ❌ 17/22 acceptance criteria match the exact spec outcome; 5 criteria fail or lack exact negative-path evidence. No spec-precision gap was required: the missing outcomes are defined precisely enough to test.

---

## Discrimination Sensor

All mutations ran in detached temporary worktree `dd8e4a9`. No mutation ran against the real tree. The scratch was removed. The real-tree baseline was empty before the sensor and `git status --porcelain=v1` plus `git diff --exit-code` were empty after cleanup.

| Mutation | File:line | Behavior-level fault | Test evidence | Killed? |
| --- | --- | --- | --- | --- |
| M1 Architecture boundary | `eslint.config.mjs:71-79` | Replaced presentation-to-infrastructure restricted import patterns with unrelated paths. | `tests/architecture/import-boundaries.test.ts:57-62` failed because the expected named diagnostic disappeared. | ✅ Killed |
| M2 Production readiness | `scripts/config/validate-env.ts:14-18` | Lowered production CPU floor from 4 to 3. | `scripts/config/validate-env.test.ts:220-226` failed for `CPU_CORES`. | ✅ Killed |
| M3 Secret scanning | `scripts/security/scan-secrets.ts:11-20` | Removed recognition of `SERVICE_ROLE_KEY` assignments. | `scripts/security/scan-secrets.test.ts:61-63` failed because the expected finding disappeared. | ✅ Killed |
| M4 RLS denial | `supabase/migrations/20260914221752_foundation_canary.sql:15-16` | Added an `anon, authenticated` permissive read policy. | `supabase/tests/foundation-baseline.test.ts:127` failed on policy count and `supabase/tests/foundation-baseline.test.ts:142` failed on visible row count. | ✅ Killed |
| M5 Backup/restore guard | `scripts/operations/backup-restore.ts:217-220` | Inverted the isolated-target guard so active restore was accepted and isolated restore rejected. | `tests/integration/operations/backup-restore.test.ts:290-291` and `tests/integration/operations/backup-restore.test.ts:350` failed. | ✅ Killed |

**Sensor depth**: P0-full manual behavior-level run across all five required critical boundaries.
**Sensor outcome**: 5/5 killed, 0 survived - PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Foundation scope is implemented without marketplace behavior. |
| Surgical changes | ✅ Diff matches the approved foundation design and vendored upstream boundary. |
| No scope creep | ✅ No deferred listing, payment, messaging, PWA, or mobile capability is reachable. |
| Matches patterns | ✅ Workspace boundaries, immutable versions, RLS, and private ingress match `AGENTS.md` and the approved design. |
| Spec-anchored outcomes | ❌ Five ACs fail or lack exact negative-path evidence. |
| Per-layer coverage | ❌ Database-advisor and tracked-file CLI negative paths are not exercised end to end. |
| Every in-scope test is claimed | ✅ Tests map to an AC, listed edge case, or task Done-when criterion. |
| Documented guidelines | ✅ Reviewed against `AGENTS.md`, the Supabase security checklist, and Supabase Postgres RLS guidance. |

---

## Edge Cases

- [x] Unhealthy dependency keeps readiness failing and names the dependency: `tests/integration/stack/foundation-stack.test.ts:162-178` asserts 503 and `unavailable: ["supabase"]`; the failed full gate also identified `supabase-storage`.
- [x] Failed migration exits non-zero and prevents ready status: `tests/integration/stack/foundation-stack.test.ts:279-285` asserts non-zero, migration diagnostic, bounded output, and non-200 readiness.
- [x] Insufficient CPU, memory, or disk is named: `scripts/config/validate-env.test.ts:213-226` asserts all three resource diagnostics.
- [x] Unreachable backup destination exits non-zero without success output: `tests/integration/operations/backup-restore.test.ts:219-233` asserts both outcomes.
- [ ] A secret in a genuinely tracked environment file makes the scanner CLI exit non-zero: detector-level assertions exist at `scripts/security/scan-secrets.test.ts:43-91`, but there is no isolated tracked-inventory subprocess assertion.

---

## Gate Check

- **Mandatory Build command**: `npm run check && npm run build`
- **Build execution**: PASS; typecheck, lint, formatting, secret scan, documentation check, 70 unit tests, 4 architecture tests, and Next.js production build completed with zero errors.
- **Final Verify command**: `npm run verify`
- **Final Verify execution**: FAIL on first verifier invocation; 98 tests passed before the stack suite, then `supabase-storage` was unhealthy, 6 stack tests were skipped, and later commands did not run.
- **Focused reruns after failure**: stack 6/6 passed; operations 7/7 passed; Playwright 2/2 passed. These show the behavior can succeed but do not make the one-command gate deterministic.
- **Test count before feature (`11a9bb8`)**: 0 test files / 0 tests.
- **Test count after feature**: 113 executable assertions/cases across successful focused commands (70 unit, 4 architecture, 18 Compose, 6 database, 6 stack, 7 operations, 2 browser).
- **Delta**: +113 tests.
- **Skipped tests**: 6 only in the failed `npm run verify` attempt because stack `beforeAll` aborted; 0 in successful focused reruns.
- **Terminal/container hygiene**: all verifier commands exited; all CampusMarkt test containers and volumes were removed by their hooks; no live Docker container remained.

---

## Ranked Gaps and Fix Plans

### 1. Make cold-stack readiness deterministic

- **Requirements**: FOUND-01 AC1, FOUND-02 AC2.
- **Evidence**: `tests/integration/stack/foundation-stack.test.ts:151-153` failed the first full gate with `supabase-storage` unhealthy. The vendored health check at `infra/supabase/docker-compose.yml:344-356` has three five-second retries and no start period.
- **Root cause**: the bounded Storage health window can expire during a cold Docker/volume start; teardown removes the service logs before the failure can be diagnosed further.
- **Fix task**: add a CampusMarkt-owned health-check override with a justified cold-start allowance, retain bounded service logs on failure, and prove a clean-volume/cold-daemon `npm run verify` succeeds without retry.
- **Priority**: Major.

### 2. Verify production dependency validity, not only variable presence

- **Requirement**: FOUND-04 AC6.
- **Evidence**: `scripts/config/validate-env.ts:145-196` checks presence, URL scheme, hostname shape, S3 selector, and capacity, but not certificate validity or SMTP/S3 connectivity.
- **Root cause**: production readiness is a static environment validator and cannot distinguish plausible placeholders from working TLS/external-service configuration.
- **Fix task**: add a safe production-readiness smoke/preflight layer that proves the configured TLS endpoint/certificate and bounded SMTP/S3 reachability without exposing credentials; preserve the current offline local path.
- **Priority**: Major.

### 3. Prove Supabase lint/advisor findings kill the gate

- **Requirement**: FOUND-03 AC6.
- **Evidence**: `supabase/tests/foundation-baseline.test.ts:225-226` covers only the clean success path.
- **Root cause**: no isolated schema/policy fault is passed through the configured database-check command with an asserted non-zero status and finding.
- **Fix task**: inject a known lint/advisor violation in an isolated database, run the same configured command as `npm run test:db`, and assert non-zero plus the redacted finding; clean the isolated database afterward.
- **Priority**: Major.

### 4. Prove the tracked-file scanner CLI negative path

- **Requirements**: FOUND-03 AC5 and edge case at `spec.md:126`.
- **Evidence**: `scripts/security/scan-secrets.test.ts:43-91` tests detector functions; `scripts/security/scan-secrets.test.ts:123-124` tests only a clean real inventory.
- **Root cause**: no isolated Git repository combines a tracked secret fixture, `git ls-files`, CLI execution, non-zero exit, and redacted diagnostic assertion.
- **Fix task**: create an isolated temporary Git repository with a tracked secret-bearing env fixture, invoke the scanner CLI as the gate does, assert non-zero/file/rule without the value, and remove the scratch.
- **Priority**: Major.

---

## Requirement Traceability Update

The verifier did not edit `spec.md`; validation is evidence-only.

| Requirement | Recorded status | Verifier outcome |
| --- | --- | --- |
| FOUND-01 | Complete | ❌ Needs fix: cold-start health nondeterminism. |
| FOUND-02 | Complete | ❌ Needs fix: full one-command gate failed. |
| FOUND-03 | Complete | ❌ Needs fix: database-check and tracked-file CLI negative evidence missing. |
| FOUND-04 | Complete | ❌ Needs fix: production dependency validity is not verified. |

---

## Grounded Lessons

- `gate_fail`, grounded in `tests/integration/stack/foundation-stack.test.ts:151-153`: Cold-start health checks must include a bounded start period and preserve failing service diagnostics so the final gate is deterministic.
- `ac_gap`, grounded in `supabase/tests/foundation-baseline.test.ts:225-226` and `scripts/security/scan-secrets.test.ts:123-124`: Security gates need negative subprocess tests that exercise the same advisor or tracked-inventory entry point as the final command.

The user constrained real-tree writes to this `validation.md`, so these lessons are distilled here and were not added to the machine-owned `.specs/lessons.json` or rendered `.specs/LESSONS.md`.

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 17/22 acceptance criteria matched; 5 failed or uncovered; 0 spec-precision gaps.
**Sensor**: 5/5 mutations killed.
**Build gate**: PASS, 74 tests plus build and static checks.
**Final verify gate**: FAIL on cold-stack Storage health; focused retries passed but exposed nondeterminism.

**Next step**: route the four ranked gaps into approved fix tasks, then run a fresh independent verification. Do not mark the feature complete until `npm run verify` passes without retry and all negative paths have exact evidence.
