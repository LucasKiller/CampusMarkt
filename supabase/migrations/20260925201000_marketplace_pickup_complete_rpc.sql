-- 20260925201000_marketplace_pickup_complete_rpc.sql
-- Feature 010: Pickup Completion RPC
-- Implements atomic seller-led pickup completion with canonical row locking (AD-015, PICK-02, PICK-03)

create or replace function marketplace_api.complete_pickup(
  p_reservation_id uuid,
  p_completion_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_res record;
  v_listing record;
  v_completed_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_reservation_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  if p_completion_note is not null and char_length(p_completion_note) > 500 then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  -- Canonical lock acquisition order: listing first, then reservation (AD-013, AD-015)
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

  -- Idempotency check: if already completed, return existing receipt
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

  v_completed_at := clock_timestamp();

  -- 1. Atomically update reservation to completed
  update marketplace.reservations
     set status = 'completed',
         completed_at = v_completed_at,
         completion_note = p_completion_note,
         updated_at = v_completed_at
   where id = p_reservation_id;

  -- 2. Atomically transition listing to sold
  update marketplace.listings
     set status = 'sold',
         updated_at = v_completed_at
   where id = v_res.listing_id;

  return jsonb_build_object(
    'reservationId', v_res.id,
    'listingId', v_res.listing_id,
    'status', 'completed',
    'agreedPriceCents', v_res.agreed_price_cents,
    'completedAt', v_completed_at
  );
end;
$$;

revoke all on function marketplace_api.complete_pickup(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.complete_pickup(uuid, text)
  to authenticated, service_role;
