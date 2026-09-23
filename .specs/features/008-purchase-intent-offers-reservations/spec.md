# Purchase Intent, Offers, and Reservations Specification

**Status:** Draft

## Problem Statement

Marketplace buyers and sellers need a structured, reliable, and mutually binding way to move from initial interest to an agreed pickup appointment without ambiguous chat negotiation, broken promises, or double reservations. Informal chat promises lead to wasted travel and missed sales. Participants need explicit digital states: buyers need to submit direct purchase intents (buy at asking price) or negotiate via structured price offers; sellers need to accept, decline, or counter; and acceptance must atomically lock the physical listing into an exclusive reservation for that buyer, preventing double-booking and superseding competing offers.

## Goals

- [ ] Enable registered buyers to submit direct purchase intent (buy at asking price) on `SELL` listings.
- [ ] Enable registered buyers to express interest in `GIVE_AWAY` listings to request a reservation.
- [ ] Support structured offer negotiation with price proposals, counter-offers, decline, and withdrawal states.
- [ ] Prevent self-negotiation: users cannot purchase, offer on, or reserve their own listings (Marketplace Invariant 2).
- [ ] Enforce atomic reservation exclusivity: exactly one active reservation can control a listing at a time (Marketplace Invariant 5, AD-013).
- [ ] Atomically mark competing pending offers as `superseded` when a listing is reserved.
- [ ] Allow either participant to cancel an active reservation with a structured reason, immediately restoring the listing to `ACTIVE` status.
- [ ] Exclude all private email addresses and internal identity hashes from negotiation API projections.
- [ ] Rate-limit offer and purchase intent mutations (max 15 proposals per minute per user) to prevent harassment and spam.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Digital payment processing or escrow | V1 transactions coordinate local in-person pickup with in-person payment (cash/direct transfer). No platform-held funds. |
| In-app realtime text chat | Owned by downstream Feature `009-messaging`. Offers provide structured financial proposals, not chat. |
| Pickup completion evidence and feedback | Owned by downstream Feature `010-pickup-completion`. |
| Automated time-based reservation expiry | Deferred to background worker infrastructure in future horizons; V1 relies on explicit buyer/seller cancellation. |
| Multi-item bundle offers | V1 supports single-listing negotiations only. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Concurrency & atomicity mechanism | PostgreSQL atomic RPC with `SELECT FOR UPDATE` & partial unique index | The Jury verdict (AD-013): guarantees physical impossibility of double-booking, sub-millisecond locks on budget VPS. | yes |
| Counteroffer depth | 1 active proposal per buyer-seller pair at any time; counteroffer supersedes previous proposal | Prevents branching negotiation trees; maintains one clear pending price point. | yes |
| Offer price bounds | Must be integer cents $> 0$ and $\le$ listing asking price | Offers must be realistic positive amounts; buyers cannot offer higher than asking price (they use Buy at Asking Price). | yes |
| Giveaway reservation initiation | Express interest with optional note; seller accepts to create reservation | `GIVE_AWAY` listings carry no price (Invariant 3); reservation locks item for recipient. | yes |
| Competing offer handling | Atomically marked `superseded` upon reservation creation | Informs competing buyers that the item is no longer available without hanging pending states. | yes |
| Reservation cancellation policy | Allowed by either party with structured reason (`no_show`, `changed_mind`, `scheduling_conflict`, `other`) | Restores item to active inventory so other students can purchase it. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Offer amount must be integer cents $> 0$ and $\le$ asking price; message text trimmed and limited to 500 characters; cancellation reason validated against allowed enums. |
| Failure / partial-failure states | If a listing is already reserved when an offer acceptance is attempted, the transaction aborts with HTTP 409 (`LISTING_ALREADY_RESERVED`). |
| Idempotency / retry handling | Duplicate identical offer submissions within 5 seconds are rejected as duplicates; accepting an already accepted offer is safely idempotent. |
| Auth boundaries & rate limits | All negotiation mutations require an authenticated session; guest clicks redirect to `/login?next=...`; mutations rate-limited to 15 req/min per user. |
| Concurrency / ordering | Canonical row lock hierarchy (`SELECT id FROM marketplace.listings WHERE id = ... FOR UPDATE`) prevents deadlocks under concurrent requests. |
| Data lifecycle & cascades | Offers and reservations cascade delete upon listing deletion (`ON DELETE CASCADE`); soft-deleted (`archived`) listings immediately reject negotiation mutations. |
| Observability | Structured telemetry logs for negotiation events (`offer.created`, `offer.countered`, `offer.accepted`, `reservation.created`, `reservation.cancelled`) without PII. |
| Privacy boundary | Private emails and internal hashes excluded; buyers and sellers see only each other's public display names, avatars, and university trust badges. |

---

## User Stories

### P1: Direct purchase intent and free-item interest ⭐ MVP

**User Story**: As a buyer, I want to submit a direct purchase intent to buy an item at its asking price, or express interest in a free item, so that the seller can quickly accept and hold it for me.

**Why P1**: Primary conversion path for buyers who agree with the seller's asking price or seek free goods.

**Acceptance Criteria**:

1. WHEN an authenticated buyer clicks "Kaufanfrage senden" on an active `SELL` listing they do not own THEN the system SHALL create a purchase intent offer with `amount_cents` equal to the listing's `price_cents` and status `PENDING`.
2. WHEN an authenticated buyer clicks "Interesse bekunden" on an active `GIVE_AWAY` listing they do not own THEN the system SHALL create a free reservation request with `amount_cents = 0` and status `PENDING`.
3. IF an authenticated user attempts to submit purchase intent or interest on a listing they own THEN the system SHALL reject the request with HTTP 400 and code `CANNOT_NEGOTIATE_OWN_LISTING`.
4. IF an unauthenticated visitor clicks the buy or interest button THEN the system SHALL redirect the visitor to `/login?next=/listings/[id]`.
5. The system SHALL exclude all primary account emails, institutional verification emails, and internal identity hashes from purchase intent responses.

---

### P1: Structured price negotiation and counteroffers ⭐ MVP

**User Story**: As a buyer, I want to propose an offer below the asking price, and as a seller, I want to counter-propose or decline so that we can agree on a fair local price before meeting.

**Why P1**: Peer-to-peer marketplaces require bargaining flexibility to clear inventory.

**Acceptance Criteria**:

1. WHEN an authenticated buyer submits an offer with `amount_cents` strictly greater than 0 and less than or equal to the asking price THEN the system SHALL record the offer with status `PENDING`.
2. IF a buyer submits an offer with `amount_cents <= 0` or greater than the asking price THEN the system SHALL reject the request with HTTP 400 and actionable price validation errors.
3. WHEN a seller receives a pending offer and submits a counteroffer with a new price THEN the system SHALL transition the previous offer to `COUNTERED` and create the new counteroffer with status `PENDING` linked to the original proposal.
4. WHEN a seller declines a pending offer THEN the system SHALL transition the offer status to `DECLINED`.
5. WHEN a buyer withdraws their pending offer before the seller responds THEN the system SHALL transition the offer status to `WITHDRAWN`.
6. IF a user attempts to submit more than 15 negotiation actions in a single minute THEN the system SHALL reject the request with HTTP 429 and `Retry-After: 60`.

---

### P1: Atomic one-recipient reservation exclusivity ⭐ MVP

**User Story**: As a buyer or seller whose offer was accepted, I want the listing to be exclusively reserved for our pickup so that no one else can purchase or reserve it concurrently.

**Why P1**: Eliminates double-booking and enforces Marketplace Invariant 5 (AD-013).

**Acceptance Criteria**:

1. WHEN a seller accepts a pending offer or purchase intent THEN the system SHALL atomically create an active reservation, transition the listing status from `active` to `reserved`, and set the offer status to `ACCEPTED`.
2. WHILE a listing has status `reserved`, the system SHALL reject all other offer acceptance or reservation attempts with HTTP 409 and code `LISTING_ALREADY_RESERVED`.
3. WHEN a listing transition to `reserved` completes THEN the system SHALL atomically transition all other pending offers for that listing to status `SUPERSEDED`.
4. The system SHALL enforce database-level uniqueness via partial unique index `(listing_id) WHERE status = 'active'` on `marketplace.reservations` such that two concurrent active reservations cannot coexist.

---

### P1: Reservation management and cancellation ⭐ MVP

**User Story**: As a buyer or seller with an active reservation, I want to view the agreed pickup terms and cancel if circumstances change so that the listing can be returned to active inventory.

**Why P1**: Handles no-shows, schedule conflicts, and inventory release cleanly.

**Acceptance Criteria**:

1. WHEN an authorized participant (buyer or seller) views an active reservation THEN the system SHALL display the agreed price, listing title, coarse pickup area, and partner display profile with trust badge.
2. WHEN an authorized participant submits a cancellation with an approved reason (`no_show`, `changed_mind`, `scheduling_conflict`, `other`) THEN the system SHALL transition the reservation status to `CANCELLED` and atomically restore the listing status to `active`.
3. IF an unauthorized user (neither the buyer nor the seller) attempts to view or cancel a reservation THEN the system SHALL reject the request with HTTP 403 `FORBIDDEN`.
4. IF a seller archives a listing that has an active reservation THEN the system SHALL transition the reservation to `CANCELLED` with reason `listing_archived`.

---

## Edge Cases

1. **Simultaneous acceptance race condition**: If two buyers submit purchase intents simultaneously, PostgreSQL row-level lock (`SELECT FOR UPDATE`) serializes the transactions; the first succeeds and the second fails with HTTP 409.
2. **Buyer submits offer while seller edits listing price**: If listing asking price is reduced below a pending offer, the pending offer remains valid at its specified amount or can be accepted/countered.
3. **Rapid repeated clicks on "Accept"**: The database RPC evaluates the current offer status within the row lock; repeated acceptance attempts return the existing reservation idempotently without error.
4. **Cancellation during offline network transition**: Optimistic UI reverts if network fails, displaying an error toast; state is refreshed from server upon reconnection.
5. **Deleted user cascade**: If a buyer or seller account is deleted, active reservations are transitioned to `CANCELLED` and listing status is restored if the deleted user was the buyer.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| OFFR-01 | Purchase intent (buy at asking price) and free item interest request | P1 Story 1: AC1, AC2, AC3, AC4, AC5 | Database RPC / API | pending |
| OFFR-02 | Structured price negotiation (proposals, counteroffers, decline, withdraw) | P1 Story 2: AC1, AC2, AC3, AC4, AC5, AC6 | Database RPC / Domain | pending |
| OFFR-03 | Atomic reservation exclusivity and competing offer supersession (AD-013) | P1 Story 3: AC1, AC2, AC3, AC4 | Database RPC / PostgreSQL | pending |
| OFFR-04 | Reservation management, cancellation reason, and listing relisting | P1 Story 4: AC1, AC2, AC3, AC4 | UI Pages / Application | pending |
| OFFR-05 | Public boundary security, self-negotiation prohibition, and rate limits | P1 Story 1: AC3, AC5, P1 Story 2: AC6 | Security / Application | pending |
