# Marketplace Feed and Listing Details Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/005-marketplace-feed-listing-details/design.md`  
**Status**: Draft

---

## Test Coverage Matrix

> Generated from `AGENTS.md`, existing vitest & Playwright configs, and the approved specification. Guidelines found: `AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain policy | unit | 1:1 mapping to spec ACs, all branches, cursor decoding, filter validation | `packages/domain/src/listings/**/*.test.ts` | `npm run test:unit` |
| Input validation | unit | Valid/invalid cursor base64, limit bounds, XSS sanitization, query parameters | `packages/validation/src/listings/**/*.test.ts` | `npm run test:unit` |
| Transport DTOs | unit | Exact allowlisted shapes, parsing, rejection of invalid fields | `packages/types/src/listings/**/*.test.ts` | `npm run test:unit` |
| Architectural boundaries | architecture | Boundary checks ensuring no framework or server leaks | `tests/architecture/**/*.test.ts` | `npm run test:architecture` |
| PostgreSQL schema & RPC | database integration | Index usage, keyset determinism, zero duplicate guarantee, trust badge join, RLS | `supabase/tests/marketplace-feed-persistence.test.ts` | `npm run test:db` |
| Application & repository services | unit + integration | Feed orchestration, rate-limiting, error handling, projection formatting | `apps/web/src/modules/listings/**/*.test.ts`, `tests/integration/listings/**` | `npm run test:unit && npm run test:integration` |
| HTTP API routes | integration | Request validation, caching headers, 404 for missing IDs, invalid cursor 400 | `tests/integration/listings/**/*.test.ts` | `npm run test:integration` |
| User journeys & UI | e2e | Feed browsing, filter changes, infinite scroll, details gallery, mobile responsive | `apps/web/tests/marketplace-feed.spec.ts` | `npm run test:e2e` |
| Operations & runbook | operations integration | Docs commands verification, runbook checks | `tests/integration/operations/**` | `npm run test:operations` |

---

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Domain, validation, types, and unit tests | `npm run check` |
| Integration | HTTP routes and provider adapters | `npm run check && npm run build && npm run test:integration` |
| Database | Schema migrations, RLS policies, and RPC functions | `npm run check && npm run test:db` |
| Browser | UI journey work | `npm run check && npm run build && npm run test:integration && npm run test:e2e` |
| Full | Final implementation task and verification | `npm run verify` |

---

## Execution Plan

Phases execute strictly in order. Intra-phase dependencies are shown below; each phase depends on the completion of the preceding phase.

### Phase 1: Contracts and Domain Foundation
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Database Persistence and Keyset RPCs
```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Server Services and HTTP Routes
```text
T9 -> T10 -> T11 -> T12
```

### Phase 4: User Journeys and System Verification
```text
T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### Phase 1: Contracts and Domain Foundation

#### T1: Define feed transport DTOs and type predicates
**What**: Define `PublicFeedItem`, `PublicFeedResponse`, `PublicListingDetails`, `FeedCursor`, and validation predicates.
**Where**: `packages/types/src/listings/feed.ts`
**Depends on**: None
**Requirement**: FEED-01, FEED-02, FEED-03
**Done when**:
- [x] Feed transport types define allowlisted public fields only (no emails, hashes, or user IDs).
- [x] Details DTO includes ordered images and seller trust badge.
- [x] Unit tests verify shape parsing and rejection of invalid data.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(feed): define feed transport dtos and type predicates`

#### T2: Implement keyset cursor encoding and validation schemas
**What**: Implement `encodeCursor`, `decodeCursor`, and `validateFeedFilterParams` with boundary validation.
**Where**: `packages/validation/src/listings/feed.ts`
**Depends on**: T1
**Requirement**: FEED-02, FEED-05
**Done when**:
- [x] Serializes and deserializes URL-safe base64 cursors safely.
- [x] Rejects malformed cursor strings, invalid ISO dates, or non-UUID ids.
- [x] Validates category, area, type, and clamps limit to 1..50.
- [x] Unit tests cover all valid and invalid inputs.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(feed): implement keyset cursor encoding and filter validation`

#### T3: Implement feed domain helpers and formatters
**What**: Implement price display formatters, relative timestamp helpers, area display labels, and category badge helpers.
**Where**: `packages/domain/src/listings/feed.ts`
**Depends on**: T2
**Requirement**: FEED-01, FEED-04
**Done when**:
- [x] Formats price in euros (€X.XX), free for giveaway, or max budget for wanted.
- [x] Maps coarse pickup areas and categories to human-readable German and English labels.
- [x] Unit tests cover all formatting variations.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(feed): implement feed domain formatters and helpers`

#### T4: Add architectural boundary tests for marketplace feed module
**What**: Add architecture tests ensuring feed types/domain/validation packages stay isolated from server-only and database drivers.
**Where**: `tests/architecture/feed-boundary.test.ts`
**Depends on**: T3
**Requirement**: FEED-05
**Done when**:
- [x] Architectural boundary assertions verify package isolation.
- [x] Architecture tests pass in `npm run test:architecture`.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(feed): add architectural boundary tests`

---

### Phase 2: Database Persistence and Keyset RPCs

#### T5: Add composite partial indexes for marketplace feed
**What**: Create migration with composite partial indexes on `marketplace.listings` for keyset sorting and filtering on active/reserved items.
**Where**: `supabase/migrations/20260923100000_marketplace_feed_indexes.sql`
**Depends on**: T4
**Requirement**: FEED-01, FEED-02
**Done when**:
- [x] Migration adds `listings_feed_keyset_idx` on `(created_at desc, id desc) where status in ('active', 'reserved')`.
- [x] Migration adds filter indexes for `category`, `pickup_area`, and `listing_type`.
- [x] Migration verified syntactically.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(feed): add composite partial indexes for feed queries`

#### T6: Implement get_public_feed keyset RPC
**What**: Implement `marketplace_api.get_public_feed` RPC executing keyset pagination, filtering, and joining seller profile & trust badge.
**Where**: `supabase/migrations/20260923101000_marketplace_get_public_feed_rpc.sql`
**Depends on**: T5
**Requirement**: FEED-01, FEED-02, FEED-05
**Done when**:
- [x] RPC filters `status IN ('active', 'reserved')` and applies keyset condition.
- [x] Aggregates primary cover image (`position = 0`), seller `display_name`, and active TU Braunschweig badge.
- [x] Excludes `sold` and `archived` items and all private email/hash fields.
- [x] Database test confirms deterministic ordering and projection.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(feed): implement get public feed keyset rpc`

#### T7: Implement get_public_listing_details RPC
**What**: Implement `marketplace_api.get_public_listing_details` RPC retrieving full details for a single listing with ordered photos.
**Where**: `supabase/migrations/20260923102000_marketplace_get_listing_details_rpc.sql`
**Depends on**: T6
**Requirement**: FEED-03, FEED-05
**Done when**:
- [x] RPC retrieves all ordered media (positions 0 to 7), full description, condition, category, area, price, and seller profile.
- [x] Returns active TU Braunschweig badge if and only if verification is active.
- [x] Database test proves details retrieval and 404/empty handling for invalid IDs.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(feed): implement get public listing details rpc`

#### T8: Add database persistence tests for public feed
**What**: Add standalone database tests proving keyset pagination without duplicates during concurrent inserts, filter accuracy, and badge projection.
**Where**: `supabase/tests/marketplace-feed-persistence.test.ts`
**Depends on**: T7
**Requirement**: FEED-01, FEED-02, FEED-03
**Done when**:
- [x] Tests prove zero duplicate or skipped listings across pages.
- [x] Tests verify filtering by category, area, and type.
- [x] Database tests pass cleanly.
**Tests**: database integration
**Gate**: Database
**Commit**: `test(feed): add database persistence tests for feed queries`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplaceFeedRepository
**What**: Implement `MarketplaceFeedRepository` executing RPC calls against Supabase and mapping result rows to typed DTOs.
**Where**: `apps/web/src/modules/listings/server/feed-repository.ts`
**Depends on**: T8
**Requirement**: FEED-01, FEED-02, FEED-03
**Done when**:
- [x] Repository calls `marketplace_api.get_public_feed` and `get_public_listing_details`.
- [x] Maps raw database records cleanly into `PublicFeedItem` and `PublicListingDetails`.
- [x] Unit and repository integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(feed): implement marketplace feed repository`

#### T10: Implement MarketplaceFeedService
**What**: Implement application service coordinating keyset cursor validation, rate limiting (120/min), and audit telemetry.
**Where**: `apps/web/src/modules/listings/application/feed.ts`
**Depends on**: T9
**Requirement**: FEED-01, FEED-02, FEED-03
**Done when**:
- [x] Service decodes cursors, enforces page limits, and encodes `nextCursor`.
- [x] Emits structured telemetry for feed query metrics.
- [x] Unit tests cover happy and error paths.
**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(feed): implement marketplace feed application service`

#### T11: Implement public feed API route handler
**What**: Implement `GET /api/marketplace/feed` endpoint returning paginated JSON with HTTP caching headers.
**Where**: `apps/web/src/app/api/marketplace/feed/route.ts`
**Depends on**: T10
**Requirement**: FEED-01, FEED-02, FEED-05
**Done when**:
- [x] Endpoint validates query parameters and returns HTTP 200 with `PublicFeedResponse`.
- [x] Sets `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`.
- [x] Returns HTTP 400 on malformed cursor.
- [x] Route integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(feed): implement public feed api route handler`

#### T12: Implement public listing details API route handler
**What**: Implement `GET /api/marketplace/listings/[id]` endpoint returning complete listing details.
**Where**: `apps/web/src/app/api/marketplace/listings/[id]/route.ts`
**Depends on**: T11
**Requirement**: FEED-03, FEED-05
**Done when**:
- [x] Returns HTTP 200 with `PublicListingDetails` for valid IDs.
- [x] Returns HTTP 404 for non-existent listings.
- [x] Returns inactive state for sold or archived listings.
- [x] Route integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(feed): implement public listing details api route`

---

### Phase 4: User Journeys and System Verification

#### T13: Implement ListingCard and feed filter UI components
**What**: Build responsive `ListingCard` with cover image, price tag, reserved badge, area, and trust badge; build filter bar for categories and areas.
**Where**: `apps/web/src/components/marketplace/feed.tsx`
**Depends on**: T12
**Requirement**: FEED-01, FEED-02, FEED-04
**Done when**:
- [x] Responsive card renders cleanly on 360px mobile and 1280px desktop viewports.
- [x] Renders trust badge for verified sellers and reserved tag for items under negotiation.
- [x] Renders accessible placeholder for zero-image `WANTED` listings.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(feed): implement listing card and feed filter components`

#### T14: Implement public feed page with Server Component streaming
**What**: Build responsive `/` homepage / `/listings` feed page with Server Component initial data and client-side infinite scroll.
**Where**: `apps/web/src/app/page.tsx`
**Depends on**: T13
**Requirement**: FEED-01, FEED-02, FEED-04
**Done when**:
- [x] Server Component renders page 0 HTML instantly for fast FCP and SEO.
- [x] Client component uses IntersectionObserver to fetch subsequent pages via cursor.
- [x] Empty state renders when filters yield zero listings.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(feed): implement public feed page with server component streaming`

#### T15: Implement public listing details page UI
**What**: Build responsive `/listings/[id]` page with image gallery carousel, item description, condition badge, pickup area, and seller card with trust badge.
**Where**: `apps/web/src/app/listings/[id]/page.tsx`
**Depends on**: T14
**Requirement**: FEED-03, FEED-04, FEED-05
**Done when**:
- [x] Renders image carousel for up to 8 photos with dot navigation.
- [x] Displays inactive notice banner if listing is sold or archived.
- [x] Displays seller public profile with TU Braunschweig badge if verified.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(feed): implement public listing details page ui`

#### T16: Prove end-to-end feed journeys and add operations runbook
**What**: Add Playwright E2E tests for feed discovery, filtering, keyset pagination, and details inspection; document operational runbook.
**Where**: `apps/web/tests/marketplace-feed.spec.ts`
**Depends on**: T15
**Requirement**: FEED-01, FEED-02, FEED-03, FEED-04, FEED-05
**Done when**:
- [ ] E2E tests prove browsing, filtering, keyset infinite scroll, and details viewing.
- [ ] Operational runbook added to `docs/operations/marketplace/feed.md`.
- [ ] Full gate (`npm run check`, `test:integration`, `test:e2e`) passes.
**Tests**: e2e
**Gate**: Browser
**Commit**: `test(feed): prove end to end feed journeys and add runbook`
