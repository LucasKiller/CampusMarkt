# Marketplace Discovery Feed and Listing Details Operations Runbook

This runbook defines operational guidance, system boundaries, cache policies, monitoring, and incident response procedures for Feature 005: Marketplace Feed and Listing Details.

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 005 implements the public discovery and inspection layer for physical goods in Braunschweig:
- **Public Feed Query**: Unified database RPC `marketplace_api.get_public_feed` executed with `SECURITY DEFINER` and empty search path.
- **Keyset Pagination**: Strictly deterministic pagination ordered by `created_at DESC, id DESC`. Keyset condition `(created_at, id) < (cursor_created_at, cursor_id)` prevents phantom reads or duplicates during concurrent additions.
- **Index Support**:
  - `listings_feed_keyset_idx` on `(created_at desc, id desc) where status in ('active', 'reserved')`
  - Filter indexes for `category`, `pickup_area`, and `listing_type`.
- **Status Inclusion**: Public feed includes `active` and `reserved` listings. Listings in `sold` or `archived` states are excluded from the public feed.
- **Data Minimization & Privacy**: User accounts, emails, and internal hashes are never exposed in public feeds or DOM projections. Only public display name, avatar key, and active university trust badges are returned.
- **HTTP Caching**: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` on public feed and details endpoints.
- **Rate Limiting**: Public discovery endpoints enforce 120 requests/minute per IP to prevent aggressive scraping.

---

## Preflight and Configuration Validation

Before promoting a release in production, operators must verify:

1. **Database Indexes**:
   - Ensure the partial keyset index `listings_feed_keyset_idx` and composite filter indexes exist and are valid.
2. **RPC Function Grants**:
   - `marketplace_api.get_public_feed` and `marketplace_api.get_public_listing_details` must grant execute permission to `anon`, `authenticated`, and `service_role`.
3. **Cache Policy**:
   - Verify upstream reverse proxy (Caddy / Cloudflare) honors `s-maxage=30` and `stale-while-revalidate=60` headers.

---

## Operational Verification

To verify that the discovery feed and details routes build and function correctly:

```console
$ npm run check
$ npm run build
$ npm run test:integration
```

---

## Incident Response & Recovery

### 1. High Scraping or Rate-Limiting Triggers
- **Symptom**: Unauthenticated clients receive HTTP 429 `RATE_LIMITED` with `Retry-After: 60`.
- **Impact**: Specific client IPs are throttled from issuing more than 120 requests per minute.
- **Action**: Check ingress access logs for abusive scrapers or botnets. If an aggressive bot is flooding the feed, consider blocking the IP or CIDR range at the ingress reverse proxy (Caddy / Cloudflare).

### 2. Slow Feed Queries or Latency Spikes
- **Symptom**: Server response time for `GET /api/marketplace/feed` exceeds 200ms.
- **Impact**: Slower page loads for visitors browsing the marketplace.
- **Action**:
  1. Inspect PostgreSQL query plans using `EXPLAIN ANALYZE SELECT * FROM marketplace_api.get_public_feed(...)`.
  2. Confirm that the query performs an index-only or bitmap index scan on `listings_feed_keyset_idx`.
  3. If an index has become bloated or corrupted, execute `REINDEX INDEX CONCURRENTLY marketplace.listings_feed_keyset_idx`.

### 3. Sold or Archived Item Inquiries
- **Symptom**: Users report seeing an "Inserat nicht mehr verfügbar" banner when clicking a shared listing link.
- **Impact**: Expected behavior; sold or archived listings preserve direct link resolution but display an inactive notice banner.
- **Action**: Verify that the listing is indeed marked `sold` or `archived` in `marketplace.listings`. No remediation required as this adheres to marketplace policy.

### 4. Image Delivery Degradation
- **Symptom**: Images fail to load on listing cards or gallery carousel.
- **Impact**: Cards render accessible SVG placeholder icons for affected items without crashing the page layout.
- **Action**: Check Supabase Storage service health and ensure the `marketplace-listings` bucket CDN/gateway is operational.
