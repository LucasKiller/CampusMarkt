-- Feature 009: Get or Create Conversation RPC

create or replace function marketplace_api.get_or_create_conversation(
  p_listing_id uuid
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
  v_conv record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_listing_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  select owner_id, status into v_seller_id, v_listing_status
    from marketplace.listings
   where id = p_listing_id;

  if not found or v_listing_status = 'archived' then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_seller_id = v_user_id then
    raise exception 'CANNOT_MESSAGE_OWN_LISTING' using errcode = 'P0003';
  end if;

  -- Atomic insert or retrieve existing
  insert into marketplace.conversations (
    listing_id, buyer_id, seller_id
  ) values (
    p_listing_id, v_user_id, v_seller_id
  )
  on conflict (listing_id, buyer_id) do update
    set updated_at = transaction_timestamp()
  returning * into v_conv;

  return jsonb_build_object(
    'conversationId', v_conv.id,
    'listingId', v_conv.listing_id,
    'buyerId', v_conv.buyer_id,
    'sellerId', v_conv.seller_id,
    'createdAt', v_conv.created_at,
    'lastMessageAt', v_conv.last_message_at
  );
end;
$$;

revoke all on function marketplace_api.get_or_create_conversation(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_or_create_conversation(uuid)
  to authenticated, service_role;
