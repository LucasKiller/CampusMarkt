# Marketplace Feed and Listing Details Design

**Spec**: `.specs/features/005-marketplace-feed-listing-details/spec.md`
**Status**: Approved

---

## Architecture Overview

Feature `005-marketplace-feed-listing-details` implements the public discovery and inspection layer for CampusMarkt V1, grounded in the unanimous verdict of **The Jury** (Option A: Keyset-Paginated Database RPC with Server Component Streaming).

```mermaid
graph TD
    Client[Browser / Visitor] -->|1. Initial Page Load| FeedPage[Next.js Server Component: /]
    FeedPage --> FeedService[MarketplaceFeedService]
    FeedService --> FeedRepo[MarketplaceFeedRepository]
    FeedRepo -->|Keyset Query RPC| DB[(PostgreSQL: marketplace_api.get_public_feed)]
    
    DB --> Output[Composite Feed Items JSON]
    FeedPage -->|Streams Initial HTML| Client

    Client -->|2. Infinite Scroll| FeedAPI[GET /api/marketplace/feed?cursor=...&category=...]
    FeedAPI --> FeedService
    FeedAPI -->|JSON Page| Client

    Client -->|3. View Item Details| DetailsPage[/listings/:id]
    DetailsPage -->|Details Query RPC| DBDetails[(marketplace_api.get_public_listing_details)]
```

### Key Architectural Boundaries

1. **Deterministic Keyset Database Query (`marketplace_api`)**:
   - `marketplace_api.get_public_feed`: Filters `status IN ('active', 'reserved')`, applies keyset condition `(created_at, id) < (cursor_created_at, cursor_id)`, and performs direct relational aggregation of the primary cover photo (`position = 0`), seller public profile (`display_name`, `avatar_object_key`), and active TU Braunschweig trust badge in one query.
   - `marketplace_api.get_public_listing_details`: Retrieves all ordered images (positions 0 to 7), full description, condition, category, area, price, status, and seller profile with trust badge.
2. **Indexing Strategy**:
   - Composite partial index: `marketplace.listings (created_at DESC, id DESC) WHERE status IN ('active', 'reserved')` guarantees index-only scans for feed pagination.
   - Filter indexes: `(category, created_at DESC, id DESC)` and `(pickup_area, created_at DESC, id DESC)` on active/reserved listings.
3. **Server Component Initial Paint & Streaming**:
   - The homepage `/` and marketplace feed `/listings` are Next.js React Server Components that fetch page 0 directly on the server, streaming pre-rendered HTML with zero client-side waterfall latency.
4. **Transport-Neutral DTOs & Validation**:
   - `packages/types/src/listings/`: Defines `PublicFeedItem`, `PublicFeedResponse`, `PublicListingDetails`, and `FeedCursor`.
   - `packages/validation/src/listings/`: Validates query parameters and decodes/encodes URL-safe base64 keyset cursors.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| Database Client & Server Boundary | `apps/web/src/modules/identity/server/supabase.ts` | Reuse authenticated & anonymous server Supabase client patterns. |
| University Verification Domain Policy | `packages/domain/src/identity/university.ts` | Project active verification status (`status = 'verified'` AND `now < expires_at`). |
| Listing Enums & Constants | `packages/domain/src/listings/index.ts` | Reuse `ListingType`, `ListingCategory`, `PickupArea`, `ItemCondition` definitions and display labels. |
| Trust Badge Component | `apps/web/src/modules/identity/` | Reuse the verified TU Braunschweig trust badge badge UI rendering. |

---

## Components and Interfaces

### 1. Types & DTOs (`packages/types/src/listings/feed.ts`)

```typescript
export interface FeedCursor {
  createdAt: string; // ISO 8601
  id: string; // UUID
}

export interface PublicListingSeller {
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
  universityBadge: {
    universityId: string;
    badgeLabel: string;
  } | null;
}

export interface PublicFeedItem {
  id: string;
  listingType: 'SELL' | 'GIVE_AWAY' | 'WANTED';
  title: string;
  priceCents: number | null;
  category: string;
  pickupArea: string;
  condition: string;
  status: 'active' | 'reserved';
  createdAt: string;
  coverImage: string | null;
  seller: PublicListingSeller;
}

export interface PublicFeedResponse {
  items: PublicFeedItem[];
  nextCursor: string | null; // Base64 encoded FeedCursor
}

export interface PublicListingDetails extends PublicFeedItem {
  description: string;
  images: Array<{
    storagePath: string;
    position: number;
  }>;
}
```

### 2. Validation & Cursor Encoding (`packages/validation/src/listings/feed.ts`)

- `encodeCursor(cursor: FeedCursor): string`: Serializes cursor into URL-safe base64.
- `decodeCursor(encoded: string): Result<FeedCursor>`: Decodes and validates ISO date string and UUID format.
- `validateFeedFilterParams(params: unknown)`: Validates query parameters:
  - `cursor`: optional string.
  - `category`: optional valid `ListingCategory`.
  - `pickupArea`: optional valid `PickupArea`.
  - `listingType`: optional `'SELL' | 'GIVE_AWAY' | 'WANTED'`.
  - `limit`: optional integer clamped to `1..50` (default: 20).

### 3. Database Schema & RPCs (`supabase/migrations/`)

#### Indexes on `marketplace.listings`

```sql
create index if not exists listings_feed_keyset_idx
  on marketplace.listings (created_at desc, id desc)
  where status in ('active', 'reserved');

create index if not exists listings_feed_category_idx
  on marketplace.listings (category, created_at desc, id desc)
  where status in ('active', 'reserved');

create index if not exists listings_feed_area_idx
  on marketplace.listings (pickup_area, created_at desc, id desc)
  where status in ('active', 'reserved');

create index if not exists listings_feed_type_idx
  on marketplace.listings (listing_type, created_at desc, id desc)
  where status in ('active', 'reserved');
```

#### RPC 1: `marketplace_api.get_public_feed`

Parameters:
- `p_cursor_created_at timestamptz default null`
- `p_cursor_id uuid default null`
- `p_category text default null`
- `p_pickup_area text default null`
- `p_listing_type text default null`
- `p_limit integer default 20`

Returns a table or JSON array with aggregated primary cover image (`position = 0`), seller public display name, avatar, and active TU Braunschweig badge.

#### RPC 2: `marketplace_api.get_public_listing_details`

Parameter:
- `p_listing_id uuid`

Returns the full public projection of a single listing including its complete array of ordered media, description, and seller profile.

### 4. Server Application Service & API Routes (`apps/web/`)

- `MarketplaceFeedService`:
  - Enforces rate-limiting for public feed requests (120 req/min per IP).
  - Handles cursor encoding/decoding.
  - Returns `PublicFeedResponse`.
- Route Handler: `GET /api/marketplace/feed`
  - Accepts query parameters `cursor`, `category`, `pickupArea`, `listingType`, `limit`.
  - Returns JSON response with `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`.
- Server Component / Route: `/listings/[id]`
  - Fetches listing details via `MarketplaceFeedService.getListingDetails(id)`.
  - Renders 404 for non-existent IDs.
  - Renders inactive banner for `sold` or `archived` listings.

### 5. UI Components (`apps/web/src/components/marketplace/`)

- `MarketplaceFeed`: Client container managing category/area filters, initial server items, and IntersectionObserver-based infinite scroll.
- `ListingCard`: Responsive card displaying cover photo, price badge, title, coarse pickup area, and seller trust badge.
- `ListingDetailsView`:
  - Desktop: 2-column layout (gallery on left, details & seller info on right).
  - Mobile: Full-width carousel with dot indicators, floating price tag, and prominent reservation notice if reserved.
  - Image fallback: SVG placeholder for `WANTED` listings or missing image files.

---

## Risks & Concerns

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Deep keyset pagination latency | Slow queries for distant pages | The B-tree partial index `(created_at DESC, id DESC)` ensures O(1) index seek time regardless of page depth. |
| Inactive/deleted seller account | Broken listing card or missing seller info | RPC uses `LEFT JOIN` on `identity.accounts` and `identity.profiles`, providing graceful fallback display names. |
| Direct link to sold/archived item | Broken 404 confusion | Dedicated inactive notice banner on `/listings/[id]` informing user the item is no longer available. |
| Data scraping & enumeration | Mass database harvest | Public feed rate limit (120/min per IP) and strict keyset limiting (max 50 items/request). |
