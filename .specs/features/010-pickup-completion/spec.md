# Pickup Completion Specification

**Status:** Draft

## Problem Statement

When a physical item on CampusMarkt is reserved and participants coordinate meeting details, they need a safe, clear, and reliable protocol to conclude the in-person handover. Without clear guidance, students risk meeting in isolated areas or facing pressure to prepay. Once the physical exchange occurs and cash/payment is settled, participants need a definitive, atomic action to mark the item as sold and the reservation as completed, terminating active negotiation, archiving the listing, and generating durable purchase and sale history records.

## Goals

- [ ] Surface prominent safe-pickup guidance on reservation details and chat threads (public campus locations, daylight meetings, inspection before payment, zero prepayment).
- [ ] Implement seller-led completion via atomic PostgreSQL RPC (`marketplace_api.complete_pickup`).
- [ ] Atomically transition reservation status from `ACTIVE` to `COMPLETED` and listing status from `RESERVED` to `SOLD` (AD-015).
- [ ] Serialise concurrent actions: reject cancellation on completed reservations and reject completion on cancelled/inactive reservations via row-level locks.
- [ ] Provide a dedicated purchase and sales history view in `/account/reservations` with structured transaction receipts.
- [ ] Update public listing details view for `SOLD` items: display "Verkauft" status banner, disable all negotiation actions, and protect buyer privacy.
- [ ] Enforce strict data boundary: zero platform-held funds, no online escrow, and complete exclusion of private emails or exact addresses.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Platform-mediated online payments / escrow | V1 transactions are strictly in-person cash or direct transfer. No platform-held funds. |
| QR or numeric cryptographic handover codes (`HANDOVER_TOKEN`) | Deferred to Horizon 10 (Protected Payment & Handover). |
| User reviews, reputation scoring, and star ratings | Deferred beyond V1 per product policy (docs/product/02-mvp-scope.md). |
| Shipping or parcel delivery coordination | CampusMarkt V1 is local-first in-person pickup in Braunschweig. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Completion authority | Seller-led unilateral completion | The Jury decision (AD-015): in cash exchanges, seller holds physical inventory; eliminates buyer ghosting deadlocks and daemon overhead. | yes |
| Financial boundary | Zero platform-held funds | Marketplace Policy (docs/product/03-marketplace-policy.md): CampusMarkt does not hold, escrow, or process payments in V1. | yes |
| Campus pickup spots | Pre-defined recommendations (Mensa 1, Universitätsplatz, Universitätsbibliothek) | Well-lit, high-traffic public locations at TU Braunschweig. | yes |
| Terminality | `COMPLETED` and `SOLD` are terminal states | Once handed over, the item cannot be re-reserved or cancelled. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Reservation ID must be a valid UUID; completion note (optional) trimmed to max 500 characters. |
| Failure / partial-failure states | If a seller attempts to complete an already cancelled or non-existent reservation, return HTTP 409 `RESERVATION_NOT_ACTIVE`. |
| Idempotency / retry handling | Repeated calls to `complete_pickup` by the seller on an already completed reservation return HTTP 200 with the existing completed receipt. |
| Auth boundaries & rate limits | Only the authorized seller (`auth.uid() = seller_id`) can complete pickup; non-sellers receive HTTP 403 `FORBIDDEN`. Rate limited to 15 req/min. |
| Concurrency / ordering | Canonical row lock hierarchy (`SELECT id FROM marketplace.listings WHERE id = ... FOR UPDATE` and `marketplace.reservations FOR UPDATE`) guarantees race immunity against concurrent cancellations. |
| Data lifecycle & cascades | Completed reservations retain audit records; listing status moves to `sold` and is excluded from active feed queries. |
| Observability | Telemetry records `pickup.completed` events with agreed price, listing ID, and coarse pickup area without logging PII. |
| Privacy boundary | Public views never disclose buyer identity on sold listings; only seller and buyer can view the completed reservation receipt. |

---

## User Stories

### P1: Safe Pickup Guidance and Meeting Recommendations ⭐ MVP

As a marketplace participant preparing to meet for an exchange,  
I want clear, visible guidance on safe campus meeting practices and locations,  
So that I can conduct the exchange safely without risk of fraud or uncomfortable situations.

#### Acceptance Criteria

- **WHEN** an authorized buyer or seller views an active reservation or associated conversation thread,  
  **THEN** the system displays a prominent "Sichere Übergabe" (Safe Handover) checklist.
- **WHEN** the safe pickup checklist is rendered,  
  **THEN** it explicitly recommends well-frequented campus locations (e.g. Mensa 1 Katharinenstraße, Universitätsplatz, Universitätsbibliothek foyer), daylight meetings, physical inspection before payment, and warns never to send funds in advance.
- **WHEN** viewing the pickup area,  
  **THEN** it displays only the coarse district/campus area (e.g. "Campus Nord / Bienrode") without revealing private street addresses.

---

### P1: Seller-Led Handover Completion ⭐ MVP

As a seller who has met the buyer, handed over the item, and received payment,  
I want to mark the handover as completed,  
So that my item is recorded as sold and my active reservations list is cleared.

#### Acceptance Criteria

- **WHEN** an authenticated seller submits a completion request for an active reservation,  
  **THEN** the system atomically updates `marketplace.reservations.status = 'completed'` with `completed_at = now()` and `marketplace.listings.status = 'sold'`, returning HTTP 200 with the completed transaction receipt.
- **WHEN** a buyer or non-participant attempts to trigger `complete_pickup`,  
  **THEN** the request is rejected with HTTP 403 `FORBIDDEN`.
- **WHEN** an unauthenticated visitor attempts to trigger `complete_pickup`,  
  **THEN** the request is rejected with HTTP 401 `UNAUTHENTICATED`.
- **WHEN** completion succeeds,  
  **THEN** the listing is immediately excluded from the active discovery feed and search results.

---

### P1: Concurrency Control and Race Serialization ⭐ MVP

As a marketplace participant,  
I want simultaneous completion and cancellation attempts to be handled deterministically,  
So that transaction state never becomes corrupt or desynchronized.

#### Acceptance Criteria

- **WHEN** a seller completes a reservation while a buyer simultaneously attempts to cancel it,  
  **THEN** the database row locks enforce strict sequential execution: if completion commits first, the cancellation attempt is rejected with HTTP 409 and code `RESERVATION_ALREADY_COMPLETED`.
- **WHEN** a buyer cancels a reservation while a seller simultaneously attempts to complete it,  
  **THEN** if cancellation commits first, the completion attempt is rejected with HTTP 409 and code `RESERVATION_NOT_ACTIVE`.
- **WHEN** a seller repeatedly clicks "Übergabe abschließen",  
  **THEN** the operation is idempotent and returns the existing completed reservation without generating duplicate records or throwing 500 errors.

---

### P1: Completed Transaction History and Receipts ⭐ MVP

As a buyer or seller who has completed transactions,  
I want to view my past purchases and sales,  
So that I have a clear personal record of my campus marketplace activity.

#### Acceptance Criteria

- **WHEN** an authenticated user visits `/account/reservations?tab=completed`,  
  **THEN** the view displays both completed purchases (where user was buyer) and completed sales (where user was seller), sorted by `completed_at DESC`.
- **WHEN** a completed reservation card is rendered,  
  **THEN** it displays the listing title, agreed price (or "Kostenlos"), completion date, coarse pickup area, and partner display name with university trust badge.
- **WHEN** an unauthorized user attempts to view a completed reservation receipt,  
  **THEN** the request is rejected with HTTP 403 `FORBIDDEN`.

---

### P1: Public Listing State Updates and Privacy Boundary ⭐ MVP

As a visitor browsing the marketplace,  
I want to see when an item is sold,  
While ensuring the privacy of the buyer is completely protected.

#### Acceptance Criteria

- **WHEN** a visitor views the listing details page (`/listings/[id]`) for a completed item,  
  **THEN** the page displays a prominent "Verkauft" (Sold) banner and hides/disables all "Kaufanfrage", "Preis vorschlagen", and "Nachricht schreiben" actions.
- **WHEN** querying public listing details for a sold listing,  
  **THEN** the API response completely omits buyer identity, buyer profile data, and transaction price adjustments, preserving 100% buyer privacy.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| PICK-01 | Safe pickup guidance and campus meeting recommendations | P1 Story 1: AC1, AC2, AC3 | UI Components / Domain | pending |
| PICK-02 | Seller-led handover completion and atomic sold transition (AD-015) | P1 Story 2: AC1, AC2, AC3, AC4 | Database RPC / API | pending |
| PICK-03 | Concurrency row-level locking, race serialization, and idempotency | P1 Story 3: AC1, AC2, AC3 | Database RPC / PostgreSQL | pending |
| PICK-04 | Completed transaction history and receipts view (`/account/reservations`) | P1 Story 4: AC1, AC2, AC3 | UI Pages / Application | pending |
| PICK-05 | Public listing sold state banner and buyer privacy protection | P1 Story 5: AC1, AC2 | UI Pages / Security | pending |
