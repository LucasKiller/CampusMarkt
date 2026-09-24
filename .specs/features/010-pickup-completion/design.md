# Feature Design: 010-pickup-completion

## 1. Architectural Context & Decisions

CampusMarkt adheres to a modular monolith architecture (AD-006) with decoupled domain packages (`@campusmarkt/domain`, `@campusmarkt/types`, `@campusmarkt/validation`), a Supabase/PostgreSQL backend (`marketplace` and `marketplace_api` schemas), and a Next.js App Router web application (`apps/web`).

### Key Architecture Decisions
- **AD-006**: Single VPS deployment without background daemon bloat.
- **AD-009**: Database RPC boundary (`marketplace_api`) and transactional integrity.
- **AD-013**: Atomic reservation exclusivity using row-level locking on `marketplace.listings`.
- **AD-015**: In-person pickup completion is seller-led unilateral completion executed via an atomic PostgreSQL RPC (`marketplace_api.complete_pickup`). Upon in-person exchange and cash/direct payment handover, the seller confirms completion, which acquires canonical row locks (`SELECT id FROM marketplace.listings WHERE id = ... FOR UPDATE` and `marketplace.reservations FOR UPDATE`) and atomically transitions `marketplace.reservations.status = 'completed'` and `marketplace.listings.status = 'sold'` in a single ACID transaction. The buyer receives instant realtime notification / UI receipt and sees the completed purchase in their transaction history. Pre-completion cancellation remains symmetrically available to either party until the completion transaction commits.

---

## 2. Domain Model & State Transitions

### 2.1 State Machines
```text
Reservation Status:
  +--------+   Seller completes handover (AD-015)
  | ACTIVE |-------------------------------------> [ COMPLETED ] (Terminal)
  +--------+
      |
      | Buyer or Seller cancels pre-handover
      v
  [ CANCELLED ] (Terminal, Listing -> ACTIVE)

Listing Status:
  +----------+   Seller completes handover
  | RESERVED |-----------------------------------> [ SOLD ] (Terminal)
  +----------+
```

### 2.2 Recommended Campus Pickup Spots
Pre-defined safe public campus locations at TU Braunschweig:
- `MENSA_1`: "Mensa 1 Katharinenstraße (Hauptfoyer / Vorplatz)"
- `UNIVERSITAETSPLATZ`: "Universitätsplatz (Vor dem Forumsgebäude)"
- `UB_FOYER`: "Universitätsbibliothek (Universitätsplatz - Eingangsbereich)"
- `CAMPUS_NORD`: "Campus Nord (Bienroder Weg - Mensa 2 Vorplatz)"

---

## 3. Database Layer & Schema

### 3.1 Migration: `20260925200000_marketplace_pickup_completion.sql`

```sql
-- Ensure completed_at column exists on reservations
alter table marketplace.reservations
  add column if not exists completed_at timestamptz,
  add column if not exists completion_note text check (char_length(completion_note) <= 500);

-- Partial index for fast history queries
create index if not exists idx_marketplace_reservations_completed
  on marketplace.reservations (buyer_id, seller_id, completed_at desc)
  where status = 'completed';

-- RPC: Complete Pickup
create or replace function marketplace_api.complete_pickup(
  p_reservation_id uuid,
  p_completion_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_res record;
  v_listing record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Canonical lock acquisition order: listing first, then reservation
  select l.* into v_listing
    from marketplace.listings l
    join marketplace.reservations r on r.listing_id = l.id
   where r.id = p_reservation_id
     for update of l;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_res
    from marketplace.reservations
   where id = p_reservation_id
     for update;

  -- Authority check: Only seller can complete pickup (AD-015)
  if v_res.seller_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0003';
  end if;

  -- Idempotency check: if already completed, return receipt
  if v_res.status = 'completed' then
    return jsonb_build_object(
      'reservationId', v_res.id,
      'listingId', v_res.listing_id,
      'status', 'completed',
      'agreedPriceCents', v_res.agreed_price_cents,
      'completedAt', v_res.completed_at
    );
  end if;

  -- Invariant check: reservation must be active
  if v_res.status <> 'active' then
    raise exception 'RESERVATION_NOT_ACTIVE' using errcode = 'P0004';
  end if;

  -- 1. Update reservation to completed
  update marketplace.reservations
     set status = 'completed',
         completed_at = now(),
         completion_note = p_completion_note,
         updated_at = now()
   where id = p_reservation_id;

  -- 2. Update listing to sold
  update marketplace.listings
     set status = 'sold',
         updated_at = now()
   where id = v_res.listing_id;

  return jsonb_build_object(
    'reservationId', v_res.id,
    'listingId', v_res.listing_id,
    'status', 'completed',
    'agreedPriceCents', v_res.agreed_price_cents,
    'completedAt', now()
  );
end;
$$;
```

---

## 4. Application & Server Services

### 4.1 Transport DTOs (`packages/types/src/listings/pickup.ts`)
- `CompletePickupRequest`: `{ completionNote?: string }`.
- `TransactionReceiptDTO`: `{ reservationId: string, listingId: string, listingTitle: string, listingType: ListingType, agreedPriceCents: number, status: 'completed', partner: PublicProfileDTO, pickupArea: PickupArea, completedAt: string, completionNote?: string }`.
- `SafePickupGuidanceDTO`: structured recommendations and spot definitions.

### 4.2 Application Service (`MarketplacePickupService`)
- Coordinates validation (`validateCompletePickupInput`).
- Rate limiting check: 15 actions per 60 seconds per user.
- Calls `MarketplacePickupRepository`.
- Publishes telemetry events: `marketplace.pickup.completed`.

---

## 5. UI Components & User Journeys

### 5.1 Safe Pickup Guidance Component (`safe-pickup-checklist.tsx`)
- Surfaced prominently on active reservation cards and conversation headers.
- Lists 4 core rules:
  1. Treffpunkt an belebten Campus-Orten (Mensa 1, Universitätsplatz, Universitätsbibliothek).
  2. Begutachtung vor der Bezahlung.
  3. Barzahlung oder Sofortüberweisung bei Übergabe. Niemals im Voraus zahlen!
  4. Tageslicht-Treffen bevorzugen.

### 5.2 Seller Handover Completion Button & Modal
- Rendered on the seller's active reservation card in `/account/reservations` and within the sticky negotiation bar on `/messages/[id]`.
- Click opens confirmation dialog: "Übergabe und Bezahlung bestätigen. Artikel wird als verkauft markiert."
- Triggers `POST /api/marketplace/reservations/[id]/complete`.

### 5.3 Transaction History View (`/account/reservations?tab=completed`)
- Accessible tabbed interface: "Aktiv" vs. "Abgeschlossen".
- Completed tab displays past sales and past purchases with partner name, trust badge, date, and agreed price.

### 5.4 Listing Details Sold Banner
- If listing status is `sold`, `/listings/[id]` renders a distinctive "Verkauft" banner.
- All buyer action buttons are hidden, and buyer identity is never revealed.
