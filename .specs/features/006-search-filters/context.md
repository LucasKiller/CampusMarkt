# Search and Filters Context

**Gathered:** 2026-09-23
**Spec:** `.specs/features/006-search-filters/spec.md`
**Status:** Ready for design

---

## Executive Summary

Feature `006-search-filters` equips CampusMarkt visitors and registered users with a fast, full-text search engine and multi-facet filtering capability for physical goods in Braunschweig. Users can search by keywords across titles and descriptions, refine results across 6 distinct facets (category, pickup area, listing intent, price bounds, item condition, and university verification status), select from 4 explicit sort orders, and share/bookmark their search state via synchronized URL parameters.

---

## Architecture & Jury Verdict Decisions

### 1. PostgreSQL Native Full-Text Search (The Jury Verdict: Option A)

- **Verdict by The Jury**: Unanimous PASS (Confidence HIGH, Evidence Grade A) for Option A.
- **Search Vector**: Stored generated column `search_vector` on `marketplace.listings` combining weighted title (weight 'A') and description (weight 'B') using the `'german'` text search dictionary.
- **Query Parser**: User input is parsed using `websearch_to_tsquery('german', ...)` to safely support natural queries, quoted phrases (`"tu braunschweig"`), and prefix matches without syntax exceptions.
- **Relevance Ranking**: When text search is active, results are ranked by `ts_rank_cd(search_vector, query) DESC, created_at DESC`.
- **Zero Synchronization Lag**: Because search vectors update transactionally on listing create/update, new and updated listings are immediately discoverable with zero sync delay.

### 2. Multi-Facet Filtering & Facet Indexes

- **Facet Dimensions**:
  - `category`: Single or multiple canonical categories (`furniture`, `electronics`, `books_studies`, `bicycles_mobility`, `clothing`, `home_kitchen`, `other`).
  - `pickup_area`: Single or multiple coarse Braunschweig pickup areas.
  - `listing_type`: `SELL`, `GIVE_AWAY`, `WANTED`.
  - `condition`: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.
  - `price_cents`: Minimum and maximum euro bounds.
  - `verified_only`: Boolean toggle to restrict discovery to sellers with active TU Braunschweig verification.
- **Bitmap Index Intersections**: PostgreSQL planner combines the GIN search index with B-tree facet indexes in a single scan inside `marketplace_api.search_listings`.

### 3. Sort Orders

- `relevance`: Default when search query `q` is non-empty (`ts_rank_cd DESC, created_at DESC`).
- `newest`: Default when no search query is present (`created_at DESC, id DESC`).
- `price_asc`: Lowest price first (null prices for giveaway/wanted sorted last).
- `price_desc`: Highest price first.

### 4. User Experience & URL Synchronization

- **Search State Synchronization**: All search terms, filters, and sort options are bidirectionally mirrored in the URL query string (`/?q=...&category=...&minPrice=...&sort=...`).
- **Responsive Layout**:
  - Desktop (1280px): Top search bar with quick category pills, active filter chips, sort dropdown, and collapsible filter drawer.
  - Mobile (360px): Prominent search bar with sticky "Filter" button opening a bottom-sheet drawer with clear-all and apply actions.
- **Zero Results State**: When a search yields no items, the UI presents an accessible empty state with suggestions to widen filters.
