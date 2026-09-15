# Validation: Web and Supabase Foundation - PASS ✅

**Date**: 2026-09-15
**Spec**: `.specs/features/001-web-supabase-foundation/spec.md`
**Implementation diff range**: `11a9bb8..60b9f7b`
**Verifier**: standalone fresh-eyes fallback (implementation author != verifier; new-agent verification was unavailable because the account usage limit was reached)

---

## Verdict

The foundation is ready. All 22 acceptance criteria and all 5 edge cases have exact implementation and test evidence. The only clean/cold `npm run verify` invocation passed 129 tests with no failures or skips. A fresh P0 discrimination sensor killed 5/5 independent mutations, including the three branches that survived the previous verification.

- **Acceptance criteria**: 22/22 passed.
- **Edge cases**: 5/5 passed.
- **Final gate**: 129/129 tests passed; 0 failed; 0 skipped.
- **Fresh discrimination sensor**: 5/5 mutations killed.
- **Tasks**: T1-T26 complete.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Exact evidence | Result |
| --- | --- | --- |
| FOUND-01 AC1: complete root Compose startup | `tests/integration/compose/topology.test.ts:76-95` asserts the complete service inventory; `tests/integration/stack/foundation-stack.test.ts:144-163` starts the clean stack with `compose up --detach --wait --build`; all 9 stack tests passed. | ✅ PASS |
| FOUND-01 AC2: healthy public surface | `tests/integration/stack/foundation-stack.test.ts:215-238` asserts the shell, exact readiness payload, and Auth/REST/Storage ingress responses. | ✅ PASS |
| FOUND-01 AC3: missing value fails by name | `tests/integration/compose/topology.test.ts:180-187` asserts non-zero validation and `POSTGRES_PASSWORD`; `scripts/config/validate-env.test.ts:75-94` covers every required local variable. | ✅ PASS |
| FOUND-01 AC4: data survives stop/start | `tests/integration/stack/foundation-stack.test.ts:241-278` persists and recovers exact PostgreSQL and Storage markers without deleting volumes. | ✅ PASS |
| FOUND-01 AC5: internal ports remain private | `tests/integration/compose/topology.test.ts:98-115` asserts no internal published ports; `tests/integration/compose/ingress.test.ts:100-105` asserts Caddy is the only published service. | ✅ PASS |
| FOUND-02 AC1: documented repeatable commands | `tests/unit/workspace-contract.test.ts:22-55` asserts the required scripts, exact tool versions, and lockfile v3. | ✅ PASS |
| FOUND-02 AC2: zero-error full gate | The single `npm run verify` invocation passed typecheck, lint, formatting, secret scan, docs check, production build, and all 129 tests. | ✅ PASS |
| FOUND-02 AC3: explicit module boundaries | `tests/architecture/import-boundaries.test.ts:20-76` asserts public entry points and prohibited dependency directions; all 4 tests passed. | ✅ PASS |
| FOUND-02 AC4: forbidden imports are rejected | `tests/architecture/import-boundaries.test.ts:51-62` requires the named `ARCH_PRESENTATION_INFRASTRUCTURE` diagnostic; the prior architecture mutation was killed. | ✅ PASS |
| FOUND-02 AC5: responsive shell | `apps/web/tests/shell.spec.ts:3-22` asserts no horizontal overflow at 360 px and 1280 px; both Playwright cases passed. | ✅ PASS |
| FOUND-03 AC1: migration history | `supabase/tests/foundation-baseline.test.ts:115-132` applies the clean migration, asserts one history record, and proves idempotence. | ✅ PASS |
| FOUND-03 AC2: RLS enabled | `supabase/tests/foundation-baseline.test.ts:135-150` asserts `relrowsecurity = true` and no unintended policies. | ✅ PASS |
| FOUND-03 AC3: deny without policy | `supabase/tests/foundation-baseline.test.ts:153-170` asserts Data API visibility but zero rows for `anon` and `authenticated`. | ✅ PASS |
| FOUND-03 AC4: credential separation | `scripts/config/validate-env.test.ts:96-139` rejects named and value-equal browser secrets; `scripts/security/scan-secrets.test.ts:182-183` asserts the tracked tree is clean. | ✅ PASS |
| FOUND-03 AC5: tracked-secret gate | `scripts/security/scan-secrets.test.ts:131-179` runs the real CLI against a tracked `.env.production` and asserts non-zero, redacted diagnostics, cleanup, and unchanged real porcelain. | ✅ PASS |
| FOUND-03 AC6: database findings block the gate | `supabase/tests/foundation-baseline.test.ts:203-228` asserts a known advisor finding exits non-zero and the clean lint/advisor gate passes. | ✅ PASS |
| FOUND-04 AC1: HTTPS proxy topology | `tests/integration/compose/ingress.test.ts:119-176` asserts production ports 80/443, hostname, exact API prefixes, web fallback, and no Studio/PostgreSQL route. | ✅ PASS |
| FOUND-04 AC2: safe production example | `infra/compose/production.env.example:1-34` contains variable names and inert placeholders; the tracked-secret scan passed. | ✅ PASS |
| FOUND-04 AC3: pinned upgrade procedure | `docs/operations/upgrades.md:5-51` requires changelog review, backup, update, health/smoke checks, and restore readiness; `scripts/operations/verify-doc-commands.ts:138-155` enforces the commands. | ✅ PASS |
| FOUND-04 AC4: external backup artifacts | `tests/integration/operations/backup-restore.test.ts:191-216` asserts database and Storage artifacts, SHA-256 manifest entries, and containment outside primary volumes. | ✅ PASS |
| FOUND-04 AC5: isolated restore | `tests/integration/operations/backup-restore.test.ts:330-367` restores and checks the exact database marker and Storage contents in a separate project. | ✅ PASS |
| FOUND-04 AC6: production dependencies classified | `scripts/config/validate-env.test.ts:45-62,141-240` proves local mode remains available while production configuration is strict; `tests/integration/config/production-probes.test.ts:276-441` validates live TLS, SMTP, and S3 success plus certificate, timeout, authentication, and reachability failures through both aggregate and CLI contracts. | ✅ PASS |

**Status**: ✅ 22/22 acceptance criteria match the approved specification; no precision gaps.

---

## Edge Cases

| Edge case | Exact evidence | Result |
| --- | --- | --- |
| Unhealthy required service keeps readiness failing and names it | `tests/integration/stack/foundation-stack.test.ts:178-213,281-310` checks exact Auth/Storage `503` payloads, bounded diagnostics, and recovery. | ✅ PASS |
| Failed migration exits non-zero and never reports ready | `tests/integration/stack/foundation-stack.test.ts:314-352` injects invalid SQL and asserts non-zero, named migration diagnostics, and readiness not `200`. | ✅ PASS |
| Insufficient host capacity is reported before production startup | `scripts/config/validate-env.test.ts:225-240` asserts exact `CPU_CORES`, `MEMORY_GB`, and `DISK_GB` failures. | ✅ PASS |
| Unreachable backup target exits non-zero without success | `tests/integration/operations/backup-restore.test.ts:219-233` asserts non-zero and no success manifest. | ✅ PASS |
| Secret in tracked environment file exits non-zero | `scripts/security/scan-secrets.test.ts:131-179` asserts the real CLI failure and redacted rule diagnostic. | ✅ PASS |

---

## Mandatory Gates

### Final clean/cold verification

- **Precondition**: clean Git porcelain; Docker Engine 29.4.1; no CampusMarkt containers, networks, volumes, or test processes.
- **Command**: `npm run verify`
- **Invocations**: exactly 1; no retry.
- **Outcome**: ✅ PASS.
- **Checks**: typecheck, lint, format, tracked-secret scan, documentation verification, and Next.js production build passed.
- **Tests**: 129 passed = 73 unit + 4 architecture + 27 Compose/config integration + 7 database + 9 running-stack + 7 operations + 2 Playwright.
- **Failed/skipped**: 0/0.

---

## Fresh Discrimination Sensor

All mutations ran one at a time in detached worktree `60b9f7b`, never in the real tree. The focused test process ended after every mutation, each mutation was reverted, and the disposable worktree was removed.

| ID | Protected behavior / mutation | Observed failure | Result |
| --- | --- | --- | --- |
| M1 | Preserve exit zero only for `TLS dependency timed out.` in the real production-probe CLI. | `production-probes.test.ts:324` received CLI status `0` where non-zero is required. | ✅ Killed |
| M2 | Preserve exit zero only for `SMTP dependency is unreachable.` in the real CLI. | `production-probes.test.ts:367` received CLI status `0` where non-zero is required. | ✅ Killed |
| M3 | Return success when S3 is unreachable. | `production-probes.test.ts:405` received aggregate `ok: true` where `false` is required. | ✅ Killed |
| M4 | Sign S3 SigV4 with the access key instead of the secret key. | `production-probes.test.ts:281` received `S3 authentication failed.` instead of a healthy result. | ✅ Killed |
| M5 | Force aggregate `ok: true` despite collected dependency errors. | `production-probes.test.ts:343` received `true` where `false` is required. | ✅ Killed |

**Sensor result**: ✅ 5/5 killed. M1-M3 are exact equivalents of the three previously surviving branches; M4-M5 confirm full SigV4 and aggregate discrimination.

---

## Task Completion and Traceability

| Requirement | Tasks | Final status |
| --- | --- | --- |
| FOUND-01 | T8-T13, T17, T19, T21-T22, T24 | ✅ Verified |
| FOUND-02 | T1-T7 | ✅ Verified |
| FOUND-03 | T9-T10, T14, T20 | ✅ Verified |
| FOUND-04 | T11-T16, T18, T23, T25-T26 | ✅ Verified |

All T1-T26 checkboxes are complete. The T25 CLI reachability assertions and T26 S3 reachability/timeout fixtures close the only remaining sensor gaps.

---

## Code Quality and Hygiene

- Application/domain boundaries remain framework-independent and enforced.
- CampusMarkt changes stay outside the pinned vendored Supabase snapshot except for its deliberate checked-in baseline.
- Browser variables remain publishable-only; RLS, advisor, and tracked-secret gates are executable.
- Backup/restore is isolated, checksummed, and refuses unsafe targets.
- No product behavior beyond the approved foundation was introduced.
- The temporary verifier worktree was removed; no CampusMarkt test containers, networks, volumes, or test processes remain.
- Docker Desktop remains running by the user's explicit operational choice; no application stack is running.

---

## Summary

**Overall**: ✅ Ready

The web, TypeScript modular-monolith, self-hosted Supabase, Docker Compose, security, migration, readiness, production preflight, and backup/restore foundation is verified and ready for the next feature: `002-identity-and-accounts`.
