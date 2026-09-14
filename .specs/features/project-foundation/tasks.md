# Project Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: activate it by name and follow its Execute flow and Critical Rules. If the skill cannot be activated, stop and tell the user.

**Design:** `.specs/features/project-foundation/design.md`
**Status:** Done

## Test Coverage Matrix

> Generated from `AGENTS.md`, the project foundation spec, and the empty repository. Guidelines found: the workspace instruction to close terminal processes; no existing test framework. Strong documentation defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Documentation and agent guidance | none | Each task meets its requirement-linked content checklist; final gate verifies required files are non-empty. | `*.md`, `docs/product/*.md` | Build gate only |
| TLC specification artifacts | none | Skill validators report zero errors. | `.specs/**/*.md` | Full gate |

## Gate Check Commands

> Generated from the current documentation-only repository and the TLC validators.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Documentation edit checkpoint | `git diff --check` |
| Build | After each documentation task | `git diff --check` |
| Full | After T8 and validation fixes | `git diff --check 99c978b`; run `validate_spec.py` and `validate_tasks.py`; verify the eight required Markdown files exist and are non-empty |

## Execution Plan

Phases run sequentially, and tasks within each phase run in order.

### Phase 1: Repository Navigation

```text
T1 -> T2
```

### Phase 2: Product Source of Truth

```text
T3 -> T4 -> T5 -> T6 -> T7
```

### Phase 3: Deferred Capability Boundary

```text
T8
```

### Phase 4: Validation Fixes

```text
T9 -> T10
```

## Task Breakdown

### T1: Populate the agent navigation guide

**Status**: Complete

**What**: Replace the empty agent file with a concise source-of-truth map and execution constraints.
**Where**: `AGENTS.md`
**Depends on**: None
**Reuses**: Workspace terminal-lifecycle instruction
**Requirement**: PFND-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Product docs, `.specs/STATE.md`, and active feature artifacts are linked.
- [x] Current V1 and deferred scope rules are explicit.
- [x] Spec-first, test traceability, local-only authority, and terminal shutdown rules are explicit.
- [x] Build gate passes with zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: build
**Commit**: `docs(agents): add repository navigation guide`

### T2: Expand the repository entry point

**Status**: Complete

**What**: Turn the one-line README into the product and documentation entry point.
**Where**: `README.md`
**Depends on**: T1
**Reuses**: Existing CampusMarkt title
**Requirement**: PFND-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Purpose, current status, scope, target architecture, and SDD workflow are stated.
- [x] Every product document and the foundation feature are linked.
- [x] The README does not claim that application code already exists.
- [x] Build gate passes with zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: build
**Commit**: `docs(readme): add project entry point`

### T3: Define the product vision

**Status**: Complete

**What**: Populate the vision document with audience, problem, positioning, access, principles, and success signals.
**Where**: `docs/product/00-product-vision.md`
**Depends on**: None
**Reuses**: Confirmed planning conversation
**Requirement**: PFND-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] CampusMarkt, Braunschweig, web-first, local pickup, and optional verification are defined.
- [x] The value proposition and initial launch audience are explicit.
- [x] Product principles and measurable launch hypotheses are present.
- [x] Build gate passes with zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: build
**Commit**: `docs(product): define product vision`

### T4: Define the domain model

**Status**: Complete

**What**: Populate the domain glossary, ownership boundaries, and current-versus-future state models.
**Where**: `docs/product/01-domain-model.md`
**Depends on**: T3
**Reuses**: Confirmed entities and state discussions
**Requirement**: PFND-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase-postgres-best-practices`

**Done when**:

- [x] Users, verification, listings, offers, reservations, transactions, conversations, favorites, reports, and moderation are defined.
- [x] V1 states are separated from future payment and handover states.
- [x] Persistence rules call for constraints, foreign-key indexes, RLS, exact money, and timezone-aware timestamps only when implemented.
- [x] Build gate passes with zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: build
**Commit**: `docs(domain): define marketplace model`

### T5: Bound the MVP

**Status**: Complete

**What**: Define included, deferred, and excluded V1 capabilities and the first feature sequence.
**Where**: `docs/product/02-mvp-scope.md`
**Depends on**: T4
**Reuses**: Confirmed MVP table and no-scope-expansion rules
**Requirement**: PFND-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] V1 includes responsive web, identity, goods listings, discovery, structured negotiation, chat, favorites, verification, reports, and basic moderation.
- [x] Protected payment, shipping, SWAP, future verticals, meetup spots, and native mobile are deferred.
- [x] Auctions, ads, subscriptions, AI recommendations, and national expansion are excluded.
- [x] Build gate passes with zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: build
**Commit**: `docs(scope): define marketplace v1`

### T6: Establish marketplace policy

**Status**: Complete

**What**: Define participant rules, prohibited content, unsupported content, privacy, reporting, and local-meeting guidance.
**Where**: `docs/product/03-marketplace-policy.md`
**Depends on**: T5
**Reuses**: Confirmed safety and policy decisions
**Requirement**: PFND-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Prohibited and unsupported classifications are separate and unambiguous.
- [x] Account, university-email, messaging, and location privacy boundaries are explicit.
- [x] Safe local pickup and report/moderation expectations are explicit.
- [x] Build gate passes with zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: build
**Commit**: `docs(policy): establish marketplace rules`

### T7: Define the delivery roadmap

**Status**: Complete

**What**: Order product foundation, MVP slices, beta stages, PWA, protected payments, and mobile expansion.
**Where**: `docs/product/04-roadmap.md`
**Depends on**: T6
**Reuses**: Confirmed phase order and launch strategy
**Requirement**: PFND-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Each horizon has outcomes, entry evidence, and explicit non-goals.
- [x] TU Braunschweig private beta precedes wider Braunschweig expansion.
- [x] Protected payment and native mobile require evidence from the web marketplace.
- [x] Build gate passes with zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: build
**Commit**: `docs(roadmap): sequence product delivery`

### T8: Define future capability contracts

**Status**: Complete

**What**: Document deferred verticals and flows with boundaries, prerequisites, and non-implementation rules.
**Where**: `docs/product/05-future-capabilities.md`
**Depends on**: None
**Reuses**: Confirmed future product decisions
**Requirement**: PFND-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] SERVICES, HOUSING, JOBS, SWAP, MOVING_OUT, MEETUP_SPOTS, PROTECTED_PAYMENT, and native mobile are documented as deferred.
- [x] Payment-provider and CampusMarkt ownership are separated.
- [x] QR and numeric confirmation share one future handover-token model, with disputes acknowledged.
- [x] Full gate passes with zero errors and all required files are non-empty.

**Tests**: none - documentation layer matches the matrix
**Gate**: full
**Commit**: `docs(future): define deferred capabilities`

### T9: Remove feature-range whitespace defects

**Status**: Complete

**What**: Remove the four trailing-space Markdown line breaks identified by the independent verifier.
**Where**: `.specs/features/project-foundation/context.md`, `.specs/features/project-foundation/design.md`, `.specs/features/project-foundation/tasks.md`
**Depends on**: None
**Reuses**: Independent validation evidence at `.specs/features/project-foundation/validation.md:72`
**Requirement**: PFND-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Trailing whitespace is removed without changing prose meaning.
- [x] `git diff --check 99c978b` exits zero against the complete feature surface including the working fix.
- [x] Spec and task validators still report zero errors.

**Tests**: none - documentation layer matches the matrix
**Gate**: full
**Commit**: `style(sdd): remove markdown trailing whitespace`

### T10: Reconcile the project handoff

**Status**: Ready

**What**: Replace only the `.specs/STATE.md` handoff body with the actual post-fix state and next action.
**Where**: `.specs/STATE.md`
**Depends on**: T9
**Reuses**: Git history, task completion state, and independent validation evidence
**Requirement**: PFND-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] The handoff records T1-T10 complete and the correct branch.
- [ ] The handoff points to independent re-verification as the next action.
- [ ] The handoff matches Git status and task evidence at commit time.
- [ ] Full gate passes with zero errors.

**Tests**: none - TLC state documentation matches the matrix
**Gate**: full
**Commit**: `docs(sdd): reconcile project foundation handoff`

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4

Phase 1: T1 -> T2
Phase 2: T3 -> T4 -> T5 -> T6 -> T7
Phase 3: T8
Phase 4: T9 -> T10
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | One agent guide | Granular |
| T2 | One README | Granular |
| T3 | One vision document | Granular |
| T4 | One domain document | Granular |
| T5 | One scope document | Granular |
| T6 | One policy document | Granular |
| T7 | One roadmap document | Granular |
| T8 | One future-capabilities document | Granular |
| T9 | One mechanical whitespace repair set | Granular exception: three planning artifacts share one gate defect |
| T10 | One handoff section | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase start | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | None | Phase start | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | None | Phase start | Match |
| T9 | None | Phase start | Match |
| T10 | T9 | T9 -> T10 | Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Documentation | none | none | OK |
| T2 | Documentation | none | none | OK |
| T3 | Documentation | none | none | OK |
| T4 | Documentation | none | none | OK |
| T5 | Documentation | none | none | OK |
| T6 | Documentation | none | none | OK |
| T7 | Documentation | none | none | OK |
| T8 | Documentation | none | none | OK |
| T9 | Documentation | none | none | OK |
| T10 | TLC state documentation | none | none | OK |
