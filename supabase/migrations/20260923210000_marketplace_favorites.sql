create table if not exists marketplace.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  created_at timestamptz not null default transaction_timestamp(),
  primary key (user_id, listing_id)
);

-- Index for ordering a user's favorites by save date
create index if not exists idx_marketplace_favorites_user_created 
  on marketplace.favorites (user_id, created_at desc);

-- Index for reverse lookup on listing deletions/status
create index if not exists idx_marketplace_favorites_listing 
  on marketplace.favorites (listing_id);

-- Enable Row-Level Security
alter table marketplace.favorites enable row level security;
alter table marketplace.favorites force row level security;

-- Grants
grant select, insert, delete on table marketplace.favorites to authenticated;
grant select, insert, update, delete on table marketplace.favorites to service_role;

-- RLS Policies: strictly owner-scoped
create policy "Users can view own favorites"
  on marketplace.favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on marketplace.favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on marketplace.favorites for delete
  to authenticated
  using (auth.uid() = user_id);
