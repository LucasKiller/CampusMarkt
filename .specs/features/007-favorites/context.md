# Feature Context: 007-favorites (Private Favorites)

## 1. Problem Summary

Marketplace shoppers frequently browse inventory over multiple days, compare items from different sellers, or want to keep track of items of interest until they are ready to initiate purchase intent or negotiate a local pickup. Without a private favorites ("Merkliste") mechanism, users are forced to rely on external bookmarks, browser tab hoarding, or manual searching to find items again. 

Feature `007-favorites` provides registered CampusMarkt users with an effortless, private way to save and manage listings they are interested in, view them in a dedicated dashboard, and receive visual status feedback when saved items are marked `reserved` or `sold`.

---

## 2. Target Users & Pain Points

- **Browsing Students / Registered Buyers**:
  - *Pain*: Forgetting where a good listing was located or losing it in a high-volume feed.
  - *Need*: 1-click heart toggle on cards and details pages to save items privately, accessible anywhere on campus.
- **Privacy-Conscious Users**:
  - *Pain*: Unwanted social exposure, peer tracking, or artificial price manipulation driven by public like counts.
  - *Need*: Complete privacy. No public favorite counts or visible saved lists exist on CampusMarkt V1.
- **Campus Sellers**:
  - *Invariant*: Sellers cannot favorite their own listings to inflate artificial interest or confuse their dashboard.

---

## 3. Product Policies & Engineering Invariants

1. **Marketplace Invariants (docs/product/01-domain-model.md)**:
   - Favorites have no effect on listing availability, ranking guarantees, or reservation state.
   - Favoriting an item does NOT hold, reserve, or lock the listing.
   - A user cannot favorite their own listing (Marketplace Invariant 2).
   - Only registered users can save favorites. Visitors clicking favorite are prompted to log in.
2. **Privacy Boundary**:
   - Favorites are strictly private between the user and the system.
   - No public favorite counts or follower metrics exist in V1.
   - Favorite listings API responses must never leak seller private emails or internal hashes.
3. **Decoupled Edge Caching (AD-012)**:
   - Public discovery feed and search APIs remain 100% public, user-agnostic, and edge-cacheable (`s-maxage=30`).
   - Favorite state is hydrated on the client via `GET /api/marketplace/favorites/ids` (`Set<string>`) to avoid cache fragmentation on the single budget VPS (AD-006).
4. **Lifecycle & Orphan Pruning**:
   - If a listing changes status to `reserved` or `sold`, it remains in the user's favorites list with a clear visual status chip (`RESERVED`, `SOLD`) so the user understands why it is unavailable.
   - If a listing is hard-deleted or soft-deleted (`archived`), foreign key cascade (`ON DELETE CASCADE`) or query filters prune it from the favorites list.
   - When a user account is deleted, all their favorite entries are purged via cascade (`ON DELETE CASCADE`).

---

## 4. Upstream Dependencies

- `001-web-supabase-foundation`: Base Next.js App Router, Tailwind, Supabase client infrastructure, testing harness.
- `002-identity-accounts`: Session management, authenticated user context (`auth.uid()`), cookie transport.
- `004-listing-creation-management`: `marketplace.listings` table, listing lifecycle state machine (`active`, `reserved`, `sold`, `archived`), seller ownership.
- `005-marketplace-feed-listing-details`: `ListingCard` component, public details view (`/listings/[id]`), public feed RPCs.
- `006-search-filters`: Full-text search and multi-facet filtering.

---

## 5. Downstream Dependents

- `008-purchase-intent-offers-reservations`: Initiating purchase intent or structured offers directly from saved favorites.
- `009-messaging`: Inquiring about a saved item.
- `010-pickup-completion`: Local handover of purchased saved items.
