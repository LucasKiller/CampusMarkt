-- 1. Accept Offer RPC & Atomic Reservation Creation (AD-013)
create or replace function marketplace_api.accept_offer(
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
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

  if p_offer_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  -- Canonical lock hierarchy: lock listing row first via FOR UPDATE
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

  -- Safe idempotency: if offer was already accepted, return existing active reservation
  if v_offer.status = 'accepted' then
    select id into v_reservation_id
      from marketplace.reservations
     where offer_id = p_offer_id and status = 'active';
    if found then
      return jsonb_build_object(
        'reservationId', v_reservation_id,
        'listingId', v_offer.listing_id,
        'agreedPriceCents', v_offer.amount_cents,
        'status', 'active'
      );
    end if;
  end if;

  if v_offer.status <> 'pending' then
    raise exception 'OFFER_NOT_PENDING' using errcode = 'P0007';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'LISTING_ALREADY_RESERVED' using errcode = 'P0008';
  end if;

  -- 1. Create active reservation
  insert into marketplace.reservations (
    listing_id, buyer_id, seller_id, offer_id, agreed_price_cents, status, created_at, updated_at
  ) values (
    v_offer.listing_id, v_offer.buyer_id, v_offer.seller_id, v_offer.id, v_offer.amount_cents, 'active', transaction_timestamp(), transaction_timestamp()
  ) returning id into v_reservation_id;

  -- 2. Update listing status to reserved
  update marketplace.listings
     set status = 'reserved', updated_at = transaction_timestamp()
   where id = v_offer.listing_id;

  -- 3. Set accepted offer status
  update marketplace.offers
     set status = 'accepted', updated_at = transaction_timestamp()
   where id = p_offer_id;

  -- 4. Supersede all other pending offers for this listing
  update marketplace.offers
     set status = 'superseded', updated_at = transaction_timestamp()
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

revoke all on function marketplace_api.accept_offer(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.accept_offer(uuid)
  to authenticated, service_role;


-- 2. Cancel Reservation RPC
create or replace function marketplace_api.cancel_reservation(
  p_reservation_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_res record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_reservation_id is null or p_reason is null or trim(p_reason) = '' then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  if char_length(p_reason) > 500 then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  -- Canonical lock: Lock listing and reservation
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
         updated_at = transaction_timestamp()
   where id = p_reservation_id;

  -- Restore listing to active
  update marketplace.listings
     set status = 'active', updated_at = transaction_timestamp()
   where id = v_res.listing_id;

  return jsonb_build_object(
    'reservationId', p_reservation_id,
    'listingId', v_res.listing_id,
    'status', 'cancelled'
  );
end;
$$;

revoke all on function marketplace_api.cancel_reservation(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.cancel_reservation(uuid, text)
  to authenticated, service_role;


-- 3. Decline Offer RPC
create or replace function marketplace_api.decline_offer(
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_offer record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_offer_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  select * into v_offer from marketplace.offers where id = p_offer_id;
  if not found then
    raise exception 'OFFER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_offer.seller_id <> v_user_id and v_offer.buyer_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0006';
  end if;

  if v_offer.status <> 'pending' then
    raise exception 'OFFER_NOT_PENDING' using errcode = 'P0007';
  end if;

  update marketplace.offers
     set status = 'declined', updated_at = transaction_timestamp()
   where id = p_offer_id;

  return jsonb_build_object(
    'offerId', p_offer_id,
    'status', 'declined'
  );
end;
$$;

revoke all on function marketplace_api.decline_offer(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.decline_offer(uuid)
  to authenticated, service_role;


-- 4. Withdraw Offer RPC
create or replace function marketplace_api.withdraw_offer(
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_offer record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_offer_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  select * into v_offer from marketplace.offers where id = p_offer_id;
  if not found then
    raise exception 'OFFER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_offer.buyer_id <> v_user_id and v_offer.seller_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0006';
  end if;

  if v_offer.status <> 'pending' then
    raise exception 'OFFER_NOT_PENDING' using errcode = 'P0007';
  end if;

  update marketplace.offers
     set status = 'withdrawn', updated_at = transaction_timestamp()
   where id = p_offer_id;

  return jsonb_build_object(
    'offerId', p_offer_id,
    'status', 'withdrawn'
  );
end;
$$;

revoke all on function marketplace_api.withdraw_offer(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.withdraw_offer(uuid)
  to authenticated, service_role;
