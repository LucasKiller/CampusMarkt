-- 1. Create Offer / Purchase Intent RPC
create or replace function marketplace_api.create_offer(
  p_listing_id uuid,
  p_amount_cents integer,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_seller_id uuid;
  v_listing_status text;
  v_listing_price integer;
  v_listing_type text;
  v_offer_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_listing_id is null or p_amount_cents is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  if p_message is not null and char_length(p_message) > 500 then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  select owner_id, status, price_cents, listing_type
    into v_seller_id, v_listing_status, v_listing_price, v_listing_type
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

  if v_listing_type = 'GIVE_AWAY' then
    if p_amount_cents <> 0 then
      raise exception 'INVALID_OFFER_AMOUNT' using errcode = 'P0005';
    end if;
  else
    if p_amount_cents <= 0 or (v_listing_price is not null and p_amount_cents > v_listing_price) then
      raise exception 'INVALID_OFFER_AMOUNT' using errcode = 'P0005';
    end if;
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

revoke all on function marketplace_api.create_offer(uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.create_offer(uuid, integer, text)
  to authenticated, service_role;


-- 2. Counter Offer RPC
create or replace function marketplace_api.counter_offer(
  p_parent_offer_id uuid,
  p_amount_cents integer,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_parent_offer record;
  v_listing_status text;
  v_listing_price integer;
  v_new_offer_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_parent_offer_id is null or p_amount_cents is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  if p_message is not null and char_length(p_message) > 500 then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  select * into v_parent_offer
    from marketplace.offers
   where id = p_parent_offer_id;

  if not found then
    raise exception 'OFFER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_parent_offer.buyer_id <> v_user_id and v_parent_offer.seller_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0006';
  end if;

  if v_parent_offer.status <> 'pending' then
    raise exception 'OFFER_NOT_PENDING' using errcode = 'P0007';
  end if;

  select status, price_cents
    into v_listing_status, v_listing_price
    from marketplace.listings
   where id = v_parent_offer.listing_id;

  if not found or v_listing_status = 'archived' then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_listing_status <> 'active' then
    raise exception 'LISTING_NOT_ACTIVE' using errcode = 'P0004';
  end if;

  if p_amount_cents <= 0 or (v_listing_price is not null and p_amount_cents > v_listing_price) then
    raise exception 'INVALID_OFFER_AMOUNT' using errcode = 'P0005';
  end if;

  -- Transition parent offer to countered
  update marketplace.offers
     set status = 'countered', updated_at = transaction_timestamp()
   where id = p_parent_offer_id;

  -- Create new counter proposal
  insert into marketplace.offers (
    listing_id,
    buyer_id,
    seller_id,
    parent_offer_id,
    amount_cents,
    message,
    status
  ) values (
    v_parent_offer.listing_id,
    v_parent_offer.buyer_id,
    v_parent_offer.seller_id,
    p_parent_offer_id,
    p_amount_cents,
    p_message,
    'pending'
  ) returning id into v_new_offer_id;

  return jsonb_build_object(
    'offerId', v_new_offer_id,
    'parentOfferId', p_parent_offer_id,
    'listingId', v_parent_offer.listing_id,
    'amountCents', p_amount_cents,
    'status', 'pending'
  );
end;
$$;

revoke all on function marketplace_api.counter_offer(uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.counter_offer(uuid, integer, text)
  to authenticated, service_role;
