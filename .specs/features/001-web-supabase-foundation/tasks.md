# Web and Supabase Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: activate it by name and follow its Execute flow and Critical Rules. If the skill cannot be activated, stop and tell the user.

**Design:** `.specs/features/001-web-supabase-foundation/design.md`
**Status:** Verification fixes in progress (iteration 3 of 3)

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

### Phase 4: Independent Verification Repairs

```text
T17 -> T18 -> T19 -> T20
```

### Phase 5: Reverification Repairs

```text
T21 -> T22 -> T23 -> T24
```

### Phase 6: Final Sensor Repairs

```text
T25 -> T26
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

- [x] The package defines transport data without framework or provider imports.
- [x] A typed liveness/readiness response contract is exported publicly.
- [x] Unit tests prove valid contract construction.
- [x] Quick gate passes with zero errors and at least 1 package test passes.

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

- [x] The package depends only on approved public workspace contracts.
- [x] No Next.js server or Supabase secret dependency enters the client contract.
- [x] Unit tests cover healthy and non-ready response parsing.
- [x] Quick gate passes with zero errors and at least 2 package tests pass.

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

- [x] Allowed imports across public entry points pass.
- [x] Forbidden domain-to-framework, presentation-to-infrastructure, and private deep imports fail with named diagnostics.
- [x] Tests use scratch fixtures and never leave repository changes behind.
- [x] Quick gate passes with zero errors and at least 4 architecture tests pass.

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

- [x] `.supabase-version` records `self-hosted/v0.8.1` and the imported files match that tag.
- [x] Upstream container images use immutable tags or digests supplied by the release.
- [x] Data directories and generated secrets are ignored while safe examples remain tracked.
- [x] Build gate passes with zero errors and version-provenance verification passes.

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

- [x] Rendered Compose contains the web, gateway, PostgreSQL, Auth, REST, Realtime, Storage, migration, and required support services.
- [x] PostgreSQL and internal service ports are not publicly bound.
- [x] Named volumes preserve database and local Storage data.
- [x] Missing required environment values fail rendered/startup validation with variable names.
- [x] Integration gate passes with at least 8 Compose topology assertions.

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

- [x] Local routes forward only documented web and API paths.
- [x] Production mode requires hostnames and valid HTTPS configuration.
- [x] Studio and all internal service endpoints remain private by default.
- [x] Integration tests reject a public PostgreSQL or Studio binding.
- [x] Integration gate passes with at least 6 ingress assertions.

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

- [x] Local validation accepts generated development values without production providers.
- [x] Production validation requires TLS, SMTP, S3-compatible Storage, backup target, 4 CPU cores, 8 GB RAM, and 80 GB disk.
- [x] Failures list missing variable or resource names but never values.
- [x] Unit tests cover valid modes and every failure branch.
- [x] Quick gate passes with at least 12 validator tests.

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

- [x] A clean database applies the canary migration once and records its history.
- [x] The canary table enables RLS and denies `anon` and `authenticated` access without policies.
- [x] A deliberately invalid scratch migration exits non-zero without false readiness.
- [x] Database checks report no unhandled security or performance finding.
- [x] Database gate passes with at least 6 database assertions.

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

- [x] Liveness succeeds independently and readiness returns 503 when Supabase is unavailable.
- [x] Healthy startup serves the shell and documented Supabase APIs through ingress.
- [x] Fixture database and Storage data survive a normal stop/start without volume deletion.
- [x] Unhealthy services and migration failures prevent ready status with bounded diagnostics.
- [x] Stack gate passes with at least 8 integration assertions.

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

- [x] Publishable browser values and safe placeholders are allowed.
- [x] Secret/service keys, database passwords, SMTP passwords, TLS keys, and Storage secrets are rejected.
- [x] Diagnostics identify file and rule without printing credential contents.
- [x] Scratch detection tests leave the real working tree unchanged.
- [x] Quick gate passes with at least 8 scanner tests.

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

- [x] Backup writes database and Storage artifacts outside primary volumes with SHA-256 manifest entries.
- [x] No success manifest is emitted after database, Storage, or destination failure.
- [x] Restore refuses the active environment and accepts only an isolated target.
- [x] An isolated round-trip restores the canary row and Storage object with matching checksums.
- [x] Operations gate passes with at least 7 integration assertions.

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

- [x] A clean-machine local path uses one root Compose startup command and documents shutdown without volume deletion.
- [x] Production readiness covers HTTPS, SMTP, S3-compatible Storage, private ports, capacity, and off-host backups.
- [x] Upgrade steps require changelog review, dry run, backup, update, health checks, smoke checks, and restore readiness.
- [x] Every documented command exists and is exercised by a documentation-command test.
- [x] Verify gate passes with zero errors and all expected tests remain present.

**Tests**: none - documentation layer matches the matrix
**Gate**: verify
**Commit**: `docs(operations): close foundation workflow`

### T17: Stabilize cold-stack readiness

**What**: Add a CampusMarkt-owned Storage health override with a bounded cold-start allowance and preserve service diagnostics when startup fails.
**Where**: `infra/compose/`
**Depends on**: T16
**Reuses**: Root Compose topology and stack integration harness
**Requirement**: FOUND-01, FOUND-02

**Tools**:

- MCP: Web for official Docker Compose health-check semantics
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] Storage receives a bounded start period and retry window through a CampusMarkt override without editing vendored Supabase files.
- [x] Failed startup preserves bounded service health/log diagnostics before teardown.
- [x] A cold clean-volume stack startup passes in one gate invocation without a manual retry.
- [x] Full gate passes with zero skipped stack tests.

**Tests**: integration
**Gate**: full
**Commit**: `fix(stack): stabilize cold storage readiness`

### T18: Probe production TLS, SMTP, and Storage dependencies

**What**: Extend production readiness with bounded, credential-redacting probes that validate TLS certificates and SMTP/S3 connectivity while preserving offline local validation.
**Where**: `scripts/config/`
**Depends on**: T17
**Reuses**: Environment validator and production configuration contract
**Requirement**: FOUND-04

**Tools**:

- MCP: Web for official TLS, SMTP, and S3 protocol documentation
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] Local validation remains offline and succeeds without production providers.
- [x] Production probe rejects an invalid or expired TLS certificate and accepts a trusted valid certificate.
- [x] Production probe requires bounded successful SMTP and S3 connectivity before returning production-ready.
- [x] Failure diagnostics name the dependency without printing credentials or response secrets.
- [x] Full gate passes with exact success, timeout, certificate, authentication, and reachability assertions.

**Tests**: integration
**Gate**: full
**Commit**: `fix(config): verify production dependencies`

### T19: Prove database advisor failures block the gate

**What**: Add an isolated known database policy/advisor violation and assert the configured database gate exits non-zero with the finding before cleanup.
**Where**: `supabase/tests/`
**Depends on**: T18
**Reuses**: Foundation database harness and the same advisor command used by `npm run test:db`
**Requirement**: FOUND-03

**Tools**:

- MCP: Web for current official Supabase advisor documentation
- Skill: `tlc-spec-driven`, `supabase`, `supabase-postgres-best-practices`

**Done when**:

- [x] The test creates the violation only in an isolated database or schema and never changes committed migration history.
- [x] The configured advisor or lint entry point exits non-zero and reports the expected redacted finding.
- [x] Cleanup removes the violation and the clean database gate still passes.
- [x] Full gate passes with both negative and clean advisor paths.

**Tests**: integration
**Gate**: full
**Commit**: `test(database): enforce advisor failure path`

### T20: Prove tracked-secret CLI failure

**What**: Execute the repository secret-scanner CLI inside an isolated Git repository containing a tracked secret and assert its non-zero redacted diagnostic.
**Where**: `scripts/security/`
**Depends on**: T19
**Reuses**: Existing scanner CLI and scratch-repository test helpers
**Requirement**: FOUND-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] A temporary Git repository tracks an environment file containing a generated forbidden credential.
- [x] The same scanner CLI used by the root gate exits non-zero and names the file and detection rule.
- [x] Output does not contain the generated credential value.
- [x] Scratch files are removed and the real repository remains unchanged.
- [x] Verify gate passes with no skips and all security tests retained.

**Tests**: unit
**Gate**: verify
**Commit**: `test(security): prove tracked-secret gate`

### T21: Allocate test ingress ports through Docker

**What**: Replace host free-port prediction with Docker-assigned published ports and discover both mappings before public stack assertions.
**Where**: `tests/integration/stack/`
**Depends on**: T20
**Reuses**: Stack harness and Compose ingress configuration
**Requirement**: FOUND-01, FOUND-02

**Tools**:

- MCP: Web for official Docker Compose port discovery documentation
- Skill: `tlc-spec-driven`

**Done when**:

- [x] The stack asks Docker to allocate HTTP and HTTPS test ports without a close-before-bind race.
- [x] The harness discovers and validates both Docker-published mappings before public requests.
- [x] A clean cold `npm run verify` reaches and passes all stack cases in one invocation.
- [x] Full gate passes with zero skipped stack tests and no leaked test resources.

**Tests**: integration
**Gate**: full
**Commit**: `fix(stack): use docker-assigned test ports`

### T22: Include Storage in public readiness

**What**: Probe Auth and Storage as separately named required dependencies and return 503 while either service is unavailable.
**Where**: `apps/web/src/modules/foundation/`
**Depends on**: T21
**Reuses**: Existing readiness route and stack service-failure harness
**Requirement**: FOUND-01

**Tools**:

- MCP: Web for current Supabase health endpoints when needed
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] Readiness probes both Auth and Storage with bounded requests.
- [x] An unavailable service appears by its stable service identity without exposing internal credentials.
- [x] Public readiness returns 503 while Storage is stopped or unhealthy and returns 200 after recovery.
- [x] Full gate passes with exact Auth and Storage failure/recovery assertions.

**Tests**: integration
**Gate**: full
**Commit**: `fix(health): require storage readiness`

### T23: Enforce production probe classification and CLI exit

**What**: Assert and enforce aggregate not-ready results plus non-zero CLI exits for every TLS, SMTP, and S3 dependency failure.
**Where**: `tests/integration/config/`
**Depends on**: T22
**Reuses**: Production probe harness and root preflight entry point
**Requirement**: FOUND-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] Every dependency failure asserts `ok: false` on the aggregate result.
- [x] The same production probe CLI used by the gate exits non-zero for invalid TLS, SMTP authentication or reachability, and S3 authentication.
- [x] The valid fixture asserts `ok: true` and CLI exit zero.
- [x] Diagnostics remain bounded and redact all generated credentials.
- [x] Full gate kills a scratch mutation that forces `ok: true` despite errors.

**Tests**: integration
**Gate**: full
**Commit**: `test(config): enforce probe exit contract`

### T24: Validate complete S3 SigV4 authentication

**What**: Replace access-key substring acceptance with complete SigV4 verification and a wrong-secret rejection case in the isolated S3 readiness fixture.
**Where**: `tests/integration/config/`
**Depends on**: T23
**Reuses**: Existing signed S3 probe and isolated HTTPS fixture
**Requirement**: FOUND-04

**Tools**:

- MCP: Web for official AWS Signature Version 4 verification rules
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] The fixture independently reconstructs and verifies the complete request signature using the expected secret.
- [x] A correct access key with a wrong secret is rejected and produces `ok: false` plus non-zero CLI status.
- [x] A correctly signed request is accepted and produces `ok: true` plus zero CLI status.
- [x] Signature diagnostics never expose the secret or derived signing key.
- [x] Verify gate passes once from a clean state with no skips and all 22 acceptance criteria covered.

**Tests**: integration
**Gate**: verify
**Commit**: `test(config): verify complete s3 signature`

### T25: Exercise CLI timeout and reachability exits

**What**: Add real production-probe CLI subprocess assertions for TLS timeout and unreachable SMTP, including bounded redacted failures.
**Where**: `tests/integration/config/`
**Depends on**: T24
**Reuses**: Existing hanging TLS fixture, unreachable SMTP fixture, and CLI runner
**Requirement**: FOUND-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] TLS timeout through the real CLI exits non-zero within the configured bound and returns `ok: false`.
- [x] Unreachable SMTP through the real CLI exits non-zero within the configured bound and returns `ok: false`.
- [x] Both diagnostics name the failing dependency without leaking generated credentials or hosts.
- [x] Full gate kills selective mutations that preserve exit zero for either failure class.

**Tests**: integration
**Gate**: full
**Commit**: `test(config): cover cli reachability failures`

### T26: Exercise unreachable and hanging S3 exits

**What**: Add real S3 unreachable and bounded-timeout fixtures with aggregate and CLI exit assertions.
**Where**: `tests/integration/config/`
**Depends on**: T25
**Reuses**: Verified SigV4 fixture and production-probe CLI runner
**Requirement**: FOUND-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `supabase`

**Done when**:

- [x] Unreachable S3 produces `ok: false`, non-zero CLI exit, and a redacted reachability diagnostic.
- [x] A hanging S3 endpoint times out within the configured bound with `ok: false` and non-zero CLI exit.
- [x] A scratch mutation that accepts unreachable S3 is killed by the focused integration suite.
- [x] Verify gate passes once from a clean state with no skips and all sensor gaps closed.

**Tests**: integration
**Gate**: verify
**Commit**: `test(config): cover s3 reachability failures`

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6

Phase 1: T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7
Phase 2: T8 -> T9 -> T10 -> T11 -> T12
Cross-phase: T12 -> T13
Phase 3: T13 -> T14 -> T15 -> T16
Cross-phase: T16 -> T17
Phase 4: T17 -> T18 -> T19 -> T20
Cross-phase: T20 -> T21
Phase 5: T21 -> T22 -> T23 -> T24
Cross-phase: T24 -> T25
Phase 6: T25 -> T26
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
| T17 | One cold-start health repair | Granular |
| T18 | One production dependency probe | Granular |
| T19 | One database advisor negative path | Granular |
| T20 | One scanner CLI negative path | Granular |
| T21 | One Docker port-allocation repair | Granular |
| T22 | One readiness dependency repair | Granular |
| T23 | One production probe exit contract | Granular |
| T24 | One S3 signature verification fixture | Granular |
| T25 | One CLI timeout/reachability coverage repair | Granular |
| T26 | One S3 reachability/timeout coverage repair | Granular |

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
| T17 | T16 | T16 -> T17 | Match |
| T18 | T17 | T17 -> T18 | Match |
| T19 | T18 | T18 -> T19 | Match |
| T20 | T19 | T19 -> T20 | Match |
| T21 | T20 | T20 -> T21 | Match |
| T22 | T21 | T21 -> T22 | Match |
| T23 | T22 | T22 -> T23 | Match |
| T24 | T23 | T23 -> T24 | Match |
| T25 | T24 | T24 -> T25 | Match |
| T26 | T25 | T25 -> T26 | Match |

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
| T17 | Running stack | integration | integration | OK |
| T18 | Environment tooling | integration | integration | OK |
| T19 | Migration and RLS | integration | integration | OK |
| T20 | Security tooling | unit | unit | OK |
| T21 | Running stack | integration | integration | OK |
| T22 | Next.js readiness and running stack | e2e/integration | integration | OK |
| T23 | Environment tooling | integration | integration | OK |
| T24 | Environment tooling | integration | integration | OK |
| T25 | Environment tooling | integration | integration | OK |
| T26 | Environment tooling | integration | integration | OK |
