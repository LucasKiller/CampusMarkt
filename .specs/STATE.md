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
- **Status**: superseded by AD-019

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

### AD-016
- **Decision**: User blocking and report confidentiality are architected as database-layer security boundaries executed within PostgreSQL RPCs and Row Level Security. Bidirectional user blocks (`marketplace.user_blocks`) are enforced inside `marketplace_api` RPCs (`get_public_feed`, `search_listings`, `send_message`, `create_offer`, `get_or_create_conversation`) using index-backed anti-joins supported by dual composite B-tree indexes (`(blocker_id, blocked_id)` and `(blocked_id, blocker_id)`). Reports (`marketplace.reports`) enforce strict write-only submission with reporter-blind RLS where reported targets have zero `SELECT` visibility across all API surfaces, eliminating covert channel leaks by construction.
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, 95/100, Evidence Grade A). Satisfies the mandatory AGENTS.md data-boundary rule by preventing blocked content or reporter identities from ever reaching Node.js buffers or HTTP network streams. Protects keyset cursor pagination (`(created_at, id)`, AD-010) and full-text search rankings (AD-011) against post-query page shrinkage and cursor skipping, while avoiding the memory bloat, GC pauses, and overfetching loops that application-layer filtering would impose on the single budget VPS (AD-006).
- **Trade-off**: Requires composite B-tree indexing on `user_blocks` and integrating anti-join clauses into catalog query plans.
- **Scope**: User reporting, user blocking, report confidentiality, anti-abuse filtering, and feed/search/messaging privacy boundaries.
- **Date**: 2026-09-25
- **Status**: active

### AD-017
- **Decision**: Marketplace moderation authorization, triage operations, and audit records are architected as database-enforced Role-Based Access Control (RBAC) via a dedicated `marketplace.moderator_assignments` table coupled with transactional PostgreSQL RPCs in `marketplace_api` and an append-only audit log in `marketplace.moderation_actions`. Moderator assignments are inaccessible to client modification (`service_role` only write access, preventing self-elevation). All privileged actions (`dismiss_report`, `remove_listing`, `suspend_user`) execute within transactional RPCs with pinned `search_path`, verifying `auth.uid()` against active assignments. Audit entries are committed atomically in the same transaction, and `UPDATE` and `DELETE` privileges on the audit table are explicitly revoked from all non-superuser roles to guarantee mathematical non-repudiation.
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, 97/100, Evidence Grade A). Rejects storing roles in user profiles or metadata (which is susceptible to mass-assignment or client modification) and rejects hardcoding roles in environment variables (which breaks database RLS and requires VPS process restarts on single VPS AD-006). Guarantees that moderation takedowns transition listings cleanly to `removed` (distinct from owner archiving per Invariant 9) and logs complete, immutable audit evidence required for European consumer and youth-protection compliance.
- **Trade-off**: Requires dedicated schema tables and `service_role` / database migrations to onboard initial platform administrators.
- **Scope**: Moderator assignment, least-privilege queue access, listing takedown, account suspension, and append-only moderation audit logging.
- **Date**: 2026-09-26
- **Status**: active

### AD-018
- **Decision**: Bilingual localization (German & English) and launch hardening are architected as lightweight server-driven typed dictionaries with cookie/header locale resolution paired with a monorepo launch hardening suite. Locale negotiation resolves from a sanitized `NEXT_LOCALE` cookie (strict regex `/^(de|en)$/`) falling back to the `Accept-Language` header and defaulting to German (`de`), attaching `Vary: Cookie, Accept-Language` and `Content-Language` headers without mutating existing canonical URL routes. Dictionaries (`de.ts`, `en.ts`) enforce compile-time TypeScript type parity tests to eliminate runtime missing-string defects. Launch hardening incorporates strict HTTP Security Headers (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) in Next.js middleware, automated backup and restore validation, German statutory compliance pages (`/impressum` per § 5 DDG, `/datenschutz` per DSGVO/GDPR, `/agb`), and automated WCAG 2.1 AA accessibility assertions.
- **Reason**: Decided unanimously by The Jury (Confidence HIGH, 95/100, Evidence Grade A). Rejects invasive URL subpath prefixing (`/[locale]/`) which would break existing canonical permalinks and routes established across Features 001–012, avoids heavy runtime framework overhead on the single budget VPS (AD-006), eliminates Flash of Unlocalized Content (FOIC) and hydration mismatch through deterministic server-side rendering with matching `<html lang="...">` attributes, and completes all operational and legal exit criteria for Horizon 5 private beta release.
- **Trade-off**: Multi-language discovery relies on cookie and header content negotiation rather than distinct localized path slugs (`/de/...` vs `/en/...`).
- **Scope**: Internationalization dictionaries, locale resolution, language switching UI, HTTP security headers, legal disclosures, backup verification, and launch runbooks.
- **Date**: 2026-09-26
- **Status**: active

### AD-019
- **Decision**: University verification remains pseudonymous and optional but is valid for twelve calendar months from confirmation. Existing verification expirations are recalculated from their original `verified_at` timestamps, and future confirmations use PostgreSQL calendar-month arithmetic rather than a fixed-day approximation.
- **Reason**: The annual cadence was explicitly approved and matches the durable product documentation while reducing unnecessary re-verification friction.
- **Trade-off**: A trust badge can remain active longer before the user must prove continued university access; query-time expiration and manual disconnect remain mandatory.
- **Scope**: University-verification domain rules, database migrations/RPCs, badge projection, privacy wording, and retention documentation.
- **Date**: 2026-09-26
- **Status**: active

### AD-020
- **Decision**: The locale defaults to English (`en`) when no valid `NEXT_LOCALE` cookie exists. An explicit `de` cookie continues to select German. Browser `Accept-Language` no longer selects the initial language; responses vary only by cookie.
- **Reason**: The requested English default must hold for visitors whose browser advertises German, while a saved language choice remains stable.
- **Trade-off**: Visitors with a German browser must use the language switcher once to save German.
- **Scope**: Locale resolution, response headers, and language switching.
- **Date**: 2026-09-26
- **Status**: active; supersedes the default and header-negotiation portions of AD-018

### AD-021
- **Decision**: CampusMarkt's V1 web interface uses `DESIGN.md` as its visual design reference: original teal identity (`#0B665E`), near-white canvas (`#F7F8F5`), semantic tokens, Inter/system typography, square photo-led listing cards, and responsive navigation. Airbnb is a structural UX reference only, not a copied brand.
- **Reason**: The visual direction was approved after comparing the previous design conversation with the implemented home, search, cards, and listing detail; it gives future screens a consistent hierarchy without adding product capabilities.
- **Trade-off**: Existing support and operations screens will converge progressively rather than being restyled in one risky sweep.
- **Scope**: Web UI and future V1 screen design; no API, stored-data, or marketplace-rule changes.
- **Date**: 2026-09-27
- **Status**: active

## Handoff

- **Feature**: `016-neighborhood-identity`
- **Phase / Task**: Complete / independently verified
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
  - `011-reporting-blocking` verified.
  - `012-moderation` verified.
  - `013-localization-launch-hardening` verified.
  - `014-prelaunch-reconciliation` verified PASS (24/24 acceptance criteria, all gates passing, valid discrimination sensor 6/6).
  - `015-marketplace-visual-system` verified PASS in its scoped verification report.
  - `016-neighborhood-identity` verified PASS (9/9 acceptance criteria, 22/22 browser tests, sensor 2/2).
- **In-progress**: none
- **Next step**: Gather visual feedback on the new home and discovery cards; separately specify the pre-beta security and recovery hardening feature for the blocker classes below.
- **Blockers**: Before private beta, separately harden authenticated marketplace RPC composition, offer authorization/concurrency, and prove backup restoration against an ephemeral PostgreSQL target.
- **Uncommitted files**: none
- **Branch**: main
