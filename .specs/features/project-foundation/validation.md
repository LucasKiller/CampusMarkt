# Project Foundation Validation

**Verdict**: FAIL
**Date**: 2026-09-14
**Spec**: `.specs/features/project-foundation/spec.md`
**Diff range**: `99c978b..HEAD` (`HEAD` = `3f18062`)
**Verifier**: independent sub-agent (author != verifier)

The documentary outcomes are complete, but the feature is not ready. The committed
feature diff fails its whitespace integrity check, and the repository handoff still
describes execution as not started.

## Task Completion

| Task | Status | Evidence |
| --- | --- | --- |
| T1 | Done | `.specs/features/project-foundation/tasks.md:53`, `.specs/features/project-foundation/tasks.md:55` |
| T2 | Done | `.specs/features/project-foundation/tasks.md:79`, `.specs/features/project-foundation/tasks.md:81` |
| T3 | Done | `.specs/features/project-foundation/tasks.md:105`, `.specs/features/project-foundation/tasks.md:107` |
| T4 | Done | `.specs/features/project-foundation/tasks.md:131`, `.specs/features/project-foundation/tasks.md:133` |
| T5 | Done | `.specs/features/project-foundation/tasks.md:157`, `.specs/features/project-foundation/tasks.md:159` |
| T6 | Done | `.specs/features/project-foundation/tasks.md:183`, `.specs/features/project-foundation/tasks.md:185` |
| T7 | Done | `.specs/features/project-foundation/tasks.md:209`, `.specs/features/project-foundation/tasks.md:211` |
| T8 | Done | `.specs/features/project-foundation/tasks.md:235`, `.specs/features/project-foundation/tasks.md:237` |

The eight post-planning commits are present in task order: `046e3d9`, `a044408`,
`12ff7d2`, `26175a7`, `8d2742f`, `036b397`, `70ac500`, and `3f18062`. Each commit
contains its task document plus the matching `spec.md` and `tasks.md` status updates.

## Spec-Anchored Acceptance Criteria

The Test Coverage Matrix assigns `Tests: none` to this documentation layer at
`.specs/features/project-foundation/tasks.md:13`. Therefore, the evidence column
cites the exact documentary contract statement rather than a runtime assertion.

| Criterion | Spec-defined outcome | Documentary evidence | Result |
| --- | --- | --- | --- |
| Product/scope AC1 | The repository identifies CampusMarkt, current maturity, and canonical documentation paths. | `README.md:1`, `README.md:9`, `README.md:21`, `README.md:25`, `README.md:32` | PASS |
| Product/scope AC2 | The vision states target users, Braunschweig focus, value proposition, access model, and local-first strategy. | `docs/product/00-product-vision.md:5`, `docs/product/00-product-vision.md:22`, `docs/product/00-product-vision.md:34`, `docs/product/00-product-vision.md:47`, `docs/product/00-product-vision.md:66`, `docs/product/00-product-vision.md:78` | PASS |
| Product/scope AC3 | The domain model separates current V1 concepts from future concepts. | `docs/product/01-domain-model.md:106`, `docs/product/01-domain-model.md:114`, `docs/product/01-domain-model.md:220`, `docs/product/01-domain-model.md:249` | PASS |
| Product/scope AC4 | MVP scope distinguishes included, deferred, and explicitly excluded capabilities. | `docs/product/02-mvp-scope.md:9`, `docs/product/02-mvp-scope.md:97`, `docs/product/02-mvp-scope.md:115` | PASS |
| Safety/privacy AC1 | Marketplace policy separates prohibited content from legitimate but unsupported content. | `docs/product/03-marketplace-policy.md:30`, `docs/product/03-marketplace-policy.md:32`, `docs/product/03-marketplace-policy.md:75`, `docs/product/03-marketplace-policy.md:77` | PASS |
| Safety/privacy AC2 | Verification is optional, uses a separate institutional address, keeps it private, and does not gate ordinary access. | `docs/product/03-marketplace-policy.md:13`, `docs/product/03-marketplace-policy.md:126`, `docs/product/03-marketplace-policy.md:129`, `docs/product/03-marketplace-policy.md:141`, `docs/product/03-marketplace-policy.md:145` | PASS |
| Safety/privacy AC3 | Visitors may browse; registered users may perform supported marketplace interactions. | `docs/product/03-marketplace-policy.md:11`, `docs/product/03-marketplace-policy.md:12` | PASS |
| Safety/privacy AC4 | V1 uses local pickup and no platform-held funds. | `docs/product/03-marketplace-policy.md:111`, `docs/product/00-product-vision.md:86` | PASS |
| Delivery AC1 | The roadmap orders foundation, private beta, broader beta, PWA, protected payment, and native mobile. | `docs/product/04-roadmap.md:11`, `docs/product/04-roadmap.md:14`, `docs/product/04-roadmap.md:15`, `docs/product/04-roadmap.md:16`, `docs/product/04-roadmap.md:17`, `docs/product/04-roadmap.md:19`, `docs/product/04-roadmap.md:20` | PASS |
| Delivery AC2 | Services, housing, jobs, swap, moving out, meetup spots, protected payment, and handover confirmation are deferred. | `docs/product/05-future-capabilities.md:5`, `docs/product/05-future-capabilities.md:32`, `docs/product/05-future-capabilities.md:58`, `docs/product/05-future-capabilities.md:82`, `docs/product/05-future-capabilities.md:110`, `docs/product/05-future-capabilities.md:191`, `docs/product/05-future-capabilities.md:243`, `docs/product/05-future-capabilities.md:259`, `docs/product/05-future-capabilities.md:274` | PASS |
| Delivery AC3 | QR and numeric codes are representations of one handover mechanism, not separate approvals. | `docs/product/05-future-capabilities.md:191`, `docs/product/05-future-capabilities.md:197`, `docs/product/05-future-capabilities.md:198`, `docs/product/05-future-capabilities.md:200` | PASS |
| Delivery AC4 | A regulated provider controls money movement; CampusMarkt controls marketplace state. | `docs/product/05-future-capabilities.md:114`, `docs/product/05-future-capabilities.md:116` | PASS |
| Agent guidance AC1 | `AGENTS.md` directs agents to product docs, project state, and active feature artifacts. | `AGENTS.md:7`, `AGENTS.md:8`, `AGENTS.md:9`, `AGENTS.md:18`, `AGENTS.md:24` | PASS |
| Agent guidance AC2 | The guide requires spec-first delivery, requirement-linked tests, local-only authority, and process termination. | `AGENTS.md:10`, `AGENTS.md:11`, `AGENTS.md:14`, `AGENTS.md:50`, `AGENTS.md:54` | PASS |

**Spec-anchored result**: 14/14 acceptance criteria match precise spec outcomes.
There are 0 uncovered criteria and 0 spec-precision gaps.

## Edge Cases

| Edge case | Evidence | Result |
| --- | --- | --- |
| Future capability mentions are deferred and cannot authorize speculative implementation. | `docs/product/05-future-capabilities.md:5`, `docs/product/05-future-capabilities.md:7`, `AGENTS.md:38`, `AGENTS.md:40` | PASS |
| An approved feature spec overrides a conflicting general product document and creates a reconciliation task. | `AGENTS.md:26` | PASS |
| Verification expiry removes only the badge, not ordinary account access. | `docs/product/01-domain-model.md:89`, `docs/product/03-marketplace-policy.md:145` | PASS |
| Provider-specific payment behavior remains unspecified without an approved provider. | `docs/product/05-future-capabilities.md:176`, `docs/product/05-future-capabilities.md:178`, `.specs/STATE.md:32` | PASS |

**Edge-case result**: 4/4 handled.

## Gate Results

| Check | Result | Detail |
| --- | --- | --- |
| Build gate: `git diff --check` | PASS | Exit 0, no output. |
| Feature-diff whitespace audit: `git diff --check 99c978b..HEAD` | FAIL | Four trailing-whitespace findings: `.specs/features/project-foundation/context.md:3`, `.specs/features/project-foundation/context.md:4`, `.specs/features/project-foundation/design.md:3`, `.specs/features/project-foundation/tasks.md:7`. |
| `validate_spec.py` | PASS | 0 errors, 0 warnings. |
| `validate_tasks.py` | PASS | 0 errors. Eight warnings correspond exactly to the eight intentional `Tests: none` entries confirmed by the Test Coverage Matrix. |
| Closing `validate_state.py project-foundation` | PASS | 0 errors. This structural result does not override the independent verifier's FAIL verdict or the ranked gaps below. |
| Required-document integrity | PASS | 8/8 files exist and are non-empty. |
| Relative Markdown links | PASS | 20 checked, 0 broken. |

There is no runtime test framework or runtime code in this feature. Test count before:
0. Test count after: 0. Delta: 0. Failed: 0. Skipped: 0. The absence of tests is
explicitly authorized for documentation by `.specs/features/project-foundation/tasks.md:13`.

The bare build command passes only because all task changes are committed. The
feature-range audit exposes whitespace already committed within the validated diff.
That violates the explicit Markdown whitespace success criterion at
`.specs/features/project-foundation/spec.md:136`.

## Discrimination Sensor

The sensor used a detached temporary worktree at `3f18062`; it never modified the
real tree and did not use `git stash`.

| Mutation | Scratch file | Integrity assertion | Result |
| --- | --- | --- | --- |
| Break the Product Vision relative link in README. | `README.md:25` | Required-file/link checker must reject unresolved relative links. | KILLED: checker exited 1 and named the broken target. |
| Remove the global statement that all future capabilities are deferred. | `docs/product/05-future-capabilities.md:5` | Scope-contract check must require the deferred-capability statement. | KILLED: checker exited 1 and named the missing scope phrase. |

**Sensor depth**: lightweight, 2 targeted contract mutations.
**Sensor result**: 2/2 killed, 0 survived, PASS.

The scratch worktree was removed. Real-tree `git status --porcelain=v1` was empty
before the sensor and empty after cleanup, so isolation is proven.

## Document Quality

| Principle | Result | Evidence |
| --- | --- | --- |
| No features beyond the approved foundation | PASS | The diff contains planning artifacts and the eight required documents only; no runtime files exist. |
| No speculative implementation | PASS | `docs/product/05-future-capabilities.md:7`, `docs/product/01-domain-model.md:249` |
| Surgical, task-aligned commits | PASS | Eight post-planning commits map one-to-one to T1-T8. |
| Existing style and source-of-truth structure | PASS | `README.md:21`, `AGENTS.md:18`, `.specs/STATE.md:3` |
| Spec-anchored outcomes | PASS | 14/14 acceptance criteria and 4/4 edge cases have documentary evidence. |
| Test mapping and per-layer coverage | PASS | Documentation is assigned no tests by `.specs/features/project-foundation/tasks.md:13`; integrity, validators, and sensor cover the layer contract. |
| Whitespace hygiene | FAIL | The feature-diff audit reports four trailing-whitespace findings. |
| Handoff accuracy | FAIL | `README.md:32` calls `.specs/STATE.md` the latest handoff, but `.specs/STATE.md:48`, `.specs/STATE.md:49`, `.specs/STATE.md:51`, and `.specs/STATE.md:53` still describe pre-execution state. |
| Documented project guidelines | PASS | `AGENTS.md:5` through `AGENTS.md:14` were followed for verification scope and local-only authority. |
| Senior-review readiness | FAIL | Whitespace integrity and the stale handoff require correction before readiness. |

## Requirement Traceability Proposal

The requirement outcomes have evidence, but statuses should not be promoted while the
feature-level integrity and handoff gaps remain.

| Requirement | Current status | Proposed status after fixes and re-verification |
| --- | --- | --- |
| PFND-01 | Implementing | Verified |
| PFND-02 | Implementing | Verified |
| PFND-03 | Implementing | Verified |
| PFND-04 | Implementing | Verified |
| PFND-05 | Implementing | Verified |
| PFND-06 | Implementing | Verified |
| PFND-07 | Implementing | Verified |
| PFND-08 | Implementing | Verified |

Current traceability rows are at `.specs/features/project-foundation/spec.md:120`
through `.specs/features/project-foundation/spec.md:127`.

## Ranked Gaps and Fix Plans

### 1. Feature diff fails whitespace integrity

- **Severity**: Major. It directly fails `.specs/features/project-foundation/spec.md:136`.
- **Evidence**: `.specs/features/project-foundation/context.md:3`, `.specs/features/project-foundation/context.md:4`, `.specs/features/project-foundation/design.md:3`, `.specs/features/project-foundation/tasks.md:7`.
- **Root cause**: Markdown hard-line-break spaces were committed while the gate was run against an already clean working tree rather than the full feature diff.
- **Fix task**: Remove or replace the four trailing-space line breaks, then run both `git diff --check` and `git diff --check 99c978b..HEAD` before re-verification.
- **Done when**: Both commands exit 0 and return no findings.

### 2. Project handoff is stale

- **Severity**: Major. It makes the repository's advertised latest handoff inaccurate and fails the story-level independent test for identifying the next SDD action.
- **Evidence**: `README.md:32`, `.specs/STATE.md:48`, `.specs/STATE.md:49`, `.specs/STATE.md:51`, `.specs/STATE.md:53`.
- **Root cause**: Task completion was recorded in feature artifacts, but the project handoff was not reconciled after execution.
- **Fix task**: Update `.specs/STATE.md` to the actual validation state, completed tasks, current next action, blockers, and uncommitted files; then verify it against git and `tasks.md`.
- **Done when**: The handoff matches current git evidence and points to fix/re-verification rather than T1.

## Summary

**Overall**: NOT READY

- Acceptance criteria: 14/14 matched.
- Edge cases: 4/4 handled.
- Required documents: 8/8 non-empty.
- Relative links: 20/20 resolved.
- Structural validators: 2/2 passed with no errors.
- Runtime tests: none by approved matrix.
- Discrimination sensor: 2/2 mutations killed.
- Blocking gaps: committed whitespace integrity and stale project handoff.

After both gaps are fixed, rerun the full gate, repeat independent verification, and
only then promote PFND-01 through PFND-08 to Verified.
