do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'offer_status' and n.nspname = 'marketplace'
  ) then
    create type marketplace.offer_status as enum (
      'pending',
      'accepted',
      'declined',
      'withdrawn',
      'countered',
      'superseded'
    );
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'reservation_status' and n.nspname = 'marketplace'
  ) then
    create type marketplace.reservation_status as enum (
      'active',
      'completed',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists marketplace.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  parent_offer_id uuid references marketplace.offers(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  message text check (char_length(message) <= 500),
  status marketplace.offer_status not null default 'pending',
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp()
);

create table if not exists marketplace.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid references marketplace.offers(id) on delete set null,
  agreed_price_cents integer not null check (agreed_price_cents >= 0),
  status marketplace.reservation_status not null default 'active',
  cancellation_reason text check (char_length(cancellation_reason) <= 500),
  cancelled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp()
);

-- Invariant 5: Exactly ONE active reservation per listing (AD-013)
create unique index if not exists idx_one_active_reservation_per_listing
  on marketplace.reservations(listing_id)
  where status = 'active';

-- Indexes for performance and lookup
create index if not exists idx_marketplace_offers_listing
  on marketplace.offers (listing_id, created_at desc);

create index if not exists idx_marketplace_offers_buyer
  on marketplace.offers (buyer_id, created_at desc);

create index if not exists idx_marketplace_offers_seller
  on marketplace.offers (seller_id, created_at desc);

create index if not exists idx_marketplace_reservations_listing
  on marketplace.reservations (listing_id);

create index if not exists idx_marketplace_reservations_buyer
  on marketplace.reservations (buyer_id, created_at desc);

create index if not exists idx_marketplace_reservations_seller
  on marketplace.reservations (seller_id, created_at desc);

-- Enable and force RLS
alter table marketplace.offers enable row level security;
alter table marketplace.offers force row level security;
alter table marketplace.reservations enable row level security;
alter table marketplace.reservations force row level security;

-- Grants
grant select on table marketplace.offers to authenticated;
grant select, insert, update, delete on table marketplace.offers to service_role;

grant select on table marketplace.reservations to authenticated;
grant select, insert, update, delete on table marketplace.reservations to service_role;

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
