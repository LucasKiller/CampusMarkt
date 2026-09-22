# Search and Filters Specification

**Status:** Draft

## Problem Statement

CampusMarkt visitors and registered users need an efficient, precise way to locate physical goods in Braunschweig that match their exact needs, budget, and neighborhood proximity. As inventory expands, browsing a chronological feed alone is insufficient. Users need to search for specific items by keyword, filter listings across multiple facets (category, pickup zone, price range, condition, intent, and university verification trust badge), sort results intuitively, and share their filtered searches via URL parameters.

## Goals

- [ ] Provide full-text keyword search across listing titles and descriptions with German language stemming and weighted relevance ranking.
- [ ] Support multi-facet filtering by category, coarse pickup area, listing intent (`SELL`, `GIVE_AWAY`, `WANTED`), item condition, and price bounds.
- [ ] Provide an optional trust filter to restrict results to active TU Braunschweig verified sellers.
- [ ] Support 4 explicit sort orders: `relevance`, `newest`, `price_asc`, and `price_desc`.
- [ ] Synchronize search terms, facet filters, and sort orders bidirectionally with URL query parameters for shareability and bookmarking.
- [ ] Provide responsive search UI controls: desktop search toolbar and mobile-optimized filter drawer with reset/clear actions.
- [ ] Preserve keyset or deterministic pagination across search results without skipping or duplicating items.
- [ ] Enforce data minimization and privacy by excluding all private seller data (emails, internal hashes) from search projections.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Private favorites saving | Owned by downstream Feature `007-favorites`. |
| Saved search email notifications or push alerts | Deferred capability requiring notifications and background worker infrastructure. |
| Fuzzy typo-tolerance with external engines (Typesense/Meilisearch) | Unanimously rejected by The Jury to avoid VPS memory exhaustion and sync pipeline failures. |
| Search history tracking or user search profiling | Explicitly excluded from privacy policy and V1 product direction. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Search engine architecture | PostgreSQL Native FTS with stored generated `search_vector` and GIN index | The Jury verdict: zero operational overhead, transactional consistency, fits single-VPS budget. | yes |
| Text search dictionary | `'german'` dictionary configuration | Matches Braunschweig local community; correctly stems German inflections while indexing English tokens. | yes |
| Query parser | `websearch_to_tsquery('german', ...)` | Robust against syntax errors; supports quoted phrases and operators gracefully. | yes |
| Default sort order | `relevance` when text query `q` is non-empty; `newest` when `q` is empty | Matches user intent: keyword queries seek best match; browsing seeks latest listings. | yes |
| Price sort for giveaway/wanted | `GIVE_AWAY` (€0) and `WANTED` items sorted last in price asc/desc | Prevents zero/null price items from crowding out relevant priced goods in price-specific sorts. | yes |
| Search rate limiting | Max 60 search requests per minute per IP | Protects PostgreSQL from rapid automated scraping and CPU exhaustion. | yes |
| Zero results behavior | Displays empty state with clear suggestions and "Clear all filters" CTA | Guides user to widen search criteria without dead ends. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Search query `q` trimmed and limited to 100 chars; price bounds validated as non-negative integer cents (`minPrice <= maxPrice`); category and area validated against allowed enums. |
| Failure / partial-failure states | Complex or invalid search strings safely parsed via `websearch_to_tsquery` without database exceptions; returns empty array rather than failing. |
| Idempotency / retry / duplicate handling | Search queries are pure idempotent reads; cacheable with `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`. |
| Auth boundaries & rate limits | Search is publicly accessible to visitors; rate limited to 60 req/min per IP at the application service boundary. |
| Concurrency / ordering | Keyset cursor coordinates `(rank, created_at, id)` or `(created_at, id)` guarantee deterministic pagination under concurrent listing activity. |
| Data lifecycle / expiry | Soft-deleted (`archived`) and `sold` listings are excluded from search results at query time. |
| Observability | Structured telemetry logs for search operations (`search.queried`, term length, filter count, result count, execution duration) without logging visitor IP or PII. |
| External-dependency failure | No external dependencies; search operates entirely within PostgreSQL. |
| State-transition integrity | Search vector updates synchronously within the database transaction when a listing is created or updated. |

---

## User Stories

### P1: Full-text search across marketplace inventory ⭐ MVP

**User Story**: As a visitor or registered user, I want to type keywords into a search bar so that I can find listings containing those terms in their title or description.

**Why P1**: Essential for discovering specific physical items rather than scrolling through unrelated categories.

**Acceptance Criteria**:

1. WHEN a user submits a search query `q` THEN the system SHALL return active and reserved listings whose title or description matches the stemmed query terms.
2. The system SHALL rank title matches higher than description matches using weighted tsvectors (title weight A, description weight B).
3. WHEN a user searches with a phrase enclosed in double quotes (e.g. `"tu braunschweig"`) THEN the system SHALL match listings containing that exact contiguous phrase.
4. IF a search query `q` matches no active or reserved listings THEN the system SHALL return an empty result list and an accessible zero-results guidance message.
5. The system SHALL exclude all listings with status `sold` or `archived` from search results.
6. The system SHALL exclude primary account emails, institutional verification emails, and internal hashes from all search responses.

---

### P1: Multi-facet filtering and sorting ⭐ MVP

**User Story**: As a user browsing search results, I want to filter by category, pickup area, price, condition, intent, and university trust badge, and sort by price or date so that I can pinpoint the best local option.

**Why P1**: Filtering narrows broad keyword results down to practical in-person pickup options.

**Acceptance Criteria**:

1. WHEN a user selects one or more categories THEN the system SHALL filter results to only include listings matching the selected categories.
2. WHEN a user selects one or more pickup areas THEN the system SHALL filter results to only include listings located within those coarse zones.
3. WHEN a user specifies a price range (`minPrice` and/or `maxPrice`) THEN the system SHALL return only `SELL` listings with asking prices within those bounds.
4. WHEN a user selects one or more item conditions (`NEW`, `LIKE_NEW`, `GOOD`, `FAIR`) THEN the system SHALL return only listings matching those conditions.
5. WHEN a user toggles the university verification filter THEN the system SHALL return only listings whose owners have an active TU Braunschweig verification badge.
6. WHEN a user selects a sort order (`relevance`, `newest`, `price_asc`, or `price_desc`) THEN the system SHALL order the returned listings according to that criteria.
7. IF a user specifies an invalid price range where `minPrice > maxPrice` THEN the system SHALL reject the request with HTTP 400 and an actionable price range error.

---

### P1: Synchronized URL state and responsive UI ⭐ MVP

**User Story**: As a user searching for items, I want the URL to update with my search parameters and the layout to adapt to my device so that I can share results, use the browser back button, and filter comfortably on mobile.

**Why P1**: URL synchronization makes search results linkable and preserves navigation history.

**Acceptance Criteria**:

1. WHEN a user changes any search term, filter option, or sort order THEN the system SHALL update the browser URL query string without reloading the page.
2. WHEN a user opens a search URL with pre-populated query parameters THEN the system SHALL parse the parameters, apply the filters, and render the matching results.
3. WHILE on a mobile viewport (360px), WHEN a user clicks the filter action THEN the system SHALL open a slide-over filter drawer with accessible controls and an "Apply" button.
4. WHEN a user clicks the "Clear all filters" action THEN the system SHALL reset all filters to their defaults and update the URL accordingly.

---

## Edge Cases

1. **Punctuation and special characters**: Search terms containing punctuation (e.g., `C++`, `Fahrrad-Helm`, `50€`) are sanitized by `websearch_to_tsquery` without causing syntax errors.
2. **Compound German words**: Searching for `Fahrrad` matches listings containing `Fahrrad`, `Fahrräder`, and related stems recognized by the German dictionary.
3. **Price filtering with free items**: Applying a price filter (`minPrice` or `maxPrice`) applies strictly to `SELL` listings and excludes `GIVE_AWAY` items unless the user explicitly filters by `GIVE_AWAY`.
4. **All filters combined yielding zero results**: When multiple filters intersect to produce zero listings, the UI indicates which filters are active and offers a one-click reset action.
5. **Whitespace-only search input**: Submitting a query of only whitespace is treated as an empty query and falls back to standard chronological browsing without error.
6. **Concurrent listing sale during search**: If an item in search results is marked `sold` by its seller, clicking into the item details page displays the inactive notice.
7. **Direct URL manipulation with invalid enums**: Malformed query parameters in the URL (e.g. `?category=invalid_category` or `?sort=random`) fall back to default values gracefully without throwing unhandled exceptions.
8. **Mobile filter drawer focus trap**: Opening the mobile filter drawer traps keyboard focus within the drawer, and closing it restores focus to the triggering button.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| SRCH-01 | Full-text search with German stemming, weighted ranking, and phrase support | P1: AC1, AC2, AC3, AC4, AC5, AC6 | Database RPC / API | pending |
| SRCH-02 | Multi-facet filtering (category, area, price bounds, condition, intent, trust badge) | P1: AC1, AC2, AC3, AC4, AC5, AC7 | Database RPC / Domain | pending |
| SRCH-03 | Search result sorting (relevance, newest, price_asc, price_desc) | P1: AC6, Edge cases 3, 5 | Database RPC / API | pending |
| SRCH-04 | URL state synchronization and responsive search/filter UI | P1: AC1, AC2, AC3, AC4, Edge cases 4, 8 | UI Components / Web | pending |
| SRCH-05 | Public boundary security, input sanitization, and data minimization | P1: AC6, Edge cases 1, 7 | Security / Application | pending |
