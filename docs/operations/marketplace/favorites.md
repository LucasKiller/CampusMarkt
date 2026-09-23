# Marketplace Private Favorites Operations Runbook

This runbook defines operational guidance, system boundaries, cache policies, monitoring, and incident response procedures for Feature 007: Private Favorites ("Merkliste").

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 007 implements private listing saving and retrieval for registered users on CampusMarkt:
- **Storage Model**: `marketplace.favorites` table with composite primary key `(user_id, listing_id)`.
- **Foreign Key Cascades**: Foreign keys reference `auth.users(id) ON DELETE CASCADE` and `marketplace.listings(id) ON DELETE CASCADE`.
- **Row-Level Security (RLS)**: Enforced at the PostgreSQL level; users can only select, insert, or delete their own rows (`auth.uid() = user_id`).
- **Decoupled Client Hydration (AD-012)**:
  - Public discovery feed and search endpoints remain 100% public, user-agnostic, and edge-cacheable (`s-maxage=30`).
  - The client application fetches the user's active favorited IDs via `GET /api/marketplace/favorites/ids` and maintains an in-memory `Set<string>`.
  - Multi-tab synchronization is maintained via `BroadcastChannel('cm_favorites')`.
- **Invariants**:
  - A user cannot favorite their own listing (`user_id <> seller_id`).
  - Favoriting an item does not reserve, hold, or lock inventory.
  - Zero public like counts or follower metrics exist in V1.
- **Rate Limiting**: Mutation routes enforce a maximum of 30 favorite toggle operations per minute per user.

---

## Preflight and Configuration Validation

Before deploying updates in production:

1. **Database Schema & Grants**:
   - Ensure `marketplace.favorites` table and composite indexes exist:
     - `idx_marketplace_favorites_user_created` on `(user_id, created_at desc)`.
     - `idx_marketplace_favorites_listing` on `(listing_id)`.
   - Ensure `marketplace_api.toggle_favorite`, `marketplace_api.get_user_favorite_ids`, and `marketplace_api.get_user_favorites` have execute permissions granted to `authenticated` and `service_role`.
2. **RLS Verification**:
   - Confirm RLS is enabled on `marketplace.favorites` with owner-only policies.
3. **Cache Policy**:
   - Verify `GET /api/marketplace/favorites/ids` and `GET /api/marketplace/favorites` have `Cache-Control: private, no-store`.

---

## Operational Verification

To verify that the favorites repository, service, API routes, and UI components pass all checks:

```console
$ npm run check
$ npm run test:integration
$ npx playwright test apps/web/tests/marketplace-favorites.spec.ts --config apps/web/playwright.config.mjs
```

---

## Incident Response & Recovery

### 1. Rapid Toggle Abuse or Rate Limiting
- **Symptom**: User receives HTTP 429 `RATE_LIMITED` when clicking heart buttons.
- **Impact**: Single user is throttled to 30 mutations per minute.
- **Action**: Check application logs for automated scraping or rapid script loops. Legitimate browsing will naturally clear within 60 seconds.

### 2. Orphan Favorite Records on Deleted Listings
- **Symptom**: Stale favorited IDs appear in client set.
- **Action**: The `ON DELETE CASCADE` constraint on `listing_id` automatically cleans up favorite rows. The RPCs also filter `where l.status <> 'archived'`. If orphaned rows are suspected, run an integrity audit query:
  ```sql
  select count(*) from marketplace.favorites f
  where not exists (select 1 from marketplace.listings l where l.id = f.listing_id);
  ```
