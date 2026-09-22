-- Add stored generated search_vector column and indexes for full-text search and multi-facet filtering

alter table marketplace.listings
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(description, '')), 'B')
  ) stored;

create index if not exists listings_search_vector_gin_idx
  on marketplace.listings using gin (search_vector)
  where status in ('active', 'reserved');

create index if not exists listings_price_cents_idx
  on marketplace.listings (price_cents)
  where status in ('active', 'reserved');

create index if not exists listings_condition_idx
  on marketplace.listings (condition)
  where status in ('active', 'reserved');
