-- 20260925200000_marketplace_pickup_completion.sql
-- Feature 010: Pickup Completion schema additions
-- Adds completed_at and completion_note columns and history indexes to marketplace.reservations

alter table marketplace.reservations
  add column if not exists completed_at timestamptz,
  add column if not exists completion_note text check (char_length(completion_note) <= 500);

-- Partial indexes for completed transaction history queries (AD-015, PICK-04)
create index if not exists idx_marketplace_reservations_completed_buyer
  on marketplace.reservations (buyer_id, completed_at desc)
  where status = 'completed';

create index if not exists idx_marketplace_reservations_completed_seller
  on marketplace.reservations (seller_id, completed_at desc)
  where status = 'completed';

create index if not exists idx_marketplace_reservations_completed
  on marketplace.reservations (buyer_id, seller_id, completed_at desc)
  where status = 'completed';

-- Note on RLS: Existing policy "Participants can view their reservations" on marketplace.reservations
-- enforces that only buyer_id and seller_id can access reservations (including completed state).
