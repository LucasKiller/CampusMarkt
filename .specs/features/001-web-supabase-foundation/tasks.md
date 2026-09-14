# Web and Supabase Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: activate it by name and follow its Execute flow and Critical Rules. If the skill cannot be activated, stop and tell the user.

**Design:** `.specs/features/001-web-supabase-foundation/design.md`
**Status:** Approved on 2026-09-14

## Test Coverage Matrix

> Generated from `AGENTS.md`, the approved spec and design, and a repository with no application tests. The user approved Vitest, Playwright, SQL/Node integration tests, and strong spec-derived defaults.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain and shared TypeScript packages | unit | Public contracts compile; all branches and applicable acceptance criteria are asserted. | `packages/*/src/**/*.test.ts` | `npm run test:unit` |
| Next.js routes and responsive UI | e2e | Every route in scope has happy and dependency-failure coverage; shell passes both specified viewport widths. | `apps/web/tests/**/*.spec.ts` | `npm run test:e2e` |
| Environment and security tooling | unit | Every required-variable, mode, redaction, capacity, and secret-pattern branch is asserted. | `scripts/**/*.test.ts` | `npm run test:unit` |
| Architecture boundaries | unit | Allowed imports pass and one forbidden import per protected boundary fails with the expected diagnostic. | `tests/architecture/**/*.test.ts` | `npm run test:architecture` |
| Compose and ingress configuration | integration | Rendered config asserts services, private ports, networks, volumes, profiles, pinned images, and health dependencies. | `tests/integration/compose/**/*.test.ts` | `npm run test:integration` |
| Supabase migrations and RLS | integration | Clean apply, history, RLS enabled, denied role access, failed migration, and database advisory behavior are asserted. | `supabase/tests/**/*` | `npm run test:db` |
| Running stack and persistence | integration | Health, ingress, APIs, unhealthy dependency, migration readiness, restart persistence, and bounded diagnostics are asserted. | `tests/integration/stack/**/*.test.ts` | `npm run test:stack` |
| Backup and restore | integration | Success, partial failure, unreachable destination, active-target refusal, manifest checksums, and isolated round-trip are asserted. | `tests/integration/operations/**/*.test.ts` | `npm run test:operations` |
| Static configuration and documentation | none | Structure and formatting are enforced by build and documentation gates. | repository configuration and `docs/operations/*.md` | Build gate only |

## Gate Check Commands

> Commands become available as T1 establishes the root workspace. Infrastructure gates start only after their dependencies exist.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | TypeScript package, script, or architecture task | `npm run typecheck && npm run lint && npm run format:check && npm run test:unit && npm run test:architecture` |
| Full | Compose, database, stack, or operations task | `npm run check && npm run test:integration && npm run test:db && npm run test:stack && npm run test:operations` |
| Build | App/config/docs task or phase completion | `npm run check && npm run build` |
| Verify | Final feature gate | `npm run verify` |

## Execution Plan

Phases run sequentially, and tasks within each phase run in order.

### Phase 1: TypeScript Application Foundation

```text
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7
```

### Phase 2: Self-hosted Platform Foundation

```text
T8 -> T9 -> T10 -> T11 -> T12
```

### Phase 3: Operational Verification

```text
T13 -> T14 -> T15 -> T16
```

## Task Breakdown

### T1: Establish the npm workspace and quality contract

**What**: Create the root npm-workspaces manifest, pinned development toolchain, lockfile, Node 24 contract, and executable root gate scripts.
**Where**: `package.json`
**Depends on**: None
**Reuses**: Approved design Tech Decisions
**Requirement**: FOUND-02

**Tools**:

- MCP: Web for official package documentation only when needed
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Node 24, npm workspaces, exact dependency versions, and one lockfile are present.
- [x] Typecheck, lint, format, unit, architecture, integration, database, stack, operations, build, check, and verify scripts are defined.
- [x] A bootstrap test proves the unit runner executes.
- [x] Build gate passes with zero errors and at least 1 unit test passes.

**Tests**: unit
**Gate**: build
**Commit**: `build(workspace): establish quality contract`

### T2: Scaffold the responsive Next.js shell

**What**: Create the minimal App Router application and responsive bilingual-ready CampusMarkt shell with viewport tests.
**Where**: `apps/web/`
**Depends on**: T1
**Reuses**: Product vision and approved Next.js design
**Requirement**: FOUND-02

**Tools**:

- MCP: Web for current official Next.js documentation
- Skill: `tlc-spec-driven`

**Done when**:

- [x] The root page communicates the product purpose without implementing marketplace features.
- [x] The application production build runs in a Node 24 container-compatible mode.
- [x] Playwright asserts no horizontal overflow at 360 and 1280 CSS pixels.
- [x] Build gate passes with zero errors and 2 viewport tests pass.

**Tests**: e2e
**Gate**: build
**Commit**: `feat(web): add responsive application shell`

### T3: Establish the domain package boundary

**What**: Create the framework-independent domain package with a public boundary marker and compile-time tests.
**Where**: `packages/domain/`
**Depends on**: T2
**Reuses**: AD-003 and workspace conventions from T1
**Requirement**: FOUND-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] The package exposes only its public entry point.
- [x] No Next.js, React, Supabase, presentation, or infrastructure dependency exists.
- [x] Unit tests prove its public contract can be imported.
- [x] Quick gate passes with zero errors and at least 1 package test passes.

**Tests**: unit
**Gate**: quick
**Commit**: `build(domain): establish framework boundary`

### T4: Establish the validation package boundary

**What**: Create the shared validation package and mode-safe public contract with unit tests.
**Where**: `packages/validation/`
**Depends on**: T3
**Reuses**: Workspace and domain boundary conventions
**Requirement**: FOUND-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] The package exposes only validation-safe public exports.
- [x] The package does not depend on Next.js or presentation code.
- [x] Unit tests cover valid and invalid boundary marker inputs.
- [x] Quick gate passes with zero errors and at least 2 package tests pass.

**Tests**: unit
**Gate**: quick
**Commit**: `build(validation): establish shared boundary`

### T5: Establish the transport types package boundary

**What**: Create the transport-only types package with a public health contract and compile-time tests.
**Where**: `packages/types/`
**Depends on**: T4
**Reuses**: Workspace package conventions
**Requirement**: FOUND-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] The package defines transport data without framework or provider imports.
- [ ] A typed liveness/readiness response contract is exported publicly.
- [ ] Unit tests prove valid contract construction.
- [ ] Quick gate passes with zero errors and at least 1 package test passes.

**Tests**: unit
**Gate**: quick
**Commit**: `build(types): establish transport contracts`

### T6: Establish the API client package boundary

**What**: Create a provider-neutral client contract for foundation health endpoints with unit tests.
**Where**: `packages/api-client/`
**Depends on**: T5
**Reuses**: Health transport types from T5
**Requirement**: FOUND-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] The package depends only on approved public workspace contracts.
- [ ] No Next.js server or Supabase secret dependency enters the client contract.
- [ ] Unit tests cover healthy and non-ready response parsing.
- [ ] Quick gate passes with zero errors and at least 2 package tests pass.

**Tests**: unit
**Gate**: quick
**Commit**: `build(api-client): establish health contract`

### T7: Enforce architectural import boundaries

**What**: Add executable lint and mutation-style architecture tests for every approved dependency direction.
**Where**: `tests/architecture/`
**Depends on**: T6
**Reuses**: Package boundaries from T3-T6 and application layout from T2
**Requirement**: FOUND-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Allowed imports across public entry points pass.
- [ ] Forbidden domain-to-framework, presentation-to-infrastructure, and private deep imports fail with named diagnostics.
- [ ] Tests use scratch fixtures and never leave repository changes behind.
- [ ] Quick gate passes with zero errors and at least 4 architecture tests pass.

**Tests**: unit
**Gate**: quick
**Commit**: `test(architecture): enforce module boundaries`

### T8: Vendor the pinned official Supabase distribution

**What**: Import the official `self-hosted/v0.8.1` Docker distribution, record its source revision, and preserve its update scripts without local rewrites.
**Where**: `infra/supabase/`
**Depends on**: None
**Reuses**: Official Supabase self-hosted release
**Requirement**: FOUND-01, FOUND-03, FOUND-04

**Tools**:

- MCP: Web for official Supabase changelog and self-hosting documentation
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] `.supabase-version` records `self-hosted/v0.8.1` and the imported files match that tag.
- [ ] Upstream container images use immutable tags or digests supplied by the release.
- [ ] Data directories and generated secrets are ignored while safe examples remain tracked.
- [ ] Build gate passes with zero errors and version-provenance verification passes.

**Tests**: none - static vendored configuration matches the matrix
**Gate**: build
**Commit**: `build(supabase): vendor self-hosted release`

### T9: Add the root Compose topology

**What**: Integrate the application and pinned Supabase services into one root Compose project with private networks, volumes, health dependencies, and profiles.
**Where**: `compose.yaml`
**Depends on**: T8
**Reuses**: Application from T2 and official Supabase Compose from T8
**Requirement**: FOUND-01, FOUND-04

**Tools**:

- MCP: Web for official Docker Compose documentation when needed
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Rendered Compose contains the web, gateway, PostgreSQL, Auth, REST, Realtime, Storage, migration, and required support services.
- [ ] PostgreSQL and internal service ports are not publicly bound.
- [ ] Named volumes preserve database and local Storage data.
- [ ] Missing required environment values fail rendered/startup validation with variable names.
- [ ] Integration gate passes with at least 8 Compose topology assertions.

**Tests**: integration
**Gate**: full
**Commit**: `build(compose): integrate full stack`

### T10: Add Caddy as the single ingress boundary

**What**: Configure local HTTP and production HTTPS routing for the web application and Supabase gateway without exposing Studio or internal services.
**Where**: `infra/caddy/`
**Depends on**: T9
**Reuses**: Private Compose network and official Supabase gateway
**Requirement**: FOUND-01, FOUND-04

**Tools**:

- MCP: Web for official Caddy documentation
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Local routes forward only documented web and API paths.
- [ ] Production mode requires hostnames and valid HTTPS configuration.
- [ ] Studio and all internal service endpoints remain private by default.
- [ ] Integration tests reject a public PostgreSQL or Studio binding.
- [ ] Integration gate passes with at least 6 ingress assertions.

**Tests**: integration
**Gate**: full
**Commit**: `feat(ingress): add private caddy gateway`

### T11: Implement environment and production preflight validation

**What**: Create a cross-platform validator for local/production variables, secrets separation, host capacity, TLS, SMTP, Storage, and backup readiness.
**Where**: `scripts/config/`
**Depends on**: T10
**Reuses**: Pinned Supabase environment example and shared validation package
**Requirement**: FOUND-01, FOUND-03, FOUND-04

**Tools**:

- MCP: Web for official runtime and Supabase environment documentation
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Local validation accepts generated development values without production providers.
- [ ] Production validation requires TLS, SMTP, S3-compatible Storage, backup target, 4 CPU cores, 8 GB RAM, and 80 GB disk.
- [ ] Failures list missing variable or resource names but never values.
- [ ] Unit tests cover valid modes and every failure branch.
- [ ] Quick gate passes with at least 12 validator tests.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(config): validate deployment readiness`

### T12: Add the private-by-default Supabase migration baseline

**What**: Create the foundation canary migration and SQL verification for history, RLS, grants, role denial, failed migrations, and database advisors.
**Where**: `supabase/`
**Depends on**: T11
**Reuses**: Pinned PostgreSQL and Supabase roles from T8
**Requirement**: FOUND-03

**Tools**:

- MCP: Web for official Supabase migration, RLS, grants, and advisor documentation
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [ ] A clean database applies the canary migration once and records its history.
- [ ] The canary table enables RLS and denies `anon` and `authenticated` access without policies.
- [ ] A deliberately invalid scratch migration exits non-zero without false readiness.
- [ ] Database checks report no unhandled security or performance finding.
- [ ] Database gate passes with at least 6 database assertions.

**Tests**: integration
**Gate**: full
**Commit**: `feat(database): add secure migration baseline`

### T13: Implement application health and stack smoke verification

**What**: Add liveness, dependency-aware readiness, public endpoint smoke, unhealthy-service, and restart-persistence tests.
**Where**: `tests/integration/stack/`
**Depends on**: T12
**Reuses**: Web application, root Compose, ingress, and canary migration
**Requirement**: FOUND-01, FOUND-02, FOUND-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Liveness succeeds independently and readiness returns 503 when Supabase is unavailable.
- [ ] Healthy startup serves the shell and documented Supabase APIs through ingress.
- [ ] Fixture database and Storage data survive a normal stop/start without volume deletion.
- [ ] Unhealthy services and migration failures prevent ready status with bounded diagnostics.
- [ ] Stack gate passes with at least 8 integration assertions.

**Tests**: integration
**Gate**: full
**Commit**: `test(stack): verify health and persistence`

### T14: Implement tracked-file secret scanning

**What**: Add a tracked-file scanner that detects credential patterns, permits inert documented placeholders, and redacts detected values.
**Where**: `scripts/security/`
**Depends on**: T13
**Reuses**: Environment contract from T11 and Git tracked-file inventory
**Requirement**: FOUND-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] Publishable browser values and safe placeholders are allowed.
- [ ] Secret/service keys, database passwords, SMTP passwords, TLS keys, and Storage secrets are rejected.
- [ ] Diagnostics identify file and rule without printing credential contents.
- [ ] Scratch detection tests leave the real working tree unchanged.
- [ ] Quick gate passes with at least 8 scanner tests.

**Tests**: unit
**Gate**: quick
**Commit**: `test(security): prevent tracked credentials`

### T15: Implement backup and isolated restore verification

**What**: Create manifest-based database and Storage backup plus guarded isolated restore with checksum and failure-path tests.
**Where**: `scripts/operations/`
**Depends on**: T14
**Reuses**: Supabase containers, canary fixture, persistent Storage, and environment validator
**Requirement**: FOUND-04

**Tools**:

- MCP: Web for official Supabase backup and PostgreSQL tool documentation
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [ ] Backup writes database and Storage artifacts outside primary volumes with SHA-256 manifest entries.
- [ ] No success manifest is emitted after database, Storage, or destination failure.
- [ ] Restore refuses the active environment and accepts only an isolated target.
- [ ] An isolated round-trip restores the canary row and Storage object with matching checksums.
- [ ] Operations gate passes with at least 7 integration assertions.

**Tests**: integration
**Gate**: full
**Commit**: `feat(operations): verify backup and restore`

### T16: Document and close the full foundation workflow

**What**: Document local startup, production topology, environment preparation, migrations, smoke checks, backups, restores, and pinned upgrades, then connect them to the final verify gate.
**Where**: `docs/operations/`
**Depends on**: T15
**Reuses**: Every executable command and configuration delivered by T1-T15
**Requirement**: FOUND-01, FOUND-02, FOUND-03, FOUND-04

**Tools**:

- MCP: Web for final official Supabase upgrade cross-check
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [ ] A clean-machine local path uses one root Compose startup command and documents shutdown without volume deletion.
- [ ] Production readiness covers HTTPS, SMTP, S3-compatible Storage, private ports, capacity, and off-host backups.
- [ ] Upgrade steps require changelog review, dry run, backup, update, health checks, smoke checks, and restore readiness.
- [ ] Every documented command exists and is exercised by a documentation-command test.
- [ ] Verify gate passes with zero errors and all expected tests remain present.

**Tests**: none - documentation layer matches the matrix
**Gate**: verify
**Commit**: `docs(operations): close foundation workflow`

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3

Phase 1: T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7
Phase 2: T8 -> T9 -> T10 -> T11 -> T12
Cross-phase: T12 -> T13
Phase 3: T13 -> T14 -> T15 -> T16
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | One root workspace contract | Granular |
| T2 | One web shell deliverable | Granular |
| T3 | One domain package | Granular |
| T4 | One validation package | Granular |
| T5 | One types package | Granular |
| T6 | One API-client package | Granular |
| T7 | One architecture-test suite | Granular |
| T8 | One pinned vendor distribution | Granular |
| T9 | One root Compose topology | Granular |
| T10 | One ingress configuration | Granular |
| T11 | One environment validator | Granular |
| T12 | One migration baseline | Granular |
| T13 | One stack verification suite | Granular |
| T14 | One secret scanner | Granular |
| T15 | One backup/restore workflow | Granular |
| T16 | One operations guide set | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase start | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | None | Phase start | Match |
| T9 | T8 | T8 -> T9 | Match |
| T10 | T9 | T9 -> T10 | Match |
| T11 | T10 | T10 -> T11 | Match |
| T12 | T11 | T11 -> T12 | Match |
| T13 | T12 | T12 -> T13 | Match |
| T14 | T13 | T13 -> T14 | Match |
| T15 | T14 | T14 -> T15 | Match |
| T16 | T15 | T15 -> T16 | Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Workspace tooling | unit | unit | OK |
| T2 | Next.js UI | e2e | e2e | OK |
| T3 | Domain package | unit | unit | OK |
| T4 | Validation package | unit | unit | OK |
| T5 | Types package | unit | unit | OK |
| T6 | API client package | unit | unit | OK |
| T7 | Architecture boundaries | unit | unit | OK |
| T8 | Static vendored configuration | none | none | OK |
| T9 | Compose topology | integration | integration | OK |
| T10 | Ingress configuration | integration | integration | OK |
| T11 | Environment tooling | unit | unit | OK |
| T12 | Migration and RLS | integration | integration | OK |
| T13 | Running stack | integration | integration | OK |
| T14 | Security tooling | unit | unit | OK |
| T15 | Backup and restore | integration | integration | OK |
| T16 | Documentation | none | none | OK |
