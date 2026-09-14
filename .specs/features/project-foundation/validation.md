# Project Foundation Validation

**Verdict**: FAIL
**Result**: FAIL
**Date**: 2026-09-14
**Spec**: `.specs/features/project-foundation/spec.md`
**Diff range**: `99c978b..HEAD` (`HEAD` = `8f4afe4`)
**Verifier**: independent re-verifier (author != verifier)

The previous whitespace and handoff defects are fixed. The feature is still not ready:
T7 is marked complete without satisfying one of its explicit Done-when conditions, and
the MVP scope and roadmap assign different capabilities to the same numbered features.

## Task Completion

| Task | Status | Evidence |
| --- | --- | --- |
| T1 | Done | `.specs/features/project-foundation/tasks.md:61`; commit `046e3d9` |
| T2 | Done | `.specs/features/project-foundation/tasks.md:87`; commit `a044408` |
| T3 | Done | `.specs/features/project-foundation/tasks.md:113`; commit `12ff7d2` |
| T4 | Done | `.specs/features/project-foundation/tasks.md:139`; commit `26175a7` |
| T5 | Done | `.specs/features/project-foundation/tasks.md:165`; commit `8d2742f` |
| T6 | Done | `.specs/features/project-foundation/tasks.md:191`; commit `036b397` |
| T7 | Done-when gap | Marked complete at `.specs/features/project-foundation/tasks.md:217`, but `.specs/features/project-foundation/tasks.md:232` requires every horizon to have outcome, entry evidence, and explicit non-goals; `docs/product/04-roadmap.md:224` through `docs/product/04-roadmap.md:275` do not provide all three for Horizons 8-11. Commit `70ac500`. |
| T8 | Done | `.specs/features/project-foundation/tasks.md:243`; commit `3f18062` |
| T9 | Done | `.specs/features/project-foundation/tasks.md:269`, `.specs/features/project-foundation/tasks.md:284`; commit `8e88ee3` |
| T10 | Done | `.specs/features/project-foundation/tasks.md:294`, `.specs/features/project-foundation/tasks.md:309`; commit `8f4afe4` |

**Task completion**: 9/10 task outcomes confirmed. T7 is marked Complete but does not meet
its full completion contract.

The task commits are atomic and appear in dependency order. The two fix commits contain
only their declared surfaces: `8e88ee3` removes the four whitespace defects and completes
T9; `8f4afe4` reconciles the handoff and completes T10.

## Spec-Anchored Acceptance Criteria

The approved coverage matrix assigns no runtime tests to this documentation-only layer at
`.specs/features/project-foundation/tasks.md:16`. Evidence therefore cites the exact
documentary statement that realizes each required outcome.

| Criterion | Spec-defined outcome | `file:line` documentary assertion | Result |
| --- | --- | --- | --- |
| Product/scope AC1 | Identify CampusMarkt, current maturity, and canonical documentation paths. | `README.md:1`, `README.md:9`, `README.md:21`, `README.md:25`, `README.md:32` | PASS |
| Product/scope AC2 | State target users, Braunschweig focus, value proposition, access model, and local-first strategy. | `docs/product/00-product-vision.md:5`, `docs/product/00-product-vision.md:9`, `docs/product/00-product-vision.md:34`, `docs/product/00-product-vision.md:47`, `docs/product/00-product-vision.md:66`, `docs/product/00-product-vision.md:78` | PASS |
| Product/scope AC3 | Distinguish current V1 concepts from documented future concepts. | `docs/product/01-domain-model.md:106`, `docs/product/01-domain-model.md:187`, `docs/product/01-domain-model.md:220`, `docs/product/01-domain-model.md:222` | PASS |
| Product/scope AC4 | Distinguish included, deferred, and explicitly excluded capabilities. | `docs/product/02-mvp-scope.md:9`, `docs/product/02-mvp-scope.md:97`, `docs/product/02-mvp-scope.md:115` | PASS |
| Safety/privacy AC1 | Separate prohibited content from legitimate but unsupported content. | `docs/product/03-marketplace-policy.md:30`, `docs/product/03-marketplace-policy.md:32`, `docs/product/03-marketplace-policy.md:75`, `docs/product/03-marketplace-policy.md:77` | PASS |
| Safety/privacy AC2 | Verification is optional, uses a separate institutional address, keeps it private, and does not gate ordinary access. | `docs/product/03-marketplace-policy.md:13`, `docs/product/03-marketplace-policy.md:129`, `docs/product/03-marketplace-policy.md:141`, `docs/product/03-marketplace-policy.md:145` | PASS |
| Safety/privacy AC3 | Visitors browse and registered users perform supported interactions. | `docs/product/03-marketplace-policy.md:11`, `docs/product/03-marketplace-policy.md:12` | PASS |
| Safety/privacy AC4 | V1 provides local-pickup guidance without platform-held funds. | `docs/product/03-marketplace-policy.md:111`, `docs/product/03-marketplace-policy.md:112`, `docs/product/03-marketplace-policy.md:113` | PASS |
| Delivery AC1 | Order foundation, private beta, broader beta, PWA, protected payment, and native mobile. | `docs/product/04-roadmap.md:11`, `docs/product/04-roadmap.md:14`, `docs/product/04-roadmap.md:15`, `docs/product/04-roadmap.md:16`, `docs/product/04-roadmap.md:17`, `docs/product/04-roadmap.md:18`, `docs/product/04-roadmap.md:19` | PASS |
| Delivery AC2 | Describe Moving Out, SWAP, Meetup Spots, protected payment, handover, services, housing, and jobs as deferred. | `docs/product/05-future-capabilities.md:5`, `docs/product/05-future-capabilities.md:32`, `docs/product/05-future-capabilities.md:58`, `docs/product/05-future-capabilities.md:82`, `docs/product/05-future-capabilities.md:110`, `docs/product/05-future-capabilities.md:191`, `docs/product/05-future-capabilities.md:243`, `docs/product/05-future-capabilities.md:259`, `docs/product/05-future-capabilities.md:274` | PASS |
| Delivery AC3 | QR and numeric codes represent one secure handover token. | `docs/product/05-future-capabilities.md:195`, `docs/product/05-future-capabilities.md:197`, `docs/product/05-future-capabilities.md:198`, `docs/product/05-future-capabilities.md:200` | PASS |
| Delivery AC4 | The regulated provider controls money movement while CampusMarkt controls marketplace state. | `docs/product/05-future-capabilities.md:114`, `docs/product/05-future-capabilities.md:116`, `docs/product/05-future-capabilities.md:140` | PASS |
| Agent guidance AC1 | Direct agents to product docs, project state, and active feature artifacts. | `AGENTS.md:7`, `AGENTS.md:8`, `AGENTS.md:9`, `AGENTS.md:18` | PASS |
| Agent guidance AC2 | Require spec-first execution, requirement-linked tests, local-only authority, and process termination. | `AGENTS.md:7`, `AGENTS.md:10`, `AGENTS.md:11`, `AGENTS.md:14`, `AGENTS.md:50`, `AGENTS.md:54` | PASS |

**Spec-anchored check**: 14/14 acceptance criteria match the outcomes written in the
spec. There are 0 uncovered criteria and 0 spec-precision gaps.

## Edge Cases

| Edge case | Evidence | Result |
| --- | --- | --- |
| Future capability mentions are deferred and cannot authorize speculative implementation. | `docs/product/05-future-capabilities.md:5`, `docs/product/05-future-capabilities.md:7`, `AGENTS.md:38`, `AGENTS.md:40` | PASS |
| An approved feature spec overrides a conflicting general product document and creates a reconciliation task. | `AGENTS.md:26` | PASS |
| Verification expiry removes only the badge, not ordinary account access. | `docs/product/01-domain-model.md:89`, `docs/product/03-marketplace-policy.md:145` | PASS |
| Provider-specific payment behavior remains unspecified without an approved provider. | `.specs/features/project-foundation/context.md:52`, `docs/product/05-future-capabilities.md:176`, `docs/product/05-future-capabilities.md:178` | PASS |

**Edge-case check**: 4/4 handled.

## Gate Results

| Check | Result | Detail |
| --- | --- | --- |
| Full whitespace gate: `git diff --check 99c978b` | PASS | Exit 0, no output. This proves the T9 repair over the complete feature range and current tree. |
| `validate_spec.py` | PASS | 0 errors, 0 warnings. |
| `validate_tasks.py` | PASS with warnings | 0 errors, 11 warnings. Ten warnings are the intentional `Tests: none` entries confirmed at `.specs/features/project-foundation/tasks.md:363` through `.specs/features/project-foundation/tasks.md:372`. The remaining T9 multi-file granularity warning is explicitly justified at `.specs/features/project-foundation/tasks.md:341`. |
| Required-document integrity | PASS | 8/8 required repository and product Markdown files exist and are non-empty. |
| Relative Markdown links | PASS | 20/20 relative links in the feature's changed Markdown surface resolve. |
| Closing `validate_state.py project-foundation` | EXPECTED FAIL | Exit 1 with one error because this report's truthful verdict is FAIL; the feature remains incomplete. |

There is no runtime code or runtime test framework. Test count before feature: 0. Test
count after feature: 0. Passed: 0. Failed: 0. Skipped: 0. The approved documentation
coverage model explicitly assigns `none` at `.specs/features/project-foundation/tasks.md:16`
and `.specs/features/project-foundation/tasks.md:17`.

## Discrimination Sensor

The sensor used a detached temporary worktree at commit `8f4afe4`. It did not modify the
real tree and did not use `git stash`.

| Mutation | Scratch file:line | Detection contract | Result |
| --- | --- | --- | --- |
| Break the Product Vision link target. | `README.md:25` | Relative-link integrity checker must reject the unresolved target. | KILLED: checker exited 1 and reported `README.md:25`. |
| Weaken the global future-scope rule from every capability to only some capabilities. | `docs/product/05-future-capabilities.md:5` | Spec-anchored scope checker must require the global deferred-capability contract. | KILLED: checker exited 1 and named the missing contract. |
| Omit T10 from the handoff's completed-task list. | `.specs/STATE.md:49` | Task/state coherence checker must match all Complete task blocks to the handoff list. | KILLED: checker exited 1 and reported the T10 mismatch. |

**Sensor depth**: lightweight, 3 targeted behavior-level mutations.
**Sensor check**: 3/3 killed, 0 survived, PASS.

The worktree was verified as the `8f4afe4` checkout, removed with `git worktree remove
--force`, and pruned. Its path no longer exists. Real-tree `git status --porcelain=v1`
was empty before the sensor and empty after cleanup, so isolation is proven.

## Handoff Reconciliation

Before this report was written, Git was on `main` at `8f4afe4` with empty porcelain.
The handoff names `main` at `.specs/STATE.md:54`, records T1-T10 at
`.specs/STATE.md:49`, and points to independent re-verification at `.specs/STATE.md:51`.
It therefore matches Git and task metadata at the T10 handoff. The T7 outcome gap below
means that the metadata's Complete label is not sufficient evidence of feature completion.

## Code and Document Quality

| Principle | Result | Evidence |
| --- | --- | --- |
| Minimum implementation and no scope creep | PASS | The diff contains governance, product knowledge, validation evidence, and no runtime code. |
| Surgical, task-aligned changes | PASS | T1-T10 have atomic commits; T9 and T10 touch only their declared files. |
| No speculative implementation | PASS | `docs/product/05-future-capabilities.md:7`, `docs/product/01-domain-model.md:218` |
| Matches repository patterns | PASS | `README.md:21`, `AGENTS.md:18`, `.specs/STATE.md:3` |
| Spec-anchored outcomes | PASS | 14/14 ACs and 4/4 listed edge cases have exact documentary evidence. |
| Per-layer coverage expectation | PASS | Documentation has no runtime-test requirement; deterministic integrity checks and a 3/3 sensor cover the approved layer contract. |
| Every check maps to an AC, edge case, or Done-when criterion | PASS | Link/required-file checks map to Product/scope AC1 and success criteria; scope and state checks map to Delivery AC2 and T10. |
| T7 completion evidence | FAIL | `.specs/features/project-foundation/tasks.md:232` is stricter than the horizon content at `docs/product/04-roadmap.md:224` through `docs/product/04-roadmap.md:275`. |
| Canonical source-of-truth consistency | FAIL | `docs/product/02-mvp-scope.md:131` declares each numbered row a feature, but `docs/product/02-mvp-scope.md:136` through `docs/product/02-mvp-scope.md:147` conflict with `docs/product/04-roadmap.md:75` through `docs/product/04-roadmap.md:77` and `docs/product/04-roadmap.md:101` through `docs/product/04-roadmap.md:105`. |
| Documented project guidelines followed | PASS | Verification followed the reading order and local-only authority in `AGENTS.md:5` through `AGENTS.md:14`; all test processes terminated per `AGENTS.md:52`. |
| Senior-review readiness | FAIL | The task completion and canonical-sequence contradictions require reconciliation. |

## Requirement Traceability

No requirement is promoted while the feature verdict is FAIL. Current rows remain at
`.specs/features/project-foundation/spec.md:120` through
`.specs/features/project-foundation/spec.md:127`.

| Requirement | Current status | Validation result |
| --- | --- | --- |
| PFND-01 | Implementing | Acceptance criteria pass; hold pending feature-level fixes. |
| PFND-02 | Implementing | Acceptance criteria pass; hold pending feature-level fixes. |
| PFND-03 | Implementing | Acceptance criteria pass; hold pending feature-level fixes. |
| PFND-04 | Implementing | Acceptance criteria pass; canonical feature-sequence conflict needs repair. |
| PFND-05 | Implementing | Acceptance criteria pass; hold pending feature-level fixes. |
| PFND-06 | Implementing | Acceptance criteria pass; T7 completion contract and roadmap sequence need repair. |
| PFND-07 | Implementing | Acceptance criteria pass; hold pending feature-level fixes. |
| PFND-08 | Implementing | Acceptance criteria pass; hold pending feature-level fixes. |

## Ranked Gaps and Fix Plans

### 1. T7 is marked complete without meeting its Done-when contract

- **Severity**: Major.
- **Evidence**: `.specs/features/project-foundation/tasks.md:217` marks T7 Complete and
  `.specs/features/project-foundation/tasks.md:232` requires outcome, entry evidence, and
  explicit non-goals for every horizon. Horizons 8-11 at
  `docs/product/04-roadmap.md:224` through `docs/product/04-roadmap.md:275` omit one or
  more of those required elements; Horizon 10 has an outcome and sequence but no entry
  evidence or explicit non-goals.
- **Root cause**: T7's content review checked the broad roadmap ordering but did not check
  every horizon against each conjunct in the Done-when statement.
- **Fix task**: Add explicit entry evidence and non-goals wherever missing so every horizon
  satisfies the existing T7 contract. Do not weaken the completed task's criterion.
- **Done when**: A horizon-by-horizon matrix demonstrates outcome, entry evidence, and
  explicit non-goals for Horizons 0-11, with exact `file:line` evidence.

### 2. The two canonical feature sequences assign different meanings to the same IDs

- **Severity**: Major.
- **Evidence**: `docs/product/02-mvp-scope.md:131` says each numbered row is a separate TLC
  feature. In that table, `003` is University verification and `004` is Listing creation at
  `docs/product/02-mvp-scope.md:137` and `docs/product/02-mvp-scope.md:138`. In the roadmap,
  `003` is Public profiles, `004` is University verification, and listing creation begins at
  `005`, at `docs/product/04-roadmap.md:75` through `docs/product/04-roadmap.md:77` and
  `docs/product/04-roadmap.md:101`.
- **Root cause**: The roadmap split profile and media work into separate features without
  reconciling the authoritative V1 sequence in the MVP scope.
- **Fix task**: Choose one numbered feature decomposition and reconcile both product
  documents, preserving their current capability boundaries and change-control rules.
- **Done when**: Every shared numeric ID names the same feature in both documents, no
  capability disappears, and the relative-link plus feature-range gates still pass.

## Summary

**Overall**: NOT READY

- Spec-anchored acceptance criteria: 14/14 matched.
- Edge cases: 4/4 handled.
- Structural validators: 0 errors.
- Required files: 8/8 non-empty.
- Relative links: 20/20 resolved.
- Discrimination sensor: 3/3 mutations killed.
- Previous verifier gaps: 2/2 fixed.
- New blocking gaps: 2 Major.

Fix T7's missing horizon evidence and reconcile the numbered feature sequences, then run a
fresh independent verification before promoting PFND-01 through PFND-08.
