# CampusMarkt State

## Decisions

### AD-001
- **Decision**: CampusMarkt will use `.specs/` as its only feature-delivery system and `docs/` as its durable product knowledge base.
- **Reason**: The TLC workflow provides specification, design, task, validation, memory, and traceability artifacts without maintaining a second SDD framework in parallel.
- **Trade-off**: The repository will not use the previously suggested Spec Kit `.specify/` and `specs/` structure.
- **Scope**: All product and engineering work.
- **Date**: 2026-09-14
- **Status**: active

### AD-002
- **Decision**: The first client will be a responsive Next.js web application backed by Supabase Auth, PostgreSQL, Storage, and Realtime where a feature requires it.
- **Reason**: This stack supports a fast web launch with authentication, relational data, media, and realtime messaging while keeping infrastructure small.
- **Trade-off**: The product accepts managed-platform coupling and must track Supabase API changes.
- **Scope**: Web, authentication, data, media, and messaging features.
- **Date**: 2026-09-14
- **Status**: active

### AD-003
- **Decision**: Marketplace rules will live outside page components behind application and domain boundaries that a future mobile client can reuse.
- **Reason**: The roadmap moves from responsive web to PWA and later to Expo/React Native without rewriting core rules.
- **Trade-off**: The initial repository has more explicit package boundaries than a single Next.js application.
- **Scope**: Listings, offers, reservations, transactions, verification, messaging, and moderation.
- **Date**: 2026-09-14
- **Status**: active

### AD-004
- **Decision**: CampusMarkt will own marketplace and transaction state, while a future regulated marketplace-payment provider will own payment processing and custody.
- **Reason**: This preserves a safe legal and architectural boundary for protected payments.
- **Trade-off**: Provider-specific payment behavior remains undecided until the protected-payment feature is specified.
- **Scope**: Offers, reservations, transactions, protected payment, handover, refunds, and disputes.
- **Date**: 2026-09-14
- **Status**: active

### AD-005
- **Decision**: Future verticals, listing types, payment states, and meetup capabilities will be documented but will not appear as dormant production code or unreachable database states.
- **Reason**: The architecture must evolve without speculative implementation.
- **Trade-off**: Each future capability requires an explicit schema and domain change when approved.
- **Scope**: All schemas, APIs, domain models, and user interfaces.
- **Date**: 2026-09-14
- **Status**: active

### AD-006
- **Decision**: CampusMarkt will start as a TypeScript modular monolith in which Next.js hosts the responsive UI and server-side application layer, while a self-hosted Supabase stack provides PostgreSQL, Auth, Storage, and Realtime; Docker Compose will coordinate the complete deployable stack behind an HTTPS reverse proxy.
- **Reason**: A single language and deployment unit reduce MVP complexity, preserve explicit domain boundaries for a future mobile client, and allow the existing VPS to run the application and its supporting services reproducibly.
- **Trade-off**: Self-hosting avoids dependence on the managed Supabase service but makes CampusMarkt responsible for updates, hardening, SMTP, monitoring, backups, recovery, and VPS capacity.
- **Scope**: Repository structure, application runtime, local development, production deployment, data, authentication, media, and realtime features.
- **Date**: 2026-09-14
- **Status**: active

### AD-007
- **Decision**: Browser identity mutations will cross the same-origin Next.js Backend-for-Frontend, while Supabase Auth mutation endpoints remain private to the Compose network; identity business and authorization rules will live in transport-neutral application/domain services rather than routes or pages.
- **Reason**: CampusMarkt requires exact HttpOnly-cookie, rate-limit, audit, enumeration-resistance, avatar-processing, and deletion behavior that cannot be bypassed through direct public Auth calls, while future clients must be able to reuse the same rules through another transport adapter.
- **Trade-off**: The web application owns more server orchestration and provider adapters, and future mobile access needs an explicit Bearer/PKCE transport rather than reusing browser cookie routes unchanged.
- **Scope**: Registration, authentication, recovery, sessions, public identity, profile mutation, avatar, account deletion, and future identity-protected application services.
- **Date**: 2026-09-15
- **Status**: active

### AD-008
- **Decision**: University verification records store only normalized pseudonymous HMAC-SHA-256 identity hashes using `IDENTITY_HASH_PEPPER`, discard plaintext institutional email addresses immediately upon confirmation, enforce 180-day (6-month) validity at query time, and cascade purge upon parent account deletion.
- **Reason**: Enforces strict data minimization, prevents institutional email exposure across public profiles, APIs, and logs, guarantees 1:1 uniqueness against multi-account badge farming, and respects the semester-aligned academic cycle.
- **Trade-off**: Plaintext institutional email is never recoverable from platform storage; expired verifications require initiating a fresh one-time email loop.
- **Scope**: University verification, identity domain, database schema/RPCs, public profile trust badges, and account deletion lifecycle.
- **Date**: 2026-09-21
- **Status**: active

### AD-009
- **Decision**: Listing media uses pre-signed direct upload to Supabase Storage `listing-media` with owner-scoped RLS policies; listing creation, mutable updates, and status transitions occur via atomic PostgreSQL RPCs (`marketplace_api`) with strict account confirmation checks, price invariants, and `listing_type` immutability.
- **Reason**: Prevents memory bloat and streaming bottlenecks through the Next.js server runtime, leverages PostgreSQL transactional integrity for multi-image links, and keeps business and lifecycle transition guards at the database/service layer.
- **Trade-off**: Uploaded media for abandoned listing creation drafts requires periodic background orphan cleanup.
- **Scope**: Marketplace inventory, listing creation/editing, image media upload, and lifecycle state management.
- **Date**: 2026-09-22
### AD-010
- **Decision**: Public marketplace feed and listing discovery uses a deterministic keyset-paginated PostgreSQL RPC (`marketplace_api.get_public_feed`) on `(created_at DESC, id DESC)` over active/reserved listings, coupled with Next.js React Server Component streaming for initial page render and a lightweight route handler for cursor-based infinite scroll.
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, Evidence Grade A). Eliminates offset pagination drift (skipped/duplicate items on concurrent inserts), ensures O(1) query performance via partial B-tree indexes, prevents private PII leakage at the database boundary, and keeps a transport-neutral contract ready for future mobile clients.
- **Trade-off**: Requires database-level composite partial indexes and URL-safe base64 keyset cursor serialization.
- **Scope**: Discovery feed, listing details view, public query APIs, and client-agnostic feed transport.
- **Date**: 2026-09-23
- **Status**: active

## Handoff

- **Feature**: 005-marketplace-feed-listing-details / `.specs/features/005-marketplace-feed-listing-details/`
- **Phase / Task**: Feature Complete & Verified (T1-T16 complete, 17/17 ACs validated, 3/3 discrimination mutants killed, PASS validation.md)
- **Completed**:
  - `001-web-supabase-foundation` verified.
  - `002-identity-accounts` verified.
  - `003-university-verification` verified.
  - `004-listing-creation-management` verified.
  - `005-marketplace-feed-listing-details` verified (Phases 1-4, T1-T16, validation.md PASS).
- **In-progress** (file:line): None
- **Next step**: Specify Feature `006-search-filters` under Horizon 3 (Goods Marketplace).
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: main
