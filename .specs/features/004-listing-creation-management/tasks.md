# Listing Creation and Management Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/004-listing-creation-management/design.md`  
**Status**: Draft

---

## Test Coverage Matrix

> Generated from `AGENTS.md`, existing vitest & Playwright configs, and the approved specification. Guidelines found: `AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain policy | unit | 1:1 mapping to spec ACs, all branches, price rules, image rules, status machine | `packages/domain/src/listings/**/*.test.ts` | `npm run test:unit` |
| Input validation | unit | Valid/invalid formats, price limits, XSS/HTML sanitization, condition & area enums | `packages/validation/src/listings/**/*.test.ts` | `npm run test:unit` |
| Transport DTOs | unit | Exact allowlisted shapes, parsing, rejection of invalid fields | `packages/types/src/listings/**/*.test.ts` | `npm run test:unit` |
| Architectural boundaries | architecture | Boundary checks ensuring no framework or secret leaks | `tests/architecture/**/*.test.ts` | `npm run test:architecture` |
| PostgreSQL schema & RPC | database integration | Table RLS, constraints, grants, atomic creation RPC, transition RPC, cascade on account deletion | `supabase/tests/marketplace-persistence.test.ts` | `npm run test:db` |
| Application & repository services | unit + integration | Orchestration, rate-limiting enforcement, owner authorization, error handling | `apps/web/src/modules/listings/**/*.test.ts`, `tests/integration/listings/**` | `npm run test:unit && npm run test:integration` |
| HTTP API routes | integration | Request validation, owner auth (403), invalid transition (409), rate limits (429) | `tests/integration/listings/**/*.test.ts` | `npm run test:integration` |
| User journeys & UI | e2e | Creation form, media upload, owner dashboard, status changes, archival | `apps/web/tests/listings-management.spec.ts` | `npm run test:e2e` |
| Operations & runbook | operations integration | Preflight configuration, docs commands check, full suite run | `tests/integration/operations/**` | `npm run test:operations` |

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

### Phase 2: Database Persistence and Storage RLS
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

#### T1: Define listing domain invariants and enums
**What**: Define `ListingType`, `ListingStatus`, `ListingCategory`, `PickupArea`, `ItemCondition`, price rules, image count validation, and status transition guards.
**Where**: `packages/domain/src/listings/index.ts`
**Depends on**: None
**Requirement**: LIST-01, LIST-03
**Done when**:
- [x] Domain defines categories, pickup areas, conditions, and types.
- [x] Price rules enforce integer cents bounds for `SELL` (€0.50–€10,000.00), null/0 for `GIVE_AWAY`, optional max budget for `WANTED`.
- [x] Image count rules enforce 1–8 images for `SELL`/`GIVE_AWAY` and 0–8 for `WANTED`.
- [x] Status transition state machine defines valid paths and guards against invalid transitions.
- [x] Unit tests cover all branches and edge cases.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(listings): define listing domain invariants and state machine`

#### T2: Define listing transport DTOs and type predicates
**What**: Define schema DTOs, listing entities, media item shapes, and validation type predicates.
**Where**: `packages/types/src/listings/index.ts`
**Depends on**: T1
**Requirement**: LIST-01, LIST-02, LIST-03, LIST-04
**Done when**:
- [x] Transport types define allowlisted request and response shapes.
- [x] Type predicates assert valid listing entities and status responses.
- [x] Unit tests verify parse guards and rejection of extraneous fields.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(listings): define transport dtos and type predicates`

#### T3: Implement listing validation schemas
**What**: Implement schemas for listing creation, updates, and status transitions with sanitization and field bounds.
**Where**: `packages/validation/src/listings/index.ts`
**Depends on**: T2
**Requirement**: LIST-01, LIST-02, LIST-05
**Done when**:
- [x] Validates title (5–100 chars), description (10–2000 chars), sanitized against HTML/script tags.
- [x] Validates condition, category, pickup area against allowed enums.
- [x] Validates image array constraints and storage path formats.
- [x] Unit tests pass across all valid and invalid inputs.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(listings): implement listing validation schemas`

#### T4: Add architectural boundary tests for listings module
**What**: Add architecture tests ensuring listings domain/types/validation packages stay isolated and do not import framework or server-only modules.
**Where**: `tests/architecture/listings-boundary.test.ts`
**Depends on**: T3
**Requirement**: LIST-01
**Done when**:
- [x] Architectural boundary assertions verify package isolation.
- [x] Architecture tests pass in `npm run test:architecture`.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(listings): add architectural boundary tests`

---

### Phase 2: Database Persistence and Storage RLS

#### T5: Add marketplace schema and listings tables migration
**What**: Create migration introducing `marketplace.listings` and `marketplace.listing_media` tables with RLS and constraints.
**Where**: `supabase/migrations/20260922100000_marketplace_listings.sql`
**Depends on**: T4
**Requirement**: LIST-01, LIST-04
**Done when**:
- [x] Migration creates `marketplace` and `marketplace_api` schemas.
- [x] Tables have primary keys, checks, foreign keys cascading on account deletion.
- [x] Tables have RLS enabled and forced.
- [x] Database test confirms schema creation and constraint integrity.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(listings): add marketplace listings tables migration`

#### T6: Add marketplace create listing RPC
**What**: Implement `marketplace_api.create_listing` RPC to atomically create a listing and insert associated media records.
**Where**: `supabase/migrations/20260922101000_marketplace_create_listing_rpc.sql`
**Depends on**: T5
**Requirement**: LIST-01, LIST-04
**Done when**:
- [ ] RPC verifies caller account state is `active_confirmed` and not deletion-pending.
- [ ] Inserts listing and up to 8 media records atomically inside transaction.
- [ ] Database test proves valid creation and rejection of invalid accounts.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(listings): add create listing rpc`

#### T7: Add marketplace update and status transition RPCs
**What**: Implement `marketplace_api.update_listing` and `marketplace_api.transition_listing_status` RPCs.
**Where**: `supabase/migrations/20260922102000_marketplace_manage_listing_rpc.sql`
**Depends on**: T6
**Requirement**: LIST-02, LIST-03
**Done when**:
- [ ] `update_listing` enforces owner equality and locks `listing_type` from mutation.
- [ ] `transition_listing_status` enforces state machine transitions and owner authorization.
- [ ] Database test proves unauthorized access is rejected and state machine guards hold.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(listings): add update and status transition rpcs`

#### T8: Add listing media storage bucket with RLS policies
**What**: Create migration for `listing-media` Supabase Storage bucket with authenticated owner upload and public read RLS.
**Where**: `supabase/migrations/20260922103000_marketplace_storage_media.sql`
**Depends on**: T7
**Requirement**: LIST-04
**Done when**:
- [ ] Storage bucket `listing-media` is configured.
- [ ] RLS policies permit authenticated users to upload to their designated path prefix.
- [ ] Storage policies verified in database tests.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(listings): add listing media storage bucket with rls`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement listing repository and storage adapter
**What**: Implement `ListingRepository` executing RPC calls against Supabase and managing media paths.
**Where**: `apps/web/src/modules/listings/server/repository.ts`
**Depends on**: T8
**Requirement**: LIST-01, LIST-02, LIST-04
**Done when**:
- [ ] Repository abstracts `create_listing`, `update_listing`, `transition_listing_status`, and queries.
- [ ] Handles DB error mappings to domain errors.
- [ ] Integration tests pass against repository adapter.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(listings): implement listing repository and storage adapter`

#### T10: Implement ListingApplicationService
**What**: Implement application service coordinating listing validation, rate limiting (20/hr), and audit logging.
**Where**: `apps/web/src/modules/listings/application/index.ts`
**Depends on**: T9
**Requirement**: LIST-01, LIST-02, LIST-03
**Done when**:
- [ ] Service enforces account status and rate limits.
- [ ] Emits structured audit events (`listing.created`, `listing.updated`, etc.).
- [ ] Unit and integration tests cover happy and error paths.
**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(listings): implement listing application service`

#### T11: Implement upload-intent and listing creation API endpoints
**What**: Implement `POST /api/listings/media/upload-intent` and `POST /api/listings` endpoints.
**Where**: `apps/web/src/app/api/listings/route.ts`
**Depends on**: T10
**Requirement**: LIST-01, LIST-04
**Done when**:
- [ ] Upload intent returns signed storage path for valid image MIME types.
- [ ] `POST /api/listings` validates payload, creates listing, and returns HTTP 201.
- [ ] Integration tests verify endpoints, auth guards (401), and validation errors (400).
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(listings): implement upload intent and listing creation routes`

#### T12: Implement owner management and status transition API endpoints
**What**: Implement `GET /api/listings/mine`, `GET /api/listings/[id]/manage`, `PATCH /api/listings/[id]`, and `POST /api/listings/[id]/status`.
**Where**: `apps/web/src/app/api/listings/[id]/route.ts`
**Depends on**: T11
**Requirement**: LIST-02, LIST-03
**Done when**:
- [ ] `GET /api/listings/mine` lists all listings for the authenticated user.
- [ ] `PATCH /api/listings/[id]` updates mutable fields; rejects non-owner with 403.
- [ ] `POST /api/listings/[id]/status` transitions status; rejects invalid transitions with 409.
- [ ] Route integration tests cover all status codes and responses.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(listings): implement listing management and status routes`

---

### Phase 4: User Journeys and System Verification

#### T13: Implement listing creation form UI
**What**: Build responsive `/listings/new` page with type selector, pricing input, category and pickup area dropdowns, drag-and-drop media upload, and policy callouts.
**Where**: `apps/web/src/app/listings/new/page.tsx`
**Depends on**: T12
**Requirement**: LIST-01, LIST-04, LIST-05
**Done when**:
- [ ] Responsive form renders on 360px mobile and 1280px desktop viewports.
- [ ] Price field adapts dynamically to `SELL`, `GIVE_AWAY`, and `WANTED`.
- [ ] Photo uploader supports up to 8 images with primary cover preview.
- [ ] Prohibited goods policy guidance is displayed.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(listings): implement listing creation form ui`

#### T14: Implement owner listing management and status transition UI
**What**: Build responsive `/listings/[id]/manage` page allowing owners to view details, update fields, reorder photos, and trigger status transitions.
**Where**: `apps/web/src/app/listings/[id]/manage/page.tsx`
**Depends on**: T13
**Requirement**: LIST-02, LIST-03
**Done when**:
- [ ] Owner can toggle status between active, reserved, sold, and archived.
- [ ] Form enables updating title, description, price, condition, area, and photos.
- [ ] Type indicator shows `listing_type` as locked/immutable.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(listings): implement owner listing management ui`

#### T15: Implement My Listings dashboard
**What**: Build responsive `/account/listings` page displaying all user's listings organized by status with quick links to manage.
**Where**: `apps/web/src/app/account/listings/page.tsx`
**Depends on**: T14
**Requirement**: LIST-02
**Done when**:
- [ ] Renders user listings with cover image, title, price, status badge, and area.
- [ ] Provides direct navigation to manage view and create new listing.
- [ ] Component tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(listings): implement my listings dashboard ui`

#### T16: Prove end-to-end listing journeys and complete feature gates
**What**: Add Playwright E2E tests for complete creation, edit, status transition, and archival journeys across viewports; document operational runbook.
**Where**: `apps/web/tests/listings-management.spec.ts`
**Depends on**: T15
**Requirement**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05
**Done when**:
- [ ] E2E tests prove complete user journeys for `SELL`, `GIVE_AWAY`, and `WANTED`.
- [ ] Proves status transitions (`active` -> `reserved` -> `sold` -> `archived`).
- [ ] Operational runbook added to `docs/operations/marketplace/listings.md`.
- [ ] Full gate (`npm run check`, `test:integration`, `test:e2e`) passes.
**Tests**: e2e
**Gate**: Browser
**Commit**: `test(listings): prove end to end listing journeys and add runbook`
