# Marketplace Feed and Listing Details Context

**Gathered:** 2026-09-23
**Spec:** `.specs/features/005-marketplace-feed-listing-details/spec.md`
**Status:** Ready for design

---

## Executive Summary

Feature `005-marketplace-feed-listing-details` delivers the public discovery and inspection layer for CampusMarkt V1. Visitors and registered users can browse the recent inventory of active and reserved physical goods in Braunschweig, filter by category, pickup area, and intent (`SELL`, `GIVE_AWAY`, `WANTED`), paginate without duplicates via deterministic keyset pagination, and inspect complete listing details with high-resolution photo galleries and verified seller trust badges.

---

## Architecture & Jury Verdict Decisions

### 1. Keyset-Paginated Database RPC (`marketplace_api.get_public_feed`)

- **Verdict by The Jury**: Unanimous PASS (Confidence HIGH, Evidence Grade A) for Option A.
- **Keyset Pagination**: Pagination uses a deterministic cursor `(created_at, id)` with composite index on `(created_at DESC, id DESC) WHERE status IN ('active', 'reserved')`.
- **Zero-Drift Invariant**: Prevents skipped or duplicated listings when new items are published while a user is scrolling.
- **Direct Projection**: The RPC joins listings, primary cover photo (`position = 0`), seller public profile (`display_name`), and active TU Braunschweig trust badge in a single round-trip, preventing N+1 queries.

### 2. Public Visibility & Status Handling

- **Feed Status Scope**: Displays `active` and `reserved` listings. `reserved` listings display a prominent visual badge ("Reserved / In Negotiation") so buyers know an agreement is pending.
- **Excluded Statuses**: `archived` (soft-deleted) and `sold` (completed) listings are excluded from the public feed to keep inventory fresh and relevant.
- **Listing Details by Direct Link**: A direct URL `/listings/[id]` displays the full details for `active` and `reserved` items; if `sold` or `archived`, it displays an informative inactive banner without contact actions.

### 3. Server Component Streaming & Client Infinite Scroll

- **Initial Paint (FCP & SEO)**: Next.js React Server Components execute the initial query on the server and stream ready HTML.
- **Infinite Scrolling**: A lightweight route handler `GET /api/marketplace/feed` serves subsequent keyset pages as JSON for client-side appending.

### 4. Public Privacy Guardrails

- **Zero PII Exposure**: The feed and details views project only approved public fields (`id`, `title`, `description`, `price_cents`, `listing_type`, `category`, `pickup_area`, `condition`, `created_at`, `images`, `seller: { public_id, display_name, university_badge }`).
- Seller primary account email, institutional email, verification tokens, and durable hashes are never included in query results.
