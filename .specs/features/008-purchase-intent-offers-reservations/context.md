# Feature Context: 008-purchase-intent-offers-reservations

## 1. Problem Summary

In peer-to-peer campus marketplaces, the transition from initial interest to a confirmed in-person transaction is fraught with ambiguity, ghosting, and double-booking. When buyers and sellers negotiate informally through freeform chat messages without explicit structured states:
- Sellers verbally promise items to multiple interested students simultaneously, resulting in wasted trips and broken trust.
- Buyers lack certainty on whether an offer was accepted, whether an item is on hold for them, or if the seller is still entertaining higher bids.
- Sellers have no structured mechanism to counter-offer or set a hard reservation that temporarily locks the item for pickup.

Feature `008-purchase-intent-offers-reservations` establishes the structured negotiation and reservation engine of CampusMarkt V1, enabling buyers and sellers to make explicit offers, buy at asking price, negotiate counter-offers, and atomically reserve items with mathematical single-buyer exclusivity.

---

## 2. Target Users & Pain Points

- **Student Buyers**:
  - *Pain*: Offering on a book or bike, only to find the seller sold it to someone else without notice while they were on their way to campus.
  - *Need*: Clear, binding reservation status showing the item is exclusively held for them during pickup.
- **Student Sellers**:
  - *Pain*: Fielding dozens of informal messages ("Noch da?", "Was letzte Preis?"), losing track of who offered what, and dealing with flaky buyers.
  - *Need*: A structured inbox of concrete offers, 1-click accept/decline/counter actions, and automated holding of the listing once an agreement is reached.
- **Community Safety & Trust**:
  - *Invariant*: In-person pickup with no platform-held funds. Reservations coordinate holding the physical item; payments are settled in cash or direct transfer at handover.

---

## 3. Product Policies & Engineering Invariants

1. **Marketplace Invariants (docs/product/01-domain-model.md)**:
   - A user cannot buy, offer on, or reserve their own listing (`buyer_id <> seller_id`) (Invariant 2).
   - `GIVE_AWAY` never carries a monetary price; reservation is initiated via expression of interest (Invariant 3).
   - `SELL` requires an exact decimal asking price in euros; offers must be non-negative integer cents (`amount_cents > 0`) (Invariant 4).
   - **Only one active reservation can control a listing at a time** (Invariant 5).
   - Structured state changes must be atomic and valid from the current state (Invariant 6).
   - Moderation removal and owner archiving reject or cancel active negotiations (Invariant 9).
2. **Concurrency & Atomicity (AD-013)**:
   - Enforced by PostgreSQL atomic RPCs using canonical row locking (`SELECT id FROM marketplace.listings WHERE id = ... FOR UPDATE`) and a declarative partial unique index (`idx_one_active_reservation_per_listing ON marketplace.reservations(listing_id) WHERE status = 'active'`).
   - Double reservations are physically impossible at the database engine level.
   - When an offer is accepted, all other pending offers for that listing are atomically marked `superseded`.
3. **Reservation Lifecycle**:
   - `ACTIVE -> COMPLETED | CANCELLED`.
   - Either participant (buyer or seller) can cancel an active reservation with a structured reason (e.g., buyer no-show, change of mind, scheduling conflict), returning the listing to `ACTIVE` status.
4. **V1 Financial Boundary**:
   - No funds are processed, held, escrowed, or refunded by CampusMarkt.
   - Agreed price is a binding commitment for physical cash/transfer exchange at local pickup.

---

## 4. Upstream Dependencies

- `001-web-supabase-foundation`: Base Next.js App Router, Tailwind, Supabase client infrastructure, testing harness.
- `002-identity-accounts`: Session management, authenticated user context (`auth.uid()`).
- `003-university-verification`: Trust badge display on negotiation cards.
- `004-listing-creation-management`: `marketplace.listings` table and listing status state machine (`active`, `reserved`, `sold`, `archived`).
- `005-marketplace-feed-listing-details`: Listing details view (`/listings/[id]`) hosting purchase intent and offer CTAs.
- `007-favorites`: Saved listings dashboard.

---

## 5. Downstream Dependents

- `009-messaging`: In-app conversation linked to the structured reservation context.
- `010-pickup-completion`: Marking the reservation `completed` and the listing `sold` following successful physical exchange.
