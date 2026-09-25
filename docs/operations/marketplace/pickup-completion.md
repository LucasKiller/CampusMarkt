# Marketplace Pickup Completion & Handover Operations Runbook

This runbook defines operational guidance, system boundaries, concurrency invariants, telemetry, and incident response procedures for Feature 010: Pickup Completion & Handover ("Abholung und Übergabebestätigung").

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 010 implements in-person physical handover, seller-confirmed completion, and transaction history for CampusMarkt V1:
- **Zero Platform Funds (AD-014)**:
  - CampusMarkt never holds, escrows, transfers, or processes payments. All transactions use direct in-person cash handover or peer-to-peer settlement upon physical inspection.
- **Seller-Driven Completion Authority**:
  - Only the authenticated seller owning the listing associated with an active reservation can trigger completion via `marketplace_api.complete_pickup`.
- **Atomic Two-Entity State Transition**:
  - Completing a pickup atomically updates `marketplace.reservations` (`status = 'completed'`, `completed_at = now()`, `completion_note`, `completed_by`) and `marketplace.listings` (`status = 'sold'`, `updated_at = now()`).
- **Canonical Lock Ordering & Concurrency (AD-013 / AD-014)**:
  - The completion RPC strictly acquires an exclusive row lock on the listing first (`SELECT ... FROM marketplace.listings WHERE id = ... FOR UPDATE`), serializing concurrent completion and buyer/seller cancellation requests and preventing deadlocks.
- **Safe Pickup Protocol**:
  - The user interface presents the Safe Pickup Checklist (`SafePickupChecklist`) recommending public campus spots (e.g. Campus Nord Bienrode, TU Altgebäude, Universitätsplatz), daylight hours, cash inspection, and accompanied meetups.
- **Privacy Boundary**:
  - Personal contact details (primary email, university email, phone numbers, exact addresses) are strictly excluded from completion receipts, transaction histories, and listings. Only public display name, avatar key, and university badge are exposed.

---

## Preflight and Configuration Validation

Before deploying updates in production:

1. **Database Schema & Columns**:
   - Verify `marketplace.reservations` table contains:
     - `completed_at timestamptz`
     - `completion_note text`
     - `completed_by uuid references auth.users(id)`
2. **RPC Function Grants**:
   - Ensure `marketplace_api.complete_pickup` has execute grants to `authenticated` and `service_role`.
3. **Row-Level Security (RLS)**:
   - Ensure RLS policies on `marketplace.reservations` permit participants (buyer and seller) to inspect completed reservations.
4. **Listing Status Transition**:
   - Ensure `marketplace.listings.status` supports `'sold'`.

---

## Operational Verification

To verify that the pickup repository, application service, API routes, and components pass all quality gates:

```bash
npm run check
npm run test:integration
```

To run the Playwright end-to-end pickup completion journeys:

```bash
npx playwright test apps/web/tests/marketplace-pickup-completion.spec.ts --config apps/web/playwright.config.mjs
```

---

## Incident Response & Recovery

### 1. Concurrent Completion and Cancellation Race (HTTP 409)
- **Symptom**: Buyer or seller receives HTTP 409 `RESERVATION_NOT_ACTIVE` or `LISTING_NOT_RESERVED`.
- **Cause**: The reservation was already cancelled or completed concurrently.
- **Action**: Expected behavior under transactional serialization. The database maintains consistency; the client should refresh the reservation state. No manual intervention required.

### 2. Unauthorized Completion Attempt (HTTP 403)
- **Symptom**: Client receives HTTP 403 `ONLY_SELLER_CAN_COMPLETE`.
- **Cause**: A buyer or unrelated user attempted to call the completion endpoint.
- **Action**: Expected security enforcement. If reported as a false positive, verify that the caller's session `authUserId` matches `marketplace.reservations.seller_id`.

### 3. Inconsistent Listing Status Verification
- **Symptom**: A reservation is completed, but the listing is not shown as `sold`.
- **Action**: Run diagnostic query:
  ```sql
  select r.id as reservation_id, r.status as reservation_status, r.completed_at,
         l.id as listing_id, l.status as listing_status
    from marketplace.reservations r
    join marketplace.listings l on l.id = r.listing_id
   where r.id = '<reservation_id>';
  ```
- **Correction**: If a legacy out-of-band edit occurred, ensure both rows reflect `r.status = 'completed'` and `l.status = 'sold'`.
