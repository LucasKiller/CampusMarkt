# Tasks: Feature 010-pickup-completion

## Test Coverage Matrix

| Requirement | Acceptance Criteria | Test File | Test Type |
| --- | --- | --- | --- |
| PICK-01 | P1 Story 1: AC1, AC2, AC3 | `packages/domain/src/listings/pickup.test.ts`<br>`apps/web/src/components/marketplace/pickup/safe-pickup-checklist.test.tsx`<br>`apps/web/tests/marketplace-pickup-completion.spec.ts` | Unit / Component / E2E |
| PICK-02 | P1 Story 2: AC1, AC2, AC3, AC4 | `apps/web/src/modules/listings/application/pickup.test.ts`<br>`tests/integration/listings/pickup-routes.test.ts`<br>`apps/web/tests/marketplace-pickup-completion.spec.ts` | Unit / Integration / E2E |
| PICK-03 | P1 Story 3: AC1, AC2, AC3 | `supabase/tests/marketplace-pickup-persistence.test.ts`<br>`tests/integration/listings/pickup-routes.test.ts` | Database Persistence / Integration |
| PICK-04 | P1 Story 4: AC1, AC2, AC3 | `apps/web/src/app/account/reservations/page.test.tsx`<br>`tests/integration/listings/pickup-routes.test.ts`<br>`apps/web/tests/marketplace-pickup-completion.spec.ts` | Component / Integration / E2E |
| PICK-05 | P1 Story 5: AC1, AC2 | `tests/architecture/pickup-boundary.test.ts`<br>`apps/web/tests/marketplace-pickup-completion.spec.ts` | Architecture / E2E |

---

## Gate Check Commands

- **Quick gate**: `cmd.exe /c "npm run check"`
- **Database gate**: `cmd.exe /c "npm run check && npm run test:db"`
- **Integration gate**: `cmd.exe /c "npm run check && npm run test:integration"`
- **Full gate**: `cmd.exe /c "npm run check && npm run test:integration && npm run test:db"`

---

## Execution Plan

### Phase 1: Contracts and Domain Foundation
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Database Layer, RPCs and Persistence
```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Server Services and HTTP Routes
```text
T9 -> T10 -> T11 -> T12
```

### Phase 4: UI Components and User Journeys
```text
T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### Phase 1: Contracts and Domain Foundation

#### T1: Define pickup completion DTOs and type predicates
**What**: Define `CompletePickupRequest`, `TransactionReceiptDTO`, `SafePickupSpot`, and type predicates.
**Where**: `packages/types/src/listings/pickup.ts`
**Depends on**: None
**Requirement**: PICK-01, PICK-02, PICK-04
**Done when**:
- [x] `CompletePickupRequest` and `TransactionReceiptDTO` types defined.
- [x] Type predicates `isCompletePickupRequest` and `isTransactionReceiptDTO` implemented.
- [x] Re-exported from `packages/types/src/index.ts`.
- [x] Unit tests pass in `pickup.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): define pickup completion dtos and type predicates`

#### T2: Implement pickup validation schemas
**What**: Implement input validation for completion requests and query parameters.
**Where**: `packages/validation/src/listings/pickup.ts`
**Depends on**: T1
**Requirement**: PICK-02, PICK-04
**Done when**:
- [x] `validateCompletePickupInput` checks optional note length $\le 500$ chars.
- [x] Validates reservation ID format.
- [x] Re-exported from `packages/validation/src/index.ts`.
- [x] Unit tests pass in `pickup.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): implement pickup validation schemas`

#### T3: Implement pickup domain invariants and guidance constants
**What**: Implement seller completion authority assertion, state transition rules, and campus pickup spots constant.
**Where**: `packages/domain/src/listings/pickup.ts`
**Depends on**: T2
**Requirement**: PICK-01, PICK-02, PICK-03
**Done when**:
- [x] `assertCanCompletePickup(userId, sellerId)` enforces seller-only completion.
- [x] `CAMPUS_PICKUP_SPOTS` defines TU Braunschweig recommended meeting spots.
- [x] Re-exported from `packages/domain/src/index.ts`.
- [x] Unit tests pass in `pickup.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): implement pickup domain invariants and guidance constants`

#### T4: Add architectural boundary tests for pickup completion
**What**: Add DDD boundary rules ensuring completion does not leak buyer PII or introduce escrow/payment concepts.
**Where**: `tests/architecture/pickup-boundary.test.ts`
**Depends on**: T3
**Requirement**: PICK-02, PICK-05
**Done when**:
- [ ] Boundaries enforce that buyer identity does not leak to public views when listing is sold.
- [ ] Prohibits introduction of payment or escrow abstractions into pickup code.
- [ ] All architectural boundary tests pass.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(pickup): add architectural boundary tests for pickup completion`

---

### Phase 2: Database Layer, RPCs and Persistence

#### T5: Add pickup completion schema migration
**What**: Add `completed_at` and `completion_note` columns and partial indexes to `marketplace.reservations`.
**Where**: `supabase/migrations/20260925200000_marketplace_pickup_completion.sql`
**Depends on**: T4
**Requirement**: PICK-02, PICK-04
**Done when**:
- [ ] Columns added with length constraints.
- [ ] Partial index on completed reservations for history queries.
- [ ] RLS policies verified for completed state access.
**Tests**: db
**Gate**: Database
**Commit**: `feat(pickup): add pickup completion schema migration`

#### T6: Implement complete_pickup RPC with row locking
**What**: Implement `marketplace_api.complete_pickup` with canonical row locks on listing and reservation.
**Where**: `supabase/migrations/20260925201000_marketplace_pickup_complete_rpc.sql`
**Depends on**: T5
**Requirement**: PICK-02, PICK-03
**Done when**:
- [ ] Locks listing row first (`SELECT ... FOR UPDATE`), then reservation.
- [ ] Verifies caller is seller (`auth.uid() = seller_id`).
- [ ] Atomically transitions reservation to `completed` and listing to `sold`.
- [ ] Idempotently handles repeated completions.
**Tests**: db
**Gate**: Database
**Commit**: `feat(pickup): implement complete_pickup rpc with row locking`

#### T7: Implement get_completed_transactions RPC
**What**: Implement `marketplace_api.get_completed_transactions` to fetch past purchases and sales.
**Where**: `supabase/migrations/20260925202000_marketplace_pickup_history_rpc.sql`
**Depends on**: T6
**Requirement**: PICK-04
**Done when**:
- [ ] Returns completed reservations where `auth.uid() IN (buyer_id, seller_id)`.
- [ ] Excludes private email addresses and internal hashes.
- [ ] Orders by `completed_at DESC`.
**Tests**: db
**Gate**: Database
**Commit**: `feat(pickup): implement get_completed_transactions rpc`

#### T8: Add database persistence and race condition tests
**What**: Add tests verifying row locking, seller authority, race condition serialization, and idempotency.
**Where**: `supabase/tests/marketplace-pickup-persistence.test.ts`
**Depends on**: T7
**Requirement**: PICK-02, PICK-03
**Done when**:
- [ ] Verifies non-sellers cannot execute `complete_pickup`.
- [ ] Verifies concurrent cancellation fails after completion commits.
- [ ] Proves listing status transitions to `sold`.
- [ ] All database persistence tests pass.
**Tests**: db
**Gate**: Database
**Commit**: `test(pickup): add database persistence and race condition tests`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplacePickupRepository
**What**: Implement repository adapter calling pickup RPCs and mapping typed DTOs.
**Where**: `apps/web/src/modules/listings/server/pickup-repository.ts`
**Depends on**: T8
**Requirement**: PICK-02, PICK-04
**Done when**:
- [ ] Repository methods for `completePickup` and `getCompletedTransactions`.
- [ ] Maps raw database records to typed `TransactionReceiptDTO`.
- [ ] Repository unit tests pass with mock Supabase client.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): implement marketplace pickup repository`

#### T10: Implement MarketplacePickupService
**What**: Implement application service coordinating validation, seller authority check, rate limiting (15/min), and telemetry.
**Where**: `apps/web/src/modules/listings/application/pickup.ts`
**Depends on**: T9
**Requirement**: PICK-02, PICK-03
**Done when**:
- [ ] Coordinates completion validation and rate limiting.
- [ ] Maps error codes (`FORBIDDEN`, `RESERVATION_NOT_ACTIVE`, `RESERVATION_ALREADY_COMPLETED`).
- [ ] Application service unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): implement marketplace pickup application service`

#### T11: Implement complete pickup API route handler
**What**: Implement `POST /api/marketplace/reservations/[id]/complete`.
**Where**: `apps/web/src/app/api/marketplace/reservations/[id]/complete/route.ts`
**Depends on**: T10
**Requirement**: PICK-02, PICK-03
**Done when**:
- [ ] Handles completion requests with CSRF origin guards.
- [ ] Returns HTTP 200 on success with completed receipt.
- [ ] Returns HTTP 403 on non-seller access and HTTP 409 on conflict.
- [ ] Integration tests verify all outcomes.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(pickup): implement complete pickup api route handler`

#### T12: Implement completed transaction history API route
**What**: Implement `GET /api/marketplace/reservations/history`.
**Where**: `apps/web/src/app/api/marketplace/reservations/history/route.ts`
**Depends on**: T11
**Requirement**: PICK-04
**Done when**:
- [ ] Returns list of user's completed transactions (purchases and sales).
- [ ] Excludes private email addresses.
- [ ] Integration tests verify authenticated access.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(pickup): implement completed transaction history api route`

---

### Phase 4: UI Components and User Journeys

#### T13: Implement safe pickup checklist component
**What**: Implement accessible component displaying campus meeting safety rules and recommended locations.
**Where**: `apps/web/src/components/marketplace/pickup/safe-pickup-checklist.tsx`
**Depends on**: T12
**Requirement**: PICK-01
**Done when**:
- [ ] Displays recommended campus pickup spots and safety checklist.
- [ ] Accessible formatting with clear contrast and icons.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): implement safe pickup checklist component`

#### T14: Implement complete handover button and confirmation modal
**What**: Implement seller action button and confirmation modal to complete handover.
**Where**: `apps/web/src/components/marketplace/pickup/complete-handover-modal.tsx`
**Depends on**: T13
**Requirement**: PICK-02
**Done when**:
- [ ] Seller sees "Übergabe abschließen" button on active reservations.
- [ ] Accessible confirmation modal with optional completion note input.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): implement complete handover button and confirmation modal`

#### T15: Integrate completion history into reservations page and sold banner
**What**: Add completed history tab to `/account/reservations` and sold banner on `/listings/[id]`.
**Where**: `apps/web/src/app/account/reservations/page.tsx`
**Depends on**: T14
**Requirement**: PICK-04, PICK-05
**Done when**:
- [ ] `/account/reservations` has "Aktiv" and "Abgeschlossen" tabs.
- [ ] Completed tab lists past purchases and sales with partner profile and trust badge.
- [ ] Sold listings render "Verkauft" banner and disable buy/offer/message actions.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(pickup): integrate completion history into reservations page and sold banner`

#### T16: Prove end-to-end pickup completion journeys and add runbook
**What**: Implement Playwright E2E tests proving reservation completion and add operational runbook.
**Where**: `apps/web/tests/marketplace-pickup-completion.spec.ts`
**Depends on**: T15
**Requirement**: PICK-01, PICK-02, PICK-03, PICK-04, PICK-05
**Done when**:
- [ ] Playwright E2E tests prove:
  - Seller completes active reservation after in-person pickup.
  - Listing moves to `sold` and displays sold banner on details page.
  - Completed sale appears in seller's history; completed purchase in buyer's history.
  - Concurrent cancellation is rejected after completion.
- [ ] Operational runbook added to `docs/operations/marketplace/pickup-completion.md`.
- [ ] All tests pass.
**Tests**: e2e
**Gate**: Full
**Commit**: `test(pickup): prove end to end pickup completion journeys and add runbook`
