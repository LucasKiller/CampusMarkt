create schema if not exists marketplace;
create schema if not exists marketplace_api;

revoke all on schema marketplace from public, anon, authenticated;
revoke all on schema marketplace_api from public, anon, authenticated, service_role;
grant usage on schema marketplace_api to anon, authenticated, service_role;

create table marketplace.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references identity.accounts(auth_user_id) on delete cascade,
  listing_type text not null
    check (listing_type in ('SELL', 'GIVE_AWAY', 'WANTED')),
  title text not null
    check (char_length(title) between 5 and 100),
  description text not null
    check (char_length(description) between 10 and 2000),
  category text not null
    check (category in (
      'furniture',
      'electronics',
      'books_studies',
      'bicycles_mobility',
      'clothing',
      'home_kitchen',
      'other'
    )),
  pickup_area text not null
    check (pickup_area in (
      'innenstadt',
      'campus_tu_altgebaeude',
      'campus_nord_bienrode',
      'oestliches_ringgebiet',
      'westliches_ringgebiet',
      'noerdliches_ringgebiet_siegfriedviertel',
      'viewegs_garten_bebelhof',
      'heidberg_melverode',
      'weststadt',
      'lehndorf_kanzlerfeld'
    )),
  condition text not null
    check (condition in ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR')),
  price_cents integer
    check (price_cents is null or price_cents between 0 and 1000000),
  status text not null default 'active'
    check (status in ('active', 'reserved', 'sold', 'archived')),
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  check (
    (listing_type = 'SELL' and price_cents is not null and price_cents between 50 and 1000000) or
    (listing_type = 'GIVE_AWAY' and (price_cents is null or price_cents = 0)) or
    (listing_type = 'WANTED' and (price_cents is null or price_cents between 50 and 1000000))
  )
);

create index listings_owner_id_idx
  on marketplace.listings (owner_id);

create index listings_status_created_at_idx
  on marketplace.listings (status, created_at desc);

create index listings_category_status_idx
  on marketplace.listings (category, status);

create table marketplace.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null
    references marketplace.listings(id) on delete cascade,
  storage_path text not null
    check (char_length(storage_path) between 1 and 500),
  position smallint not null
    check (position between 0 and 7),
  created_at timestamptz not null default transaction_timestamp(),
  unique (listing_id, position),
  unique (listing_id, storage_path)
);

create index listing_media_listing_id_idx
  on marketplace.listing_media (listing_id, position);

alter table marketplace.listings enable row level security;
alter table marketplace.listings force row level security;
alter table marketplace.listing_media enable row level security;
alter table marketplace.listing_media force row level security;

revoke all on all tables in schema marketplace from public, anon, authenticated;
grant select, insert, update, delete on table marketplace.listings to service_role;
grant select, insert, update, delete on table marketplace.listing_media to service_role;
