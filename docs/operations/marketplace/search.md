# Marketplace Search and Filters Operations Runbook

This runbook defines operational guidance, system boundaries, cache policies, monitoring, and incident response procedures for Feature 006: Marketplace Search and Multi-Facet Filters.

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 006 implements full-text search and multi-facet filtering for CampusMarkt physical goods in Braunschweig:
- **Full-Text Search Engine**: Stored generated column `search_vector` on `marketplace.listings` with weighted title ('A') and description ('B') using PostgreSQL `german` dictionary stemming.
- **Index Support**:
  - Partial GIN index `listings_search_vector_gin_idx` on `(search_vector) where status in ('active', 'reserved')`.
  - B-tree facet indexes on `price_cents` and `condition`.
- **Query Parsing**: Safe query conversion via `websearch_to_tsquery('german'::regconfig, v_query)` supporting unquoted terms, negative terms (`-`), and exact phrases (`"..."`) without throwing SQL syntax exceptions.
- **Sorting Modes**:
  - `relevance`: ordered by `ts_rank_cd(search_vector, query) desc, created_at desc, id desc`.
  - `newest`: chronological order `created_at desc, id desc`.
  - `price_asc` and `price_desc`: price ordering with giveaway/wanted listings priced last.
- **Deterministic Keyset Cursor**: Multi-attribute keyset pagination encoding `(rank, created_at, id)` or `(price_cents, created_at, id)`.
- **Data Minimization & Privacy**: User accounts, email addresses, and identity hashes are never exposed in search RPC projections.
- **HTTP Caching**: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` on `GET /api/marketplace/search`.
- **Rate Limiting**: Public search endpoints enforce 60 requests/minute per client IP to prevent denial-of-service and aggressive scraping.

---

## Preflight and Configuration Validation

Before deploying or promoting search updates in production:

1. **Database Indexes**:
   - Ensure the partial GIN index `listings_search_vector_gin_idx` and B-tree facet indexes exist and are valid.
2. **RPC Function Grants**:
   - `marketplace_api.search_listings` must have granted execute permission to `anon`, `authenticated`, and `service_role`.
3. **Cache Policy**:
   - Verify upstream reverse proxy (Caddy / Cloudflare) honors `s-maxage=30` and `stale-while-revalidate=60` headers.

---

## Operational Verification

To verify that the search repository, service, and API routes build and pass tests:

```console
$ npm run check
$ npm run build
$ npm run test:integration
```

---

## Incident Response & Recovery

### 1. High Search Traffic or Rate Limiting Triggers
- **Symptom**: Unauthenticated clients receive HTTP 429 `RATE_LIMITED` with `Retry-After: 60`.
- **Impact**: Specific client IPs are throttled from issuing more than 60 search requests per minute.
- **Action**: Inspect Caddy ingress access logs for abusive query patterns or automated crawlers. If necessary, throttle or block the offending IP/CIDR range at the ingress edge.

### 2. GIN Index Bloat or Slow Search Queries
- **Symptom**: Queries to `marketplace_api.search_listings` take > 250ms under peak load.
- **Impact**: Increased latency for search visitors.
- **Action**:
  1. Inspect PostgreSQL query plan using `EXPLAIN ANALYZE SELECT * FROM marketplace_api.search_listings('fahrrad', ...);`.
  2. Confirm that the plan uses the bitmap index scan on `listings_search_vector_gin_idx`.
  3. If the GIN index is bloated, rebuild concurrently: `REINDEX INDEX CONCURRENTLY marketplace.listings_search_vector_gin_idx`.

### 3. Inverted Price Range Requests
- **Symptom**: Clients submitting `minPrice > maxPrice` receive HTTP 400 with `INVALID_INPUT`.
- **Impact**: Expected validation behavior; rejected at the application boundary before hitting the database.
- **Action**: Verify client form inputs correctly enforce `minPrice <= maxPrice`.

### 4. Malformed Search Strings
- **Symptom**: Visitors enter complex punctuation or unmatched quotes (e.g. `"""test---++`).
- **Impact**: Handled automatically; `websearch_to_tsquery` parses invalid syntax into valid tsqueries without database errors.
- **Action**: No manual intervention required.
