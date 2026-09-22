# Search and Filters Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/006-search-filters/design.md`  
**Status**: Draft

---

## Test Coverage Matrix

> Generated from `AGENTS.md`, existing vitest & Playwright configs, and the approved specification. Guidelines found: `AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain policy | unit | 1:1 mapping to spec ACs, query sanitization, sort logic, price bounds | `packages/domain/src/listings/**/*.test.ts` | `npm run test:unit` |
| Input validation | unit | Valid/invalid params, query length, price range validation (`min <= max`) | `packages/validation/src/listings/**/*.test.ts` | `npm run test:unit` |
| Transport DTOs | unit | Exact allowlisted shapes, parsing, rejection of invalid fields | `packages/types/src/listings/**/*.test.ts` | `npm run test:unit` |
| Architectural boundaries | architecture | Boundary checks ensuring no framework or server leaks | `tests/architecture/**/*.test.ts` | `npm run test:architecture` |
| PostgreSQL schema & RPC | database integration | GIN index usage, stemming accuracy, multi-facet filtering, sort orders | `supabase/tests/marketplace-search-persistence.test.ts` | `npm run test:db` |
| Application & repository services | unit + integration | Search orchestration, rate-limiting, error handling, telemetry | `apps/web/src/modules/listings/**/*.test.ts`, `tests/integration/listings/**` | `npm run test:unit && npm run test:integration` |
| HTTP API routes | integration | Request validation, caching headers, 400 for invalid price ranges | `tests/integration/listings/**/*.test.ts` | `npm run test:integration` |
| User journeys & UI | e2e | Search bar input, filter changes, URL sync, mobile drawer, desktop bar | `apps/web/tests/marketplace-search.spec.ts` | `npm run test:e2e` |
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

### Phase 2: Database Persistence and Search RPC
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

#### T1: Define search transport DTOs and type predicates
**What**: Define `SearchFilters`, `SearchResultsResponse`, `SearchSortOption`, and validation type predicates.
**Where**: `packages/types/src/listings/search.ts`
**Depends on**: None
**Requirement**: SRCH-01, SRCH-02, SRCH-03
**Done when**:
- [x] DTOs define full search filter shape including facets and sort options.
- [x] Type predicates assert valid search request and response shapes.
- [x] Unit tests verify parsing and rejection of invalid data.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(search): define search transport dtos and type predicates`

#### T2: Implement search query validation schema
**What**: Implement `validateSearchParams` validating string lengths, price range bounds (`minPrice <= maxPrice`), condition enums, and allowed sort orders.
**Where**: `packages/validation/src/listings/search.ts`
**Depends on**: T1
**Requirement**: SRCH-02, SRCH-05
**Done when**:
- [x] Trims query to max 100 characters.
- [x] Rejects inverted price ranges (`minPrice > maxPrice`) with actionable error.
- [x] Validates categories, pickup areas, conditions, and types against allowed enums.
- [x] Unit tests cover all valid and invalid inputs.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(search): implement search query validation schema`

#### T3: Implement search domain utilities
**What**: Implement query sanitization helpers, URL search params serializer/deserializer, and default sort selectors.
**Where**: `packages/domain/src/listings/search.ts`
**Depends on**: T2
**Requirement**: SRCH-03, SRCH-04
**Done when**:
- [ ] Serializes and parses search filters to/from URL search params bidirectionally.
- [ ] Selects `relevance` sort when query is non-empty, `newest` when query is empty.
- [ ] Unit tests verify roundtrip serialization and sanitization.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(search): implement search domain utilities and url serializer`

#### T4: Add architectural boundary tests for search module
**What**: Add architecture tests ensuring search types/domain/validation packages stay isolated from server-only modules and database drivers.
**Where**: `tests/architecture/search-boundary.test.ts`
**Depends on**: T3
**Requirement**: SRCH-05
**Done when**:
- [ ] Architectural boundary assertions verify package isolation.
- [ ] Architecture tests pass in `npm run test:architecture`.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(search): add architectural boundary tests`

---

### Phase 2: Database Persistence and Search RPC

#### T5: Add search vector generated column and GIN index migration
**What**: Create migration introducing stored generated column `search_vector` on `marketplace.listings` with German text dictionary and GIN index.
**Where**: `supabase/migrations/20260923200000_marketplace_search_vector.sql`
**Depends on**: T4
**Requirement**: SRCH-01, SRCH-02
**Done when**:
- [ ] Migration adds `search_vector` column with weighted title ('A') and description ('B').
- [ ] Migration creates GIN index `listings_search_vector_gin_idx` on active/reserved listings.
- [ ] Migration adds facet B-tree indexes for `price_cents` and `condition`.
- [ ] Migration verified syntactically.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(search): add search vector column and gin index migration`

#### T6: Implement marketplace_api.search_listings RPC
**What**: Implement `marketplace_api.search_listings` RPC combining `websearch_to_tsquery('german', ...)` with multi-facet filters.
**Where**: `supabase/migrations/20260923201000_marketplace_search_listings_rpc.sql`
**Depends on**: T5
**Requirement**: SRCH-01, SRCH-02, SRCH-05
**Done when**:
- [ ] RPC parses text search with `websearch_to_tsquery` without syntax exceptions.
- [ ] Filters by categories, pickup areas, conditions, types, price range, and verified sellers.
- [ ] Excludes `sold` and `archived` listings and private emails/hashes.
- [ ] Database test confirms search matching and facet filtering.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(search): implement search listings rpc`

#### T7: Implement search sorting and keyset pagination
**What**: Add support for `relevance`, `newest`, `price_asc`, and `price_desc` sort orders and deterministic keyset pagination in search RPC.
**Where**: `supabase/migrations/20260923202000_marketplace_search_sorting.sql`
**Depends on**: T6
**Requirement**: SRCH-03, SRCH-05
**Done when**:
- [ ] Computes relevance rank using `ts_rank_cd`.
- [ ] Supports price sorting and chronological sorting.
- [ ] Implements deterministic keyset pagination for search results.
- [ ] Database test confirms sorting order and pagination behavior.
**Tests**: database integration
**Gate**: Database
**Commit**: `feat(search): add search sorting and keyset pagination`

#### T8: Add database persistence tests for search and filters
**What**: Add standalone database tests proving keyword matching, phrase search (`"..."`), facet intersections, and sort orders.
**Where**: `supabase/tests/marketplace-search-persistence.test.ts`
**Depends on**: T7
**Requirement**: SRCH-01, SRCH-02, SRCH-03
**Done when**:
- [ ] Tests verify title weight > description weight.
- [ ] Tests verify multi-facet intersections (category + area + price).
- [ ] Tests verify university verified seller filter.
- [ ] Database tests pass cleanly.
**Tests**: database integration
**Gate**: Database
**Commit**: `test(search): add database persistence tests for search`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplaceSearchRepository
**What**: Implement `MarketplaceSearchRepository` executing RPC calls against Supabase and mapping result rows to typed DTOs.
**Where**: `apps/web/src/modules/listings/server/search-repository.ts`
**Depends on**: T8
**Requirement**: SRCH-01, SRCH-02, SRCH-03
**Done when**:
- [ ] Repository calls `marketplace_api.search_listings`.
- [ ] Maps database records to `SearchResultsResponse`.
- [ ] Unit and repository integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(search): implement marketplace search repository`

#### T10: Implement MarketplaceSearchService
**What**: Implement application service coordinating search query validation, rate limiting (60/min), and audit telemetry.
**Where**: `apps/web/src/modules/listings/application/search.ts`
**Depends on**: T9
**Requirement**: SRCH-01, SRCH-02, SRCH-05
**Done when**:
- [ ] Service enforces rate limiting and sanitizes search parameters.
- [ ] Emits structured search telemetry (`search.queried`).
- [ ] Unit tests cover happy and error paths.
**Tests**: unit + integration
**Gate**: Integration
**Commit**: `feat(search): implement marketplace search application service`

#### T11: Implement public search API route handler
**What**: Implement `GET /api/marketplace/search` endpoint returning search results with HTTP caching headers.
**Where**: `apps/web/src/app/api/marketplace/search/route.ts`
**Depends on**: T10
**Requirement**: SRCH-01, SRCH-02, SRCH-03, SRCH-05
**Done when**:
- [ ] Endpoint validates query parameters and returns HTTP 200 with `SearchResultsResponse`.
- [ ] Sets `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`.
- [ ] Returns HTTP 400 on inverted price bounds (`minPrice > maxPrice`).
- [ ] Route integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(search): implement public search api route handler`

#### T12: Add integration tests for search API routes
**What**: Add integration tests verifying search API parameters, error responses (400), rate limiting (429), and caching headers.
**Where**: `tests/integration/listings/search-routes.test.ts`
**Depends on**: T11
**Requirement**: SRCH-01, SRCH-02, SRCH-05
**Done when**:
- [ ] Tests verify valid searches return 200 with result items.
- [ ] Tests verify invalid price range returns 400.
- [ ] Integration tests pass cleanly.
**Tests**: integration
**Gate**: Integration
**Commit**: `test(search): add integration tests for search api routes`

---

### Phase 4: User Journeys and System Verification

#### T13: Implement SearchBar component
**What**: Build responsive `SearchBar` component with debounced input, search icon, clear button, and submit action.
**Where**: `apps/web/src/components/marketplace/search/search-bar.tsx`
**Depends on**: T12
**Requirement**: SRCH-01, SRCH-04
**Done when**:
- [ ] Search input supports debounced submission and keyboard enter.
- [ ] Clear button resets the search term.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(search): implement search bar component`

#### T14: Implement responsive FilterDrawer and FilterBar components
**What**: Build accessible `FilterDrawer` for mobile (360px) and `FilterBar` for desktop (1280px) with multi-facet inputs, clear-all action, and sort selector.
**Where**: `apps/web/src/components/marketplace/search/filter-drawer.tsx`
**Depends on**: T13
**Requirement**: SRCH-02, SRCH-03, SRCH-04
**Done when**:
- [ ] Mobile bottom-sheet drawer traps focus and provides apply/reset buttons.
- [ ] Supports category, pickup area, condition, price min/max, and verified seller toggle.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(search): implement filter drawer and filter bar components`

#### T15: Implement /search page with URL synchronization
**What**: Build `/search` page and feed search integration with bidirectional URL search params synchronization and empty state.
**Where**: `apps/web/src/app/search/page.tsx`
**Depends on**: T14
**Requirement**: SRCH-01, SRCH-02, SRCH-03, SRCH-04
**Done when**:
- [ ] Updates browser URL query string on filter changes without full page reload.
- [ ] Restores active filters and queries directly from URL on page load.
- [ ] Displays accessible empty state with reset action when 0 items match.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(search): implement search page with url synchronization`

#### T16: Prove end-to-end search journeys and add operations runbook
**What**: Add Playwright E2E tests for keyword search, multi-facet filtering, URL synchronization, and mobile filter drawer; document operational runbook.
**Where**: `apps/web/tests/marketplace-search.spec.ts`
**Depends on**: T15
**Requirement**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05
**Done when**:
- [ ] E2E tests prove searching for keywords, applying filters, and checking results.
- [ ] Proves mobile filter drawer opening, applying, and clearing.
- [ ] Operational runbook added to `docs/operations/marketplace/search.md`.
- [ ] Full gate (`npm run check`, `test:integration`, `test:e2e`) passes.
**Tests**: e2e
**Gate**: Browser
**Commit**: `test(search): prove end to end search journeys and add runbook`
