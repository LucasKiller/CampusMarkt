# Tasks: Feature 007-favorites (Private Favorites)

## Test Coverage Matrix

| Requirement | Acceptance Criteria | Test File | Test Type |
| --- | --- | --- | --- |
| FAV-01 | P1 Story 1: AC1, AC2, AC3, AC4, AC5, AC6 | `packages/validation/src/listings/favorites.test.ts`<br>`apps/web/src/modules/listings/application/favorites.test.ts`<br>`tests/integration/listings/favorites-routes.test.ts` | Unit / Integration |
| FAV-02 | P1 Story 2: AC1, AC2, AC3, AC4 | `packages/domain/src/listings/favorites.test.ts`<br>`tests/integration/listings/favorites-routes.test.ts`<br>`apps/web/tests/marketplace-favorites.spec.ts` | Unit / Integration / E2E |
| FAV-03 | P1 Story 3: AC1, AC2, AC3, AC4, AC5, AC6 | `apps/web/src/app/favorites/page.test.tsx`<br>`apps/web/tests/marketplace-favorites.spec.ts` | Component / E2E |
| FAV-04 | P1 Story 4: AC1, AC2, AC3, AC4 | `supabase/tests/marketplace-favorites-persistence.test.ts` | Database Persistence |
| FAV-05 | P1 Story 1: AC6, Edge cases 1, 3 | `tests/architecture/favorites-boundary.test.ts`<br>`apps/web/src/modules/listings/application/favorites.test.ts` | Architecture / Unit |

---

## Gate Check Commands

- **Quick gate**: `cmd.exe /c "npm run check"`
- **Database gate**: `cmd.exe /c "npm run check && npm run test:db"`
- **Integration gate**: `cmd.exe /c "npm run check && npm run test:integration"`
- **Full gate**: `cmd.exe /c "npm run check && npm run test:integration && npm run test:db"`

---

## Execution Plan

### Phase 1: Contracts and Domain Foundation
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Database Layer, RPCs and Persistence
```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Server Services and HTTP Routes
```text
T9 -> T10 -> T11 -> T12
```

### Phase 4: UI Components and User Journeys
```text
T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### Phase 1: Contracts and Domain Foundation

#### T1: Define favorites transport DTOs and type predicates
**What**: Define `FavoriteItemDTO`, `FavoriteToggleResponse`, `UserFavoriteIdsResponse`, and type predicates.
**Where**: `packages/types/src/listings/favorites.ts`
**Depends on**: None
**Requirement**: FAV-01, FAV-02
**Done when**:
- [x] `FavoriteItemDTO`, `FavoriteToggleResponse`, `UserFavoriteIdsResponse` types defined.
- [x] Type predicates `isFavoriteItemDTO` and `isFavoriteToggleResponse` implemented.
- [x] Re-exported from `packages/types/src/index.ts`.
- [x] Unit tests pass in `favorites.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): define transport dtos and type predicates`

#### T2: Implement favorites validation schemas
**What**: Implement `validateListingIdParam` and `validateFavoritesPaginationQuery`.
**Where**: `packages/validation/src/listings/favorites.ts`
**Depends on**: T1
**Requirement**: FAV-01, FAV-03
**Done when**:
- [x] `validateListingIdParam` validates UUID syntax.
- [x] `validateFavoritesPaginationQuery` validates cursor and limit bounds (1-50).
- [x] Re-exported from `packages/validation/src/index.ts`.
- [x] Unit tests pass in `favorites.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): implement favorites validation schemas`

#### T3: Implement favorites domain utilities
**What**: Implement favorite ID set helpers, optimistic reconciliation, and self-favorite policy assertion.
**Where**: `packages/domain/src/listings/favorites.ts`
**Depends on**: T2
**Requirement**: FAV-01, FAV-02
**Done when**:
- [x] Helper functions for favorite ID set manipulation and optimistic state reconciliation.
- [x] Self-favorite policy assertion `assertCanFavorite(userId, sellerId)`.
- [x] Re-exported from `packages/domain/src/index.ts`.
- [x] Unit tests pass in `favorites.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): implement domain utilities and invariants`

#### T4: Add architectural boundary tests for favorites module
**What**: Add DDD boundary rules ensuring favorites state and private data remain isolated.
**Where**: `tests/architecture/favorites-boundary.test.ts`
**Depends on**: T3
**Requirement**: FAV-01, FAV-05
**Done when**:
- [x] Boundaries enforce that private favorites cannot leak into public unauthenticated projections.
- [x] No direct client database calls bypass `marketplace_api` RPCs.
- [x] All architectural boundary tests pass.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(favorites): add architectural boundary tests`

---

### Phase 2: Database Layer, RPCs and Persistence

#### T5: Add marketplace favorites table migration
**What**: Create `marketplace.favorites` table with composite PK, cascade FKs, indexes, and RLS policies.
**Where**: `supabase/migrations/20260923210000_marketplace_favorites.sql`
**Depends on**: T4
**Requirement**: FAV-04
**Done when**:
- [x] `marketplace.favorites` table created with `(user_id, listing_id, created_at)`.
- [x] Foreign keys with `ON DELETE CASCADE` to `auth.users` and `marketplace.listings`.
- [x] B-tree indexes created on `(user_id, created_at desc)` and `(listing_id)`.
- [x] Row-Level Security enabled with owner-only policies.
**Tests**: db
**Gate**: Database
**Commit**: `feat(favorites): add marketplace favorites table migration`

#### T6: Implement toggle_favorite RPC
**What**: Implement `marketplace_api.toggle_favorite` with auth checks and self-favorite prohibition.
**Where**: `supabase/migrations/20260923211000_marketplace_favorites_toggle_rpc.sql`
**Depends on**: T5
**Requirement**: FAV-01, FAV-04
**Done when**:
- [x] `marketplace_api.toggle_favorite(p_listing_id uuid)` implemented.
- [x] Checks `auth.uid()` and rejects unauthenticated callers.
- [x] Enforces self-favorite prohibition (`user_id <> seller_id`).
- [x] Returns `{ isFavorited: boolean, listingId: uuid }`.
**Tests**: db
**Gate**: Database
**Commit**: `feat(favorites): implement toggle favorite rpc`

#### T7: Implement get_user_favorite_ids and get_user_favorites RPCs
**What**: Implement RPCs for client hydration ID set and paginated dashboard retrieval.
**Where**: `supabase/migrations/20260923212000_marketplace_favorites_query_rpcs.sql`
**Depends on**: T6
**Requirement**: FAV-02, FAV-03, FAV-04
**Done when**:
- [x] `marketplace_api.get_user_favorite_ids()` returns active favorited UUID array.
- [x] `marketplace_api.get_user_favorites(p_cursor_created_at, p_cursor_listing_id, p_limit)` returns keyset-paginated records with seller trust badge.
- [x] Excludes soft-deleted (`archived`) listings.
**Tests**: db
**Gate**: Database
**Commit**: `feat(favorites): implement favorites query and hydration rpcs`

#### T8: Add database persistence tests for favorites
**What**: Add unit and schema assertions verifying favorites table, indexes, cascades, RLS, and RPCs.
**Where**: `supabase/tests/marketplace-favorites-persistence.test.ts`
**Depends on**: T7
**Requirement**: FAV-04
**Done when**:
- [x] Verifies table schema, indexes, RLS policies, cascades, and RPC logic.
- [x] Proves self-favorite rejection and status handling (`reserved`/`sold`).
- [x] All database tests pass.
**Tests**: db
**Gate**: Database
**Commit**: `test(favorites): add database persistence tests`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplaceFavoritesRepository
**What**: Implement repository adapter calling favorites RPCs and mapping typed DTOs.
**Where**: `apps/web/src/modules/listings/server/favorites-repository.ts`
**Depends on**: T8
**Requirement**: FAV-01, FAV-02, FAV-03
**Done when**:
- [x] `MarketplaceFavoritesRepository` implements calls to `toggle_favorite`, `get_user_favorite_ids`, and `get_user_favorites`.
- [x] Maps raw database records to typed `FavoriteItemDTO` models.
- [x] Repository unit tests pass with mock Supabase client.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): implement marketplace favorites repository`

#### T10: Implement MarketplaceFavoritesService
**What**: Implement application service coordinating validation, rate limiting (30/min), and telemetry.
**Where**: `apps/web/src/modules/listings/application/favorites.ts`
**Depends on**: T9
**Requirement**: FAV-01, FAV-05
**Done when**:
- [x] `MarketplaceFavoritesService` orchestrates validation, rate limiting (30/min), and telemetry.
- [x] Handles error mappings (`CANNOT_FAVORITE_OWN_LISTING`, `LISTING_NOT_FOUND`).
- [x] Application service unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): implement marketplace favorites application service`

#### T11: Implement toggle favorite and IDs API routes
**What**: Implement `GET /api/marketplace/favorites/ids` and `POST /api/marketplace/favorites/[id]`.
**Where**: `apps/web/src/app/api/marketplace/favorites/ids/route.ts`
**Depends on**: T10
**Requirement**: FAV-01, FAV-02
**Done when**:
- [x] `GET /api/marketplace/favorites/ids` returns active user favorite IDs array.
- [x] `POST /api/marketplace/favorites/[id]` toggles favorite state.
- [x] Integration tests verify authentication checks and rate limit handling.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(favorites): implement toggle and ids api routes`

#### T12: Implement get user favorites dashboard API route
**What**: Implement `GET /api/marketplace/favorites` returning paginated saved listings.
**Where**: `apps/web/src/app/api/marketplace/favorites/route.ts`
**Depends on**: T11
**Requirement**: FAV-03
**Done when**:
- [x] `GET /api/marketplace/favorites` returns paginated list of saved items.
- [x] Returns HTTP 401 for unauthenticated requests.
- [x] Integration tests verify pagination and status representation.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(favorites): implement favorites dashboard api route`

---

### Phase 4: UI Components and User Journeys

#### T13: Implement FavoriteButton client component
**What**: Implement accessible heart button with optimistic update, `aria-pressed`, and guest redirect.
**Where**: `apps/web/src/components/marketplace/favorites/favorite-button.tsx`
**Depends on**: T12
**Requirement**: FAV-01, FAV-02
**Done when**:
- [x] Accessible heart button with `aria-pressed`, `aria-label`, and SVG icons.
- [x] Optimistic toggle update with fallback on error.
- [x] Redirects guest visitors to `/login?next=...`.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): implement favorite button component`

#### T14: Integrate FavoriteButton into ListingCard and ListingDetails
**What**: Embed `FavoriteButton` client island on listing cards and details page action bar.
**Where**: `apps/web/src/components/marketplace/feed/listing-card.tsx`
**Depends on**: T13
**Requirement**: FAV-01, FAV-02
**Done when**:
- [x] `FavoriteButton` positioned on `ListingCard` image overlay.
- [x] `FavoriteButton` added to details view action toolbar.
- [x] Card and details unit tests pass without regressions.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): integrate favorite button into listing card and details`

#### T15: Implement /favorites dashboard page
**What**: Implement responsive "Merkliste" page with status chips and empty state CTA.
**Where**: `apps/web/src/app/favorites/page.tsx`
**Depends on**: T14
**Requirement**: FAV-03
**Done when**:
- [ ] Responsive grid rendering saved listings with remove action.
- [ ] Displays status chips for `reserved` (amber) and `sold` (neutral).
- [ ] Empty state with CTA button linking to `/feed`.
- [ ] Server component test passes.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(favorites): implement favorites dashboard page`

#### T16: Prove end-to-end favorites journeys and add runbook
**What**: Implement Playwright E2E journeys covering guest redirect, save, dashboard, and unsave.
**Where**: `apps/web/tests/marketplace-favorites.spec.ts`
**Depends on**: T15
**Requirement**: FAV-01, FAV-02, FAV-03
**Done when**:
- [ ] Playwright E2E tests prove:
  - Guest redirection to login when clicking favorite.
  - Authenticated user saving listing and verifying active heart icon.
  - Navigating to `/favorites` and verifying saved item renders.
  - Unsaving item and verifying empty state.
- [ ] Operational runbook added to `docs/operations/marketplace/favorites.md`.
- [ ] All tests pass.
**Tests**: e2e
**Gate**: Full
**Commit**: `test(favorites): prove end to end favorites journeys and add runbook`
