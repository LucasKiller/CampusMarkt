# Marketplace Purchase Intent, Offers & Reservations Operations Runbook

This runbook defines operational guidance, system boundaries, concurrency invariants, telemetry, and incident response procedures for Feature 008: Purchase Intent, Offers & Reservations ("Kaufanfragen, Preisverhandlung und Reservierungen").

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 008 implements in-person pickup negotiations, price proposals, counteroffers, and single-recipient exclusive reservations for CampusMarkt V1:
- **Storage Model**:
  - `marketplace.offers`: Stores purchase intents, price proposals, and counteroffers linked via `parent_offer_id`.
  - `marketplace.reservations`: Stores active and completed reservations resulting from accepted offers.
- **Atomic Single-Recipient Reservation Exclusivity (AD-013)**:
  - Enforced via partial unique index `(listing_id) WHERE status = 'active'` on `marketplace.reservations`.
  - Accepting an offer atomically creates an active reservation, transitions the listing status to `reserved`, sets the offer to `accepted`, and supersedes all other competing pending offers.
- **Canonical Lock Ordering (AD-013)**:
  - Database RPCs lock the listing row first (`SELECT ... FROM marketplace.listings WHERE id = ... FOR UPDATE`) before modifying offers or reservations, eliminating circular deadlocks.
- **Self-Purchase Prevention**:
  - Enforced in SQL RPCs and application service: `buyer_id <> seller_id`. Users cannot submit offers or reserve their own listings.
- **Privacy Boundary**:
  - Primary and university emails are excluded from all negotiation and reservation endpoints.
- **Rate Limiting**:
  - Enforces a maximum of 15 negotiation and reservation actions per minute per user.

---

## Preflight and Configuration Validation

Before deploying updates in production:

1. **Database Schema & Partial Unique Indexes**:
   - Verify `marketplace.offers` and `marketplace.reservations` tables exist with foreign keys `ON DELETE CASCADE`.
   - Verify partial unique index:
     ```sql
     create unique index if not exists uq_marketplace_active_reservation
       on marketplace.reservations (listing_id)
      where status = 'active';
     ```
2. **RPC Function Grants**:
   - Ensure the following RPC functions have execute grants to `authenticated` and `service_role`:
     - `marketplace_api.create_offer`
     - `marketplace_api.counter_offer`
     - `marketplace_api.accept_offer`
     - `marketplace_api.cancel_reservation`
3. **Row-Level Security (RLS)**:
   - Ensure RLS is active on `marketplace.offers` and `marketplace.reservations`. Users can only inspect offers/reservations where they are the buyer or the seller.

---

## Operational Verification

To verify that the negotiation repository, application service, API routes, and Playwright user journeys pass all gates:

```console
$ npm run check
$ npm run test:integration
```

To run the Playwright end-to-end negotiation journeys:

```console
$ npx playwright test apps/web/tests/marketplace-offers-reservations.spec.ts --config apps/web/playwright.config.mjs
```

---

## Incident Response & Recovery

### 1. Concurrent Reservation Conflict (HTTP 409)
- **Symptom**: Buyer or seller receives HTTP 409 `LISTING_ALREADY_RESERVED`.
- **Cause**: Another competing offer on the same listing was accepted concurrently, or the listing was already reserved.
- **Action**: Expected behavior under AD-013 concurrency invariants. The UI notifies the user that the listing has already been reserved. No manual database intervention required.

### 2. Excessive Negotiation Activity / Rate Limiting (HTTP 429)
- **Symptom**: User receives HTTP 429 with `Retry-After: 60`.
- **Cause**: User exceeded 15 negotiation actions within 60 seconds.
- **Action**: Check telemetry for automated script loops. The rate limit resets automatically after the window expires.

### 3. Reservation Cancellation
- **Symptom**: User cancels reservation via `/account/reservations`.
- **Behavior**: The RPC transitions the reservation status to `cancelled` with an audited reason code (`no_show`, `changed_mind`, `scheduling_conflict`, `other`) and atomically restores the listing status to `active`.
- **Verification Query**:
  ```sql
  select id, status, updated_at from marketplace.listings where id = '<listing_id>';
  select id, status, cancellation_reason, cancelled_by from marketplace.reservations where id = '<reservation_id>';
  ```
