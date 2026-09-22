# Marketplace Feed and Listing Details Specification

**Status:** Draft

## Problem Statement

CampusMarkt visitors and registered users need an intuitive, fast, and accessible way to discover available physical goods in Braunschweig. Without a public marketplace feed and dedicated details page, users cannot explore recent inventory, filter items by category or pickup area, or inspect item photos, condition, and seller trustworthiness. The marketplace requires a performant discovery layer with deterministic keyset pagination, responsive card layouts, and full listing inspection, while maintaining strict data minimization and seller privacy.

## Goals

- [ ] Provide a public marketplace feed displaying recent active and reserved physical goods listings in Braunschweig.
- [ ] Implement deterministic keyset pagination on `(created_at, id)` to prevent duplicate or skipped listings during concurrent inserts.
- [ ] Support feed filtering by intent (`SELL`, `GIVE_AWAY`, `WANTED`), category (7 canonical categories), and pickup area (10 Braunschweig zones).
- [ ] Project seller public profile display name and active TU Braunschweig verification badge on each listing card and details view.
- [ ] Provide a dedicated public listing details view displaying high-resolution image galleries, description, condition, and coarse pickup area.
- [ ] Clearly demarcate `reserved` listings with a prominent visual badge while excluding `sold` and `archived` listings from the public feed.
- [ ] Stream the initial feed view via Next.js React Server Components for rapid First Contentful Paint and SEO, with client-side infinite scroll.
- [ ] Protect seller privacy by ensuring primary account emails, institutional verification emails, and internal hashes are never exposed in public queries or DOM.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Full-text keyword search and multi-facet filtering | Owned by downstream Feature `006-search-filters`. |
| Private favorites saving | Owned by downstream Feature `007-favorites`. |
| Structured purchase intent and negotiation offers | Owned by Horizon 4 features (Negotiation and Messaging). |
| Direct in-app chat messaging between buyer and seller | Owned by Horizon 4 features. |
| Algorithmic recommendations or personalized feed ranking | Explicitly excluded from V1 product direction; feed is strictly chronologically ordered by creation time. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Feed query architecture | Unified Keyset Database RPC (`marketplace_api.get_public_feed`) | Verdict by The Jury: ensures deterministic O(1) cursor pagination and zero PII leakage. | yes |
| Included listing statuses | `active` and `reserved` | Buyers should see currently available goods and items under temporary negotiation with a clear badge. | yes |
| Excluded listing statuses | `sold` and `archived` | Completed and removed items are omitted from public feed to maintain high inventory freshness. | yes |
| Page size / feed chunk | Default 20 items per page | Optimal balance between initial mobile payload size and scroll smoothness. | yes |
| Keyset cursor encoding | URL-safe base64 string encoding `{"createdAt": "...", "id": "..."}` | Clean, tamper-evident transport between client and server without exposing complex query params. | yes |
| Details view for inactive items | Direct access to sold/archived item URL displays an informative inactive banner | Preserves bookmarkability and direct link resolution while blocking invalid interaction. | yes |
| Verification badge display | Displays TU Braunschweig badge if and only if verification is active (`status = 'verified'` and `now < expires_at`) | Follows domain rules verified in Feature 003; unverified or expired affiliations show no badge. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Cursor string must parse to valid ISO timestamp and UUID; limit clamped to 1..50; category and pickup area validated against allowed enums. |
| Failure / partial-failure states | Invalid cursor returns HTTP 400 with actionable error; database error returns HTTP 500 without leaking SQL internals; non-existent listing ID on details route returns HTTP 404. |
| Idempotency / retry / duplicate handling | Read operations are idempotent and cacheable with `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`. |
| Auth boundaries & rate limits | Public browsing endpoints accessible to unauthenticated visitors; rate limited to 120 requests/minute per IP to curb aggressive scraping. |
| Concurrency / ordering | Feed ordering is strictly deterministic: `ORDER BY created_at DESC, id DESC`; keyset cursor guarantees no phantom reads or duplicate items during concurrent publishing. |
| Data lifecycle / expiry | Soft-deleted (`archived`) or purged listings immediately drop out of the public feed query. |
| Observability | Structured telemetry logs for feed requests (`feed.queried`, filters applied, result count, execution latency) without logging IP addresses or visitor PII. |
| External-dependency failure | Storage bucket image availability failures fall back to accessible SVG placeholder in UI without crashing the feed. |
| State-transition integrity | Feed query filter `status IN ('active', 'reserved')` evaluates dynamically at query time; status changes immediately reflect in the feed. |

---

## User Stories

### P1: Browse public marketplace feed ⭐ MVP

**User Story**: As a visitor or registered user, I want to browse recently published goods in Braunschweig so that I can discover items available for local pickup.

**Why P1**: Core discovery surface of the entire marketplace; without the feed, buyers cannot discover inventory.

**Acceptance Criteria**:

1. WHEN a visitor requests the public feed without parameters THEN the system SHALL return up to 20 recent listings with status `active` or `reserved`, ordered deterministically by `created_at DESC, id DESC`.
2. The system SHALL include for each listing card: title, price in euros (or free indicator for `GIVE_AWAY`), listing type badge, primary cover photo, category label, coarse pickup area, and seller display name.
3. WHERE a listing owner holds an active TU Braunschweig verification, the system SHALL include the verified university trust badge in the listing card response.
4. WHERE a listing is in `reserved` status, the system SHALL project a prominent `reserved` status indicator on the listing card.
5. The system SHALL exclude all listings with status `sold` or `archived` from the public feed results.
6. The system SHALL exclude primary account emails, institutional verification emails, and internal hashes from the public feed response.

---

### P1: Keyset cursor pagination and filtering ⭐ MVP

**User Story**: As a user scrolling through the feed, I want smooth infinite pagination and category/area filtering without seeing duplicate items or missing newly added goods.

**Why P1**: Ensures reliable browsing on mobile devices and avoids offset-based pagination drift.

**Acceptance Criteria**:

1. WHEN a client requests the feed with an opaque cursor THEN the system SHALL return the next page of listings strictly older than the cursor coordinates `(created_at, id)` without duplicate or omitted records.
2. WHEN the results reach the end of the available inventory THEN the system SHALL return `nextCursor = null`.
3. IF a client supplies a malformed or corrupted cursor string THEN the system SHALL reject the request with HTTP 400 and an invalid cursor error message.
4. WHEN a user filters by category (e.g. `furniture`) THEN the system SHALL return only active or reserved listings belonging to that category.
5. WHEN a user filters by pickup area (e.g. `innenstadt`) THEN the system SHALL return only active or reserved listings in that pickup area.
6. WHEN a user filters by listing type (`SELL`, `GIVE_AWAY`, or `WANTED`) THEN the system SHALL return only listings matching that intent.

---

### P1: Inspect listing details ⭐ MVP

**User Story**: As a prospective buyer or interested neighbor, I want to view the complete details of a listing so that I can inspect all photos, read the full description, check item condition, and evaluate seller trustworthiness.

**Why P1**: Detailed evaluation is essential before arranging local pickup.

**Acceptance Criteria**:

1. WHEN a user requests the details for an existing active or reserved listing by its ID THEN the system SHALL return the full listing data including all ordered photos, full description, condition, category, coarse pickup area, creation date, and seller public profile.
2. The system SHALL order listing photos by their explicit `position` index (0 to 7) with position 0 as the initial gallery photo.
3. WHERE the seller is university-verified, the system SHALL display the TU Braunschweig trust badge on the listing details view.
4. IF a user requests a listing ID that does not exist THEN the system SHALL respond with HTTP 404 Not Found.
5. WHILE a listing is in `sold` or `archived` status, WHEN a user navigates to its URL THEN the system SHALL display an inactive notice stating the item is no longer available.

---

## Edge Cases

1. **Concurrent creation while browsing**: When new listings are created while a user is scrolling, keyset pagination guarantees that the next page contains only items strictly older than the cursor, completely preventing duplicate cards.
2. **Immediate status change reflection**: If a listing is marked `reserved` or `sold` while in the feed, refreshing or navigating to the item immediately reflects the updated status without cache lag.
3. **Empty filtered results**: When a combination of category and pickup area yields 0 listings, the feed displays a friendly empty state with an action to clear filters.
4. **Listing without images (`WANTED`)**: When a `WANTED` listing has 0 images, the feed card and details view render an accessible type-specific placeholder icon rather than a broken image link.
5. **Single-image listings**: Details view handles 1 photo gracefully without redundant gallery thumbnails or broken carousel controls.
6. **Maximum 8-image gallery**: Details view renders responsive thumbnail navigation and swipeable carousel for full 8-image listings.
7. **HTML sanitization in descriptions**: Descriptions containing HTML or script tags are escaped and rendered as safe plaintext to prevent stored XSS.
8. **Long titles and descriptions**: Responsive layout clips overflowing title text cleanly on mobile viewports (360px) and wraps long description paragraphs without horizontal overflow.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| FEED-01 | Public feed listing retrieval with deterministic ordering and projection | P1: AC1, AC2, AC3, AC4, AC5, AC6 | Database RPC / API / UI | pending |
| FEED-02 | Keyset cursor pagination and filtering by category, area, and intent | P1: AC1, AC2, AC3, AC4, AC5, AC6 | Domain / RPC / API | pending |
| FEED-03 | Detailed listing view with image gallery, condition, and seller profile | P1: AC1, AC2, AC3, AC4, AC5 | Application / API / UI | pending |
| FEED-04 | Responsive feed card and details view on mobile (360px) and desktop (1280px) | Edge cases 4, 5, 6, 8 | UI Components | pending |
| FEED-05 | Public boundary protection and zero PII leakage | P1: AC6, Edge case 7 | Security / Data Boundary | pending |
