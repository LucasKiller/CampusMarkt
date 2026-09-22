create function marketplace_api.create_listing(
  p_owner_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account record;
  v_listing_id uuid;
  v_listing_type text;
  v_title text;
  v_description text;
  v_category text;
  v_pickup_area text;
  v_condition text;
  v_price_cents integer;
  v_media jsonb;
  v_media_count integer;
  v_index integer;
  v_result jsonb;
begin
  if p_owner_id is null then
    raise exception using errcode = '28000', message = 'unauthenticated owner';
  end if;

  -- 1. Verify caller account state
  select state, deletion_requested_at into v_account
  from identity.accounts
  where auth_user_id = p_owner_id;

  if v_account.state is null then
    raise exception using errcode = 'P0002', message = 'account is unavailable';
  end if;

  if v_account.state <> 'active_confirmed' or v_account.deletion_requested_at is not null then
    raise exception using errcode = '28000', message = 'account is not active or deletion is pending';
  end if;

  -- 2. Extract payload fields
  v_listing_type := coalesce(p_payload->>'listingType', p_payload->>'listing_type');
  v_title := p_payload->>'title';
  v_description := p_payload->>'description';
  v_category := p_payload->>'category';
  v_pickup_area := coalesce(p_payload->>'pickupArea', p_payload->>'pickup_area');
  v_condition := p_payload->>'condition';

  if p_payload->'priceCents' is not null and jsonb_typeof(p_payload->'priceCents') <> 'null' then
    v_price_cents := (p_payload->>'priceCents')::integer;
  elsif p_payload->'price_cents' is not null and jsonb_typeof(p_payload->'price_cents') <> 'null' then
    v_price_cents := (p_payload->>'price_cents')::integer;
  else
    v_price_cents := null;
  end if;

  v_media := coalesce(p_payload->'mediaStoragePaths', p_payload->'media_storage_paths', '[]'::jsonb);

  if jsonb_typeof(v_media) <> 'array' then
    raise exception using errcode = '22023', message = 'mediaStoragePaths must be an array';
  end if;

  v_media_count := jsonb_array_length(v_media);

  -- Validate media constraints per listing type
  if v_listing_type in ('SELL', 'GIVE_AWAY') and (v_media_count < 1 or v_media_count > 8) then
    raise exception using errcode = '22023', message = 'offerings require between 1 and 8 images';
  elsif v_listing_type = 'WANTED' and (v_media_count < 0 or v_media_count > 8) then
    raise exception using errcode = '22023', message = 'wanted listings require between 0 and 8 images';
  end if;

  -- 3. Insert listing record
  insert into marketplace.listings (
    owner_id,
    listing_type,
    title,
    description,
    category,
    pickup_area,
    condition,
    price_cents,
    status
  ) values (
    p_owner_id,
    v_listing_type,
    v_title,
    v_description,
    v_category,
    v_pickup_area,
    v_condition,
    v_price_cents,
    'active'
  ) returning id into v_listing_id;

  -- 4. Insert media records
  if v_media_count > 0 then
    for v_index in 0 .. v_media_count - 1 loop
      insert into marketplace.listing_media (
        listing_id,
        storage_path,
        position
      ) values (
        v_listing_id,
        v_media->>v_index,
        v_index::smallint
      );
    end loop;
  end if;

  -- 5. Build and return created listing entity
  select jsonb_build_object(
    'id', l.id,
    'ownerId', l.owner_id,
    'listingType', l.listing_type,
    'title', l.title,
    'description', l.description,
    'category', l.category,
    'pickupArea', l.pickup_area,
    'condition', l.condition,
    'priceCents', l.price_cents,
    'status', l.status,
    'media', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'storagePath', m.storage_path,
            'position', m.position,
            'createdAt', to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          ) order by m.position asc
        )
        from marketplace.listing_media m
        where m.listing_id = l.id
      ),
      '[]'::jsonb
    ),
    'createdAt', to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(l.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) into v_result
  from marketplace.listings l
  where l.id = v_listing_id;

  return v_result;
end;
$$;

create function marketplace_api.create_listing(p_payload jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select marketplace_api.create_listing(
    coalesce(
      nullif(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      (p_payload->>'ownerId')::uuid,
      (p_payload->>'owner_id')::uuid
    ),
    p_payload
  );
$$;

revoke all on function marketplace_api.create_listing(uuid, jsonb) from public, anon;
grant execute on function marketplace_api.create_listing(uuid, jsonb) to authenticated, service_role;

revoke all on function marketplace_api.create_listing(jsonb) from public, anon;
grant execute on function marketplace_api.create_listing(jsonb) to authenticated, service_role;
