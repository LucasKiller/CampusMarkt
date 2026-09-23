# Feature Design: 008-purchase-intent-offers-reservations

## 1. Architectural Context & Decisions

CampusMarkt adheres to a modular monolith architecture (AD-006) with decoupled domain packages (`@campusmarkt/domain`, `@campusmarkt/types`, `@campusmarkt/validation`), a Supabase/PostgreSQL backend (`marketplace` and `marketplace_api` schemas), and a Next.js App Router web application (`apps/web`).

### Key Decisions
- **AD-003**: Marketplace negotiation rules live outside page components in transport-neutral application/domain packages.
- **AD-006**: Self-hosted Supabase stack on a single budget VPS; keep database queries bounded and avoid external caching daemons (Redis).
- **AD-013**: In-database PostgreSQL atomic RPC (`marketplace_api.accept_offer`) using canonical row locking (`SELECT id FROM marketplace.listings WHERE id = ... FOR UPDATE`) coupled with a declarative partial unique index (`idx_one_active_reservation_per_listing ON marketplace.reservations(listing_id) WHERE status = 'active'`). Double-booking is mathematically impossible at the database engine level.

---

## 2. Domain Model & State Machines

### 2.1 Offer State Machine
```text
           [Buyer creates]
                 |
                 v
            +---------+  [Buyer withdraws]
            | PENDING |--------------------> [ WITHDRAWN ]
            +---------+
              |     |
[Seller accepts]   [Seller declines]
        |           |
        v           v
  [ ACCEPTED ]  [ DECLINED ]
        |
        | [Seller counters]
        +--------------------> [ COUNTERED ] ---> (New PENDING proposal)
        |
        | [Competitor offer accepted]
        +--------------------> [ SUPERSEDED ]
```

### 2.2 Reservation State Machine
```text
  [Offer / Intent Accepted]
              |
              v
        +----------+  [Buyer or Seller cancels]
        |  ACTIVE  |-----------------------------> [ CANCELLED ] (Listing -> 'active')
        +----------+
              |
              | [Pickup completed in Feature 010]
              v
        [ COMPLETED ] (Listing -> 'sold')
```

---

## 3. Database Layer & Schema

### 3.1 Migration: `20260923220000_marketplace_offers_and_reservations.sql`

```sql
create type marketplace.offer_status as enum (
  'pending',
  'accepted',
  'declined',
  'withdrawn',
  'countered',
  'superseded'
);

create type marketplace.reservation_status as enum (
  'active',
  'completed',
  'cancelled'
);

create table if not exists marketplace.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  parent_offer_id uuid references marketplace.offers(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  message text check (char_length(message) <= 500),
  status marketplace.offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketplace.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid references marketplace.offers(id) on delete set null,
  agreed_price_cents integer not null check (agreed_price_cents >= 0),
  status marketplace.reservation_status not null default 'active',
  cancellation_reason text,
  cancelled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invariant 5: Exactly ONE active reservation per listing
create unique index if not exists idx_one_active_reservation_per_listing
  on marketplace.reservations(listing_id)
  where status = 'active';

-- Indexes for performance
create index if not exists idx_marketplace_offers_listing on marketplace.offers(listing_id, created_at desc);
create index if not exists idx_marketplace_offers_buyer on marketplace.offers(buyer_id, created_at desc);
create index if not exists idx_marketplace_offers_seller on marketplace.offers(seller_id, created_at desc);
create index if not exists idx_marketplace_reservations_buyer on marketplace.reservations(buyer_id, created_at desc);
create index if not exists idx_marketplace_reservations_seller on marketplace.reservations(seller_id, created_at desc);

-- Enable RLS
alter table marketplace.offers enable row level security;
alter table marketplace.reservations enable row level security;

-- RLS: Only buyer and seller can see an offer
create policy "Participants can view their offers"
  on marketplace.offers for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- RLS: Only buyer and seller can view a reservation
create policy "Participants can view their reservations"
  on marketplace.reservations for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
```

### 3.2 Migration: `20260923221000_marketplace_negotiation_rpcs.sql`

```sql
-- 1. Create Offer / Purchase Intent RPC
create or replace function marketplace_api.create_offer(
  p_listing_id uuid,
  p_amount_cents integer,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_seller_id uuid;
  v_listing_status marketplace.listing_status;
  v_listing_price integer;
  v_offer_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  select seller_id, status, price_cents
    into v_seller_id, v_listing_status, v_listing_price
    from marketplace.listings
   where id = p_listing_id;

  if not found or v_listing_status = 'archived' then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_seller_id = v_user_id then
    raise exception 'CANNOT_NEGOTIATE_OWN_LISTING' using errcode = 'P0003';
  end if;

  if v_listing_status <> 'active' then
    raise exception 'LISTING_NOT_ACTIVE' using errcode = 'P0004';
  end if;

  if p_amount_cents < 0 or (v_listing_price is not null and p_amount_cents > v_listing_price) then
    raise exception 'INVALID_OFFER_AMOUNT' using errcode = 'P0005';
  end if;

  insert into marketplace.offers (
    listing_id, buyer_id, seller_id, amount_cents, message, status
  ) values (
    p_listing_id, v_user_id, v_seller_id, p_amount_cents, p_message, 'pending'
  ) returning id into v_offer_id;

  return jsonb_build_object(
    'offerId', v_offer_id,
    'listingId', p_listing_id,
    'amountCents', p_amount_cents,
    'status', 'pending'
  );
end;
$$;

-- 2. Accept Offer & Atomic Reservation Creation (AD-013)
create or replace function marketplace_api.accept_offer(
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_offer record;
  v_listing record;
  v_reservation_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Canonical lock hierarchy: lock listing row first!
  select l.*
    into v_listing
    from marketplace.listings l
    join marketplace.offers o on o.listing_id = l.id
   where o.id = p_offer_id
     for update of l;

  if not found then
    raise exception 'OFFER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_offer from marketplace.offers where id = p_offer_id;

  if v_offer.seller_id <> v_user_id and v_offer.buyer_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0006';
  end if;

  if v_offer.status <> 'pending' then
    raise exception 'OFFER_NOT_PENDING' using errcode = 'P0007';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'LISTING_ALREADY_RESERVED' using errcode = 'P0008';
  end if;

  -- 1. Create reservation
  insert into marketplace.reservations (
    listing_id, buyer_id, seller_id, offer_id, agreed_price_cents, status
  ) values (
    v_offer.listing_id, v_offer.buyer_id, v_offer.seller_id, v_offer.id, v_offer.amount_cents, 'active'
  ) returning id into v_reservation_id;

  -- 2. Update listing status to reserved
  update marketplace.listings
     set status = 'reserved', updated_at = now()
   where id = v_offer.listing_id;

  -- 3. Set accepted offer status
  update marketplace.offers
     set status = 'accepted', updated_at = now()
   where id = p_offer_id;

  -- 4. Supersede all other pending offers for this listing
  update marketplace.offers
     set status = 'superseded', updated_at = now()
   where listing_id = v_offer.listing_id
     and id <> p_offer_id
     and status = 'pending';

  return jsonb_build_object(
    'reservationId', v_reservation_id,
    'listingId', v_offer.listing_id,
    'agreedPriceCents', v_offer.amount_cents,
    'status', 'active'
  );
end;
$$;

-- 3. Cancel Reservation RPC
create or replace function marketplace_api.cancel_reservation(
  p_reservation_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_res record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Lock listing and reservation
  select r.* into v_res
    from marketplace.reservations r
    join marketplace.listings l on l.id = r.listing_id
   where r.id = p_reservation_id
     for update of l;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_res.buyer_id <> v_user_id and v_res.seller_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0006';
  end if;

  if v_res.status <> 'active' then
    raise exception 'RESERVATION_NOT_ACTIVE' using errcode = 'P0009';
  end if;

  -- Mark reservation cancelled
  update marketplace.reservations
     set status = 'cancelled',
         cancellation_reason = p_reason,
         cancelled_by = v_user_id,
         updated_at = now()
   where id = p_reservation_id;

  -- Restore listing to active
  update marketplace.listings
     set status = 'active', updated_at = now()
   where id = v_res.listing_id;

  return jsonb_build_object(
    'reservationId', p_reservation_id,
    'listingId', v_res.listing_id,
    'status', 'cancelled'
  );
end;
$$;
```

---

## 4. Application & API Layer

### 4.1 TypeScript Types (`packages/types/src/listings/offers.ts`)
- `OfferDTO`: `{ id, listingId, buyerId, sellerId, amountCents, message, status, createdAt }`
- `ReservationDTO`: `{ id, listingId, buyerId, sellerId, offerId, agreedPriceCents, status, createdAt }`
- `CreateOfferRequest`, `CounterOfferRequest`, `CancelReservationRequest`

### 4.2 Application Service (`MarketplaceNegotiationService`)
- Enforces rate limiting: 15 actions/minute per user.
- Enforces self-offer invariant: `buyer_id <> seller_id`.
- Coordinates telemetry: `offer.created`, `offer.accepted`, `reservation.cancelled`.

### 4.3 HTTP Routes (`apps/web/src/app/api/marketplace/`)
- `POST /api/marketplace/offers`: Create purchase intent or offer.
- `POST /api/marketplace/offers/[id]/accept`: Accept offer and atomically create reservation.
- `POST /api/marketplace/offers/[id]/counter`: Propose counteroffer.
- `POST /api/marketplace/offers/[id]/decline`: Decline offer.
- `POST /api/marketplace/offers/[id]/withdraw`: Withdraw offer.
- `POST /api/marketplace/reservations/[id]/cancel`: Cancel active reservation.

---

## 5. UI Components & User Journeys

- **`OfferModal` (`components/marketplace/negotiation/offer-modal.tsx`)**:
  - Modal offering "Kaufanfrage zum Festpreis" or "Preisvorschlag machen".
  - Accessible dialog with focus trap and price validation helper.
- **Listing Details Action Toolbar (`/listings/[id]`)**:
  - Integrated "Direkt kaufen" and "Preis vorschlagen" CTAs.
  - Contextual banner when user has a pending offer or active reservation.
- **Reservations Dashboard (`/account/reservations`)**:
  - Listing overview with partner display, agreed price, coarse pickup area, and "Reservierung stornieren" action.

---

## 6. Security & Concurrency Verification

- **Row Locks & Partial Unique Index**: Prevents duplicate reservations under concurrent clicks.
- **Canonical Lock Ordering**: Always locks `marketplace.listings` first by PK to eliminate circular deadlocks.
- **Privacy Boundary**: Excludes primary and institutional emails from all responses.
