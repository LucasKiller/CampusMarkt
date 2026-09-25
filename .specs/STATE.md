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

### AD-011
- **Decision**: Marketplace full-text search and multi-facet filtering uses PostgreSQL native full-text search (stored generated `search_vector tsvector` with `'german'` dictionary and GIN index) encapsulated in `marketplace_api.search_listings`, rejecting external search daemons (Typesense/Meilisearch) and `pg_trgm` wildcard similarity.
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, Evidence Grade A). Guarantees transactional consistency with zero synchronization lag, protects against Linux OOM-killer crashes on the single budget VPS (AD-006), prevents CPU exhaustion attacks, and cleanly intersects multi-facet relational filters with text search in a single query plan.
- **Trade-off**: Typo tolerance is limited to dictionary stemming and prefixes rather than fuzzy Levenshtein distance.
- **Scope**: Search engine, multi-facet filtering, relevance ranking, and search API endpoints.
### AD-012
- **Decision**: Private favorites hydration uses a decoupled client-side hydration model with an authenticated `GET /api/marketplace/favorites/ids` micro-endpoint and asynchronous leaf client components, preserving 100% public edge-caching (`s-maxage=30`) for the discovery feed and search RPCs without authorization-dependent cache fragmentation.
- **Reason**: Decided by The Jury (Confidence HIGH, Evidence Grade A). Protects the single budget VPS (AD-006) from database CPU starvation by keeping high-traffic catalog queries edge-cacheable, eliminates cache invalidation storms when favorites are toggled, and enables instantaneous O(1) in-memory lookups on the client. Dissenting challenges are mitigated via leaf component boundaries, neutral hydration placeholders to prevent FOIC, bounded ID set payloads (max 1,000 IDs), and cross-tab sync.
- **Trade-off**: Requires client-side state hydration across listing cards rather than server-rendered boolean flags baked into public HTML.
- **Scope**: Favorites API, feed and search UI components, listing cards, and client state management.
### AD-013
- **Decision**: Marketplace listing reservation atomicity and negotiation state transitions are strictly governed by an in-database PostgreSQL atomic RPC (`marketplace_api.accept_offer` / `reserve_listing`) using canonical row locking (`SELECT id FROM marketplace.listings WHERE id = ... FOR UPDATE`) coupled with a declarative partial unique index (`idx_one_active_reservation_per_listing ON marketplace.reservations(listing_id) WHERE status = 'active'`), rejecting optimistic version stamps and external distributed locks (Redis/Redlock).
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, 96/100, Evidence Grade A). Guarantees physical impossibility of duplicate active reservations (Marketplace Invariant 5) at the database kernel level, keeps lock duration sub-millisecond to prevent connection pool exhaustion on the single budget VPS (AD-006), and atomically cascades listing status transitions (`ACTIVE` -> `RESERVED`) and competing offer invalidation (`SUPERSEDED`) within a single ACID transaction boundary.
- **Trade-off**: Requires strict canonical lock acquisition ordering in SQL to eliminate cyclical deadlocks.
- **Scope**: Offers, purchase intent, counter-offers, reservations, and negotiation database RPCs.
- **Date**: 2026-09-23
- **Status**: active

### AD-014
- **Decision**: Marketplace private messaging is architected as 1:1 listing-scoped conversations (`UNIQUE (listing_id, buyer_id)`) persisted in PostgreSQL (`marketplace.conversations` and `marketplace.messages`) with participant-only Row Level Security (`auth.uid() IN (buyer_id, seller_id)`). Message dispatch is authored exclusively via authenticated Next.js REST API / PostgreSQL RPC (`marketplace_api.send_message`), while realtime delivery uses Supabase Realtime channel subscription backed by deterministic keyset hydration (`GET /api/marketplace/conversations/[id]/messages?after=<id>`) upon reconnection or visibility recovery. Structured transaction states (offers, reservations) remain completely isolated in their dedicated tables and can only be rendered as read-only event milestones in conversation feeds without mutable chat synthesis.
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, 93/100, Evidence Grade A). Respects the single budget VPS envelope (AD-006) by avoiding redundant Redis/Socket.io daemons, prevents short polling connection pool starvation on constrained PostgreSQL pools, maintains unified security enforcement at the database boundary without duplicate JWT/ACL middleware, and avoids WAL replication slot / RLS CPU bloat under heavy database CDC by keeping message creation inside an atomic RPC with authenticated channel delivery.
- **Trade-off**: Requires client-side visibility-aware reconnect handling and keyset cursor reconciliation to bridge campus Wi-Fi disconnects cleanly.
- **Scope**: Private conversations, messaging transport, conversation scoping, message delivery, and negotiation timeline integration.
- **Date**: 2026-09-24
- **Status**: active

### AD-015
- **Decision**: In-person pickup completion is architected as seller-led unilateral completion executed via an atomic PostgreSQL RPC (`marketplace_api.complete_pickup`). Upon in-person exchange and cash/direct payment handover, the seller confirms completion, which acquires canonical row locks (`SELECT id FROM marketplace.listings WHERE id = ... FOR UPDATE` and `marketplace.reservations FOR UPDATE`) and atomically transitions `marketplace.reservations.status = 'completed'` and `marketplace.listings.status = 'sold'` in a single ACID transaction. The buyer receives instant realtime notification / UI receipt and sees the completed purchase in their transaction history. Pre-completion cancellation remains symmetrically available to either party until the completion transaction commits.
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, 96/100, Evidence Grade A). Rejects mutual two-party handshake and buyer-led confirmation because in a no-escrow cash exchange, buyers leave immediately with physical custody and lack incentive to confirm in-app, which would create systemic transaction abandonment and force background expiration daemons forbidden on the single budget VPS (AD-006). Coupling completion authority to the seller (the physical inventory custodian) ensures listing lifecycle termination mirrors actual physical exchange while PostgreSQL row locking eliminates race conditions against concurrent cancellations.
- **Trade-off**: Requires clear post-completion dispute escalation guidance and Horizon 5 moderation reporting rather than interactive software escrow gates.
- **Scope**: Pickup coordination, completion confirmation, reservation lifecycle completion, listing sold transition, and transaction history.
- **Date**: 2026-09-25
- **Status**: active

## Handoff

- **Feature**: 010-pickup-completion / `.specs/features/010-pickup-completion/`
- **Phase / Task**: Feature 010 complete and verified; Horizon 4 closed.
- **Completed**:
  - `001-web-supabase-foundation` verified.
  - `002-identity-accounts` verified.
  - `003-university-verification` verified.
  - `004-listing-creation-management` verified.
  - `005-marketplace-feed-listing-details` verified.
  - `006-search-filters` verified.
  - `007-favorites` verified.
  - `008-purchase-intent-offers-reservations` verified.
  - `009-messaging` verified.
  - `010-pickup-completion` verified.
- **In-progress** (file:line): none
- **Next step**: Begin Horizon 5 (Trust, Safety, Localization, and Launch Hardening) starting with `011-reporting-blocking`.
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: main

