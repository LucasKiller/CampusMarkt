-- Composite partial indexes on marketplace.listings for deterministic keyset feed queries and filtering

create index if not exists listings_feed_keyset_idx
  on marketplace.listings (created_at desc, id desc)
  where status in ('active', 'reserved');

create index if not exists listings_feed_category_idx
  on marketplace.listings (category, created_at desc, id desc)
  where status in ('active', 'reserved');

create index if not exists listings_feed_area_idx
  on marketplace.listings (pickup_area, created_at desc, id desc)
  where status in ('active', 'reserved');

create index if not exists listings_feed_type_idx
  on marketplace.listings (listing_type, created_at desc, id desc)
  where status in ('active', 'reserved');
