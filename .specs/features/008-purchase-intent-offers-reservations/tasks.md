# Tasks: Feature 008-purchase-intent-offers-reservations

## Test Coverage Matrix

| Requirement | Acceptance Criteria | Test File | Test Type |
| --- | --- | --- | --- |
| OFFR-01 | P1 Story 1: AC1, AC2, AC3, AC4, AC5 | `packages/validation/src/listings/offers.test.ts`<br>`apps/web/src/modules/listings/application/negotiation.test.ts`<br>`tests/integration/listings/offers-routes.test.ts` | Unit / Integration |
| OFFR-02 | P1 Story 2: AC1, AC2, AC3, AC4, AC5, AC6 | `packages/domain/src/listings/offers.test.ts`<br>`tests/integration/listings/offers-routes.test.ts`<br>`apps/web/tests/marketplace-offers-reservations.spec.ts` | Unit / Integration / E2E |
| OFFR-03 | P1 Story 3: AC1, AC2, AC3, AC4 | `supabase/tests/marketplace-offers-reservations-persistence.test.ts`<br>`apps/web/tests/marketplace-offers-reservations.spec.ts` | Database Persistence / E2E |
| OFFR-04 | P1 Story 4: AC1, AC2, AC3, AC4 | `apps/web/src/app/account/reservations/page.test.tsx`<br>`apps/web/tests/marketplace-offers-reservations.spec.ts` | Component / E2E |
| OFFR-05 | P1 Story 1: AC3, AC5, P1 Story 2: AC6 | `tests/architecture/offers-reservations-boundary.test.ts`<br>`apps/web/src/modules/listings/application/negotiation.test.ts` | Architecture / Unit |

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

#### T1: Define offer and reservation transport DTOs and type predicates
**What**: Define `OfferDTO`, `ReservationDTO`, `OfferStatus`, `ReservationStatus`, request payloads, and validation type predicates.
**Where**: `packages/types/src/listings/offers.ts`
**Depends on**: None
**Requirement**: OFFR-01, OFFR-02, OFFR-03
**Done when**:
- [x] `OfferDTO`, `ReservationDTO`, `OfferStatus`, `ReservationStatus` types defined.
- [x] Type predicates `isOfferDTO` and `isReservationDTO` implemented.
- [x] Re-exported from `packages/types/src/index.ts`.
- [x] Unit tests pass in `offers.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): define transport dtos and type predicates`

#### T2: Implement offer and reservation validation schemas
**What**: Implement validation schemas for offer amount bounds (`> 0` and `<= asking_price`), counteroffers, and cancellation reasons.
**Where**: `packages/validation/src/listings/offers.ts`
**Depends on**: T1
**Requirement**: OFFR-01, OFFR-02, OFFR-04
**Done when**:
- [x] `validateCreateOfferInput` validates positive integer cents and message length ($\le 500$).
- [x] `validateCounterOfferInput` validates positive counter amount.
- [x] `validateCancelReservationInput` validates reason against allowed enums.
- [x] Re-exported from `packages/validation/src/index.ts`.
- [x] Unit tests pass in `offers.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): implement negotiation validation schemas`

#### T3: Implement offer and reservation domain state machines and invariants
**What**: Implement state transitions, self-offer invariant assertions (`buyer_id <> seller_id`), and supersession rules.
**Where**: `packages/domain/src/listings/offers.ts`
**Depends on**: T2
**Requirement**: OFFR-02, OFFR-03, OFFR-05
**Done when**:
- [x] Domain state machines validate allowed transitions (`pending -> accepted/declined/withdrawn/countered/superseded`).
- [x] Invariant helper `assertCanNegotiate(buyerId, sellerId)`.
- [x] Re-exported from `packages/domain/src/index.ts`.
- [x] Unit tests pass in `offers.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): implement domain state machines and invariants`

#### T4: Add architectural boundary tests for negotiation module
**What**: Add DDD boundary rules ensuring negotiation state and private participant data remain isolated.
**Where**: `tests/architecture/offers-reservations-boundary.test.ts`
**Depends on**: T3
**Requirement**: OFFR-01, OFFR-05
**Done when**:
- [x] Boundaries enforce that private offers cannot leak into public unauthenticated catalog feeds.
- [x] No direct client database calls bypass `marketplace_api` RPCs.
- [x] All architectural boundary tests pass.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(offers): add architectural boundary tests`

---

### Phase 2: Database Layer, RPCs and Persistence

#### T5: Add marketplace offers and reservations tables migration
**What**: Create `marketplace.offers` and `marketplace.reservations` tables with partial unique index on active reservations and RLS.
**Where**: `supabase/migrations/20260923220000_marketplace_offers_and_reservations.sql`
**Depends on**: T4
**Requirement**: OFFR-03, OFFR-04
**Done when**:
- [x] `marketplace.offers` table created with `(id, listing_id, buyer_id, seller_id, amount_cents, status)`.
- [x] `marketplace.reservations` table created with `agreed_price_cents` and cascade FKs.
- [x] Partial unique index `idx_one_active_reservation_per_listing` on `reservations(listing_id) WHERE status = 'active'`.
- [x] RLS policies restrict visibility to participants only (`auth.uid() = buyer_id or auth.uid() = seller_id`).
**Tests**: db
**Gate**: Database
**Commit**: `feat(offers): add offers and reservations tables migration`

#### T6: Implement create_offer and counter_offer RPCs
**What**: Implement `marketplace_api.create_offer` and `marketplace_api.counter_offer` with auth and self-negotiation checks.
**Where**: `supabase/migrations/20260923221000_marketplace_offers_create_rpcs.sql`
**Depends on**: T5
**Requirement**: OFFR-01, OFFR-02, OFFR-05
**Done when**:
- [x] `marketplace_api.create_offer` checks `auth.uid()`, verifies active listing, rejects self-offer, inserts proposal.
- [x] `marketplace_api.counter_offer` verifies authorized participant, links parent offer, transitions previous to `countered`.
- [x] Rejects invalid price bounds with descriptive SQL exceptions.
**Tests**: db
**Gate**: Database
**Commit**: `feat(offers): implement create and counter offer rpcs`

#### T7: Implement accept_offer and cancel_reservation RPCs
**What**: Implement atomic reservation creation with row-level locks, competing offer supersession, and cancellation relisting.
**Where**: `supabase/migrations/20260923222000_marketplace_offers_accept_cancel_rpcs.sql`
**Depends on**: T6
**Requirement**: OFFR-03, OFFR-04
**Done when**:
- [x] `marketplace_api.accept_offer` locks listing row (`SELECT ... FOR UPDATE`), creates reservation, updates listing to `reserved`, sets offer `accepted`, and marks competing offers `superseded` (AD-013).
- [x] `marketplace_api.cancel_reservation` marks reservation `cancelled` and atomically restores listing to `active`.
**Tests**: db
**Gate**: Database
**Commit**: `feat(offers): implement accept offer and cancel reservation rpcs`

#### T8: Add database persistence and concurrency tests
**What**: Add unit and schema assertions verifying offer tables, partial unique index, lock ordering, cascades, and atomic transitions.
**Where**: `supabase/tests/marketplace-offers-reservations-persistence.test.ts`
**Depends on**: T7
**Requirement**: OFFR-03, OFFR-04
**Done when**:
- [x] Verifies partial unique index prevents concurrent duplicate reservations.
- [x] Proves competing offers are atomically marked `superseded`.
- [x] Proves cancellation restores listing to `active`.
- [x] All database tests pass.
**Tests**: db
**Gate**: Database
**Commit**: `test(offers): add database persistence and concurrency tests`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplaceOffersRepository
**What**: Implement repository adapter calling negotiation RPCs and mapping typed DTOs.
**Where**: `apps/web/src/modules/listings/server/offers-repository.ts`
**Depends on**: T8
**Requirement**: OFFR-01, OFFR-02, OFFR-03
**Done when**:
- [x] `MarketplaceOffersRepository` calls `create_offer`, `counter_offer`, `accept_offer`, and `cancel_reservation`.
- [x] Maps raw database records to typed `OfferDTO` and `ReservationDTO` models.
- [x] Repository unit tests pass with mock Supabase client.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): implement marketplace offers repository`

#### T10: Implement MarketplaceNegotiationService
**What**: Implement application service coordinating validation, self-negotiation prohibition, rate limiting (15/min), and telemetry.
**Where**: `apps/web/src/modules/listings/application/negotiation.ts`
**Depends on**: T9
**Requirement**: OFFR-01, OFFR-02, OFFR-05
**Done when**:
- [x] `MarketplaceNegotiationService` orchestrates offer creation, counter-proposals, acceptance, and cancellation.
- [x] Handles error mappings (`CANNOT_NEGOTIATE_OWN_LISTING`, `LISTING_ALREADY_RESERVED`).
- [x] Application service unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): implement marketplace negotiation application service`

#### T11: Implement offers creation and counteroffer API routes
**What**: Implement `POST /api/marketplace/offers` and `POST /api/marketplace/offers/[id]/counter`.
**Where**: `apps/web/src/app/api/marketplace/offers/route.ts`
**Depends on**: T10
**Requirement**: OFFR-01, OFFR-02
**Done when**:
- [x] `POST /api/marketplace/offers` creates purchase intent or offer.
- [x] `POST /api/marketplace/offers/[id]/counter` proposes counteroffer.
- [x] Integration tests verify authentication checks, validation errors, and rate limit handling.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(offers): implement offers creation and counteroffer api routes`

#### T12: Implement accept offer and cancel reservation API routes
**What**: Implement `POST /api/marketplace/offers/[id]/accept` and `POST /api/marketplace/reservations/[id]/cancel`.
**Where**: `apps/web/src/app/api/marketplace/reservations/route.ts`
**Depends on**: T11
**Requirement**: OFFR-03, OFFR-04
**Done when**:
- [x] `POST /api/marketplace/offers/[id]/accept` accepts offer and creates reservation.
- [x] `POST /api/marketplace/reservations/[id]/cancel` cancels active reservation and restores listing.
- [x] Integration tests verify atomic status changes and competing offer supersession.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(offers): implement accept offer and cancel reservation api routes`

---

### Phase 4: UI Components and User Journeys

#### T13: Implement OfferModal negotiation component
**What**: Implement accessible modal for submitting purchase intent or price offer with focus trap and price validation.
**Where**: `apps/web/src/components/marketplace/negotiation/offer-modal.tsx`
**Depends on**: T12
**Requirement**: OFFR-01, OFFR-02
**Done when**:
- [x] Accessible modal dialog with Buy at Asking Price and Make Offer tabs.
- [x] Validates offer price $\le$ asking price with error message.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): implement offer modal component`

#### T14: Integrate negotiation CTAs into ListingDetails page
**What**: Embed Buy Now and Make Offer buttons on `/listings/[id]` with contextual status cards for active offers.
**Where**: `apps/web/src/components/marketplace/negotiation/negotiation-bar.tsx`
**Depends on**: T13
**Requirement**: OFFR-01, OFFR-02
**Done when**:
- [x] Buyers see "Kaufanfrage senden" and "Preis vorschlagen" CTAs.
- [x] Sellers see active incoming offers with Accept/Decline/Counter actions.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): integrate negotiation bar into listing details`

#### T15: Implement active reservations dashboard view
**What**: Implement `/account/reservations` displaying user's active reservations with partner profile and cancellation action.
**Where**: `apps/web/src/app/account/reservations/page.tsx`
**Depends on**: T14
**Requirement**: OFFR-04
**Done when**:
- [x] Displays active reservations for buyer and seller with agreed price and coarse pickup area.
- [x] Provides cancellation modal with structured reason selector.
- [x] Server component test passes.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(offers): implement reservations dashboard page`

#### T16: Prove end-to-end negotiation journeys and add runbook
**What**: Implement Playwright E2E journeys covering buy intent, offer counter, atomic reservation, and cancellation.
**Where**: `apps/web/tests/marketplace-offers-reservations.spec.ts`
**Depends on**: T15
**Requirement**: OFFR-01, OFFR-02, OFFR-03, OFFR-04
**Done when**:
- [ ] Playwright E2E tests prove:
  - Buyer submitting purchase intent and seller accepting to reserve.
  - Buyer making offer, seller countering, and buyer accepting.
  - Reservation cancellation restoring listing to active.
  - Self-purchase prevention.
- [ ] Operational runbook added to `docs/operations/marketplace/offers-reservations.md`.
- [ ] All tests pass.
**Tests**: e2e
**Gate**: Full
**Commit**: `test(offers): prove end to end negotiation journeys and add runbook`
