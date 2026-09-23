-- Toggle favorite RPC
create or replace function marketplace_api.toggle_favorite(
  p_listing_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_owner_id uuid;
  v_listing_status text;
  v_exists boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_listing_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0004';
  end if;

  -- Verify listing exists and is not archived
  select owner_id, status
    into v_owner_id, v_listing_status
    from marketplace.listings
   where id = p_listing_id;

  if not found or v_listing_status = 'archived' then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Invariant: cannot favorite own listing
  if v_owner_id = v_user_id then
    raise exception 'CANNOT_FAVORITE_OWN_LISTING' using errcode = 'P0003';
  end if;

  -- Check current favorite state
  select exists(
    select 1 from marketplace.favorites
     where user_id = v_user_id and listing_id = p_listing_id
  ) into v_exists;

  if v_exists then
    delete from marketplace.favorites
     where user_id = v_user_id and listing_id = p_listing_id;
    return jsonb_build_object('isFavorited', false, 'listingId', p_listing_id);
  else
    insert into marketplace.favorites (user_id, listing_id, created_at)
    values (v_user_id, p_listing_id, transaction_timestamp())
    on conflict do nothing;
    return jsonb_build_object('isFavorited', true, 'listingId', p_listing_id);
  end if;
end;
$$;

revoke all on function marketplace_api.toggle_favorite(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.toggle_favorite(uuid)
  to authenticated, service_role;
