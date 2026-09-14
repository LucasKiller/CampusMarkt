# Web and Supabase Foundation Specification

**Status:** Approved on 2026-09-14

## Problem Statement

CampusMarkt has product rules but no executable application foundation. The first delivery must establish a reproducible TypeScript web and server environment plus a self-hosted Supabase foundation without prematurely implementing marketplace behavior.

## Goals

- [ ] Start the complete local foundation through one documented Docker Compose workflow.
- [ ] Provide a responsive Next.js application with explicit UI, application, and domain boundaries.
- [ ] Provide a self-hosted Supabase foundation for PostgreSQL, Auth, Storage, and Realtime.
- [ ] Establish deterministic quality, security, migration, backup, and environment contracts for later features.

## Out of Scope

| Feature | Reason |
| --- | --- |
| User registration and account recovery journeys | Delivered by feature 002. |
| University verification | Delivered by feature 003. |
| Listings, feed, search, favorites, offers, messaging, and moderation | Each has its own V1 feature. |
| Production VPS deployment | This feature produces a deployable contract; modifying the remote VPS requires separate authorization. |
| Managed Supabase project | The approved production direction is self-hosting. |
| PWA and native mobile applications | Deferred beyond V1. |
| High availability and multi-node orchestration | A single-VPS MVP does not require it. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Application architecture | TypeScript modular monolith with Next.js hosting UI and server-side application code | Minimizes operational and contract duplication while retaining internal boundaries. | yes |
| Infrastructure topology | One root Docker Compose workflow coordinates the application, reverse proxy, and self-hosted Supabase services | The user explicitly requested one-command orchestration suitable for a VPS. | yes |
| Deployment target | One Linux VPS with at least 4 CPU cores, 8 GB RAM, and 80 GB SSD recommended | Matches the current official recommendation for the full self-hosted Supabase stack. | yes |
| Public ingress | Only the reverse proxy exposes HTTP/HTTPS; data services remain on private Docker networks | Reduces the exposed attack surface and centralizes TLS. | no, safe security default |
| Local TLS | Local development uses HTTP on loopback; production contract requires valid HTTPS | Avoids local certificate friction while preserving the production security boundary. | no, safe default |
| Persistent data | PostgreSQL and local Storage use named persistent volumes in development | Reproducible local persistence without embedding host-specific paths. | no, implementation default |
| Production media durability | The contract supports an external S3-compatible Storage backend; provider selection and credentials remain deployment configuration | VPS-local media alone is not an adequate durability strategy. | no, safe operations default |
| Backups | Provide a documented, testable backup and restore procedure whose artifacts leave the primary VPS | A Docker volume is persistence, not disaster recovery. | no, safe operations default |
| Email delivery | Production auth email uses configurable external SMTP; no provider is selected in this feature | Supabase self-hosting requires production-ready outbound email without provider lock-in. | no, safe operations default |
| Versioning | Runtime, package, and container versions are pinned; upgrades are deliberate | Prevents unreviewed incompatibility across the multi-service stack. | no, reproducibility default |
| Exact visual design | A minimal bilingual-ready responsive shell and health/status surface | Product visuals belong to later user-facing feature specifications. | no, scope-preserving default |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Reproducible full-stack startup ⭐ MVP

**User Story**: As a developer, I want one documented command to start the application and required platform services so that I can reproduce the CampusMarkt environment locally and on a compatible VPS.

**Why P1**: Every later feature depends on a deterministic runtime foundation.

**Acceptance Criteria**:

1. WHEN an operator supplies the documented required environment values and starts the root Compose project THEN the system SHALL start the web application, reverse proxy, PostgreSQL, Auth, REST API, Realtime, Storage, and required Supabase gateway services with healthy container states.
2. WHEN all required services are healthy THEN the system SHALL serve the CampusMarkt web shell and expose Supabase APIs through their documented ingress routes.
3. IF a required environment value is absent THEN the system SHALL fail startup validation before presenting the stack as healthy and identify the missing variable by name.
4. IF the stack is stopped without deleting volumes THEN the system SHALL retain PostgreSQL and local Storage data for the next startup.
5. The system SHALL keep PostgreSQL and internal Supabase service ports inaccessible through the VPS public interface.

**Independent Test**: Start the stack from a clean documented environment, assert service health and ingress responses, persist fixture data, restart without volume deletion, and assert the fixture remains.

### P1: Typed modular application foundation ⭐ MVP

**User Story**: As a contributor, I want enforced TypeScript module boundaries and repeatable quality commands so that later features do not couple marketplace rules to page components.

**Why P1**: The web-first product must remain evolvable toward a future mobile client.

**Acceptance Criteria**:

1. WHEN the repository dependencies are installed from its lockfile THEN the system SHALL provide documented commands for type checking, linting, unit testing, integration testing, building, and formatting verification.
2. WHEN the full quality gate runs on the foundation THEN the system SHALL complete with zero type, lint, test, build, or formatting errors.
3. The system SHALL place route and presentation code, server-side application code, framework-independent domain code, shared validation, and transport contracts behind explicit import boundaries.
4. IF presentation code imports a prohibited internal module across an architectural boundary THEN the lint or architecture-test gate SHALL fail and identify the violating import.
5. WHEN the web shell is viewed at 360 CSS pixels and at 1280 CSS pixels wide THEN the system SHALL render without horizontal page overflow.

**Independent Test**: Run every documented quality command, inject one forbidden import in a scratch copy to prove the boundary gate rejects it, and render the shell at both required viewport widths.

### P1: Safe Supabase baseline ⭐ MVP

**User Story**: As a future feature developer, I want migration, access-control, and secrets conventions established so that identity and marketplace data start from a secure baseline.

**Why P1**: Retrofitting authorization after exposed tables exist creates unacceptable privacy risk.

**Acceptance Criteria**:

1. WHEN a database migration is applied to a clean local database THEN the system SHALL record it in migration history and allow the documented verification command to confirm its applied state.
2. The system SHALL enable row-level security on every application table in a Data API-exposed schema.
3. IF an application table has no approved anonymous or authenticated access policy THEN the system SHALL deny Data API access to that table for those roles.
4. The system SHALL expose only publishable client credentials to browser code and SHALL keep secret, service-role, database, SMTP, and object-storage credentials outside version control and client bundles.
5. WHEN repository secret scanning runs against tracked files THEN the system SHALL fail if a configured credential pattern is detected.
6. IF a migration or database policy violates the configured Supabase database checks THEN the full foundation gate SHALL fail with the reported database finding.

**Independent Test**: Apply the baseline migration, inspect migration history and RLS state, verify denied access for unapproved roles, inspect the browser bundle environment, and run secret and database checks.

### P1: Production operations contract ⭐ MVP

**User Story**: As the VPS operator, I want explicit production security, storage, backup, and recovery instructions so that self-hosting does not rely on undocumented machine state.

**Why P1**: Self-hosting transfers reliability and security responsibilities to CampusMarkt.

**Acceptance Criteria**:

1. The system SHALL document a production topology in which a reverse proxy terminates valid HTTPS before forwarding traffic to the web and Supabase gateway services.
2. The system SHALL provide an example production environment contract containing variable names and safe placeholders but no operational credentials.
3. The system SHALL document pinned-stack upgrade steps that require reading the Supabase self-hosted changelog, taking a backup, applying the update, and running health and smoke checks.
4. WHEN the documented backup procedure runs against a test fixture THEN the system SHALL create database and Storage backup artifacts outside their primary service volumes.
5. WHEN the documented restore procedure runs against those artifacts in an isolated test environment THEN the system SHALL restore the database fixture and its referenced Storage object.
6. IF external SMTP, production object storage, or valid TLS credentials are not configured THEN the system SHALL classify the stack as not production-ready without preventing documented local development.

**Independent Test**: Validate the production configuration contract, back up a database row and object, restore them into an isolated stack, and verify both contents.

---

## Edge Cases

- IF Docker reports an unhealthy required service THEN the system SHALL keep dependent public readiness checks failing and identify the unhealthy service.
- IF a migration fails THEN the system SHALL stop the migration job with a non-zero exit and SHALL not report the deployment as ready.
- IF the available host capacity is below the documented minimum THEN the preflight procedure SHALL report the failed CPU, memory, or disk requirement before production startup.
- IF backup storage is unreachable THEN the backup procedure SHALL exit non-zero and retain its diagnostic output without declaring a successful backup.
- IF a secret appears in a tracked environment file THEN the secret-scanning gate SHALL exit non-zero.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FOUND-01 | P1: Reproducible full-stack startup | Tasks | In Tasks |
| FOUND-02 | P1: Typed modular application foundation | Execute | In Progress (T1 complete) |
| FOUND-03 | P1: Safe Supabase baseline | Tasks | In Tasks |
| FOUND-04 | P1: Production operations contract | Tasks | In Tasks |

**Coverage:** 4 total, 1 mapped to implementation, 3 pending implementation.

---

## Success Criteria

- [ ] A clean compatible machine can start the local foundation through one documented Compose command.
- [ ] Every documented quality and security gate passes from the repository root.
- [ ] A contributor can prove module-boundary enforcement through a failing scratch mutation.
- [ ] A contributor can apply the baseline migration and verify RLS-denied access for unapproved roles.
- [ ] An operator can complete the documented backup and isolated restore drill without relying on the primary volumes.
