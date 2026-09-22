create function marketplace_api.update_listing(
  p_caller_id uuid,
  p_listing_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing marketplace.listings%rowtype;
  v_title text;
  v_description text;
  v_category text;
  v_pickup_area text;
  v_condition text;
  v_price_cents integer;
  v_update_price boolean := false;
  v_media jsonb;
  v_media_count integer;
  v_index integer;
  v_result jsonb;
begin
  if p_caller_id is null then
    raise exception using errcode = '28000', message = 'unauthenticated caller';
  end if;

  -- 1. Lock and retrieve target listing
  select * into v_listing
  from marketplace.listings
  where id = p_listing_id
  for update;

  if v_listing.id is null then
    raise exception using errcode = 'P0002', message = 'listing not found';
  end if;

  -- 2. Verify caller is the owner
  if v_listing.owner_id <> p_caller_id then
    raise exception using errcode = '42501', message = 'caller is not authorized to edit this listing';
  end if;

  -- 3. Reject mutation of listingType
  if p_payload ? 'listingType' or p_payload ? 'listing_type' then
    if (p_payload->>'listingType' is not null and p_payload->>'listingType' <> v_listing.listing_type)
      or (p_payload->>'listing_type' is not null and p_payload->>'listing_type' <> v_listing.listing_type) then
      raise exception using errcode = '22023', message = 'listing intent cannot be changed';
    end if;
  end if;

  -- 4. Calculate updated fields
  v_title := coalesce(p_payload->>'title', v_listing.title);
  v_description := coalesce(p_payload->>'description', v_listing.description);
  v_category := coalesce(p_payload->>'category', v_listing.category);
  v_pickup_area := coalesce(p_payload->>'pickupArea', p_payload->>'pickup_area', v_listing.pickup_area);
  v_condition := coalesce(p_payload->>'condition', v_listing.condition);

  if p_payload ? 'priceCents' or p_payload ? 'price_cents' then
    v_update_price := true;
    if p_payload->'priceCents' is not null and jsonb_typeof(p_payload->'priceCents') <> 'null' then
      v_price_cents := (p_payload->>'priceCents')::integer;
    elsif p_payload->'price_cents' is not null and jsonb_typeof(p_payload->'price_cents') <> 'null' then
      v_price_cents := (p_payload->>'price_cents')::integer;
    else
      v_price_cents := null;
    end if;
  else
    v_price_cents := v_listing.price_cents;
  end if;

  -- 5. Update listing row
  update marketplace.listings
  set
    title = v_title,
    description = v_description,
    category = v_category,
    pickup_area = v_pickup_area,
    condition = v_condition,
    price_cents = v_price_cents,
    updated_at = transaction_timestamp()
  where id = p_listing_id;

  -- 6. Replace media if provided
  if p_payload ? 'mediaStoragePaths' or p_payload ? 'media_storage_paths' then
    v_media := coalesce(p_payload->'mediaStoragePaths', p_payload->'media_storage_paths');
    if jsonb_typeof(v_media) <> 'array' then
      raise exception using errcode = '22023', message = 'mediaStoragePaths must be an array';
    end if;

    v_media_count := jsonb_array_length(v_media);
    if v_listing.listing_type in ('SELL', 'GIVE_AWAY') and (v_media_count < 1 or v_media_count > 8) then
      raise exception using errcode = '22023', message = 'offerings require between 1 and 8 images';
    elsif v_listing.listing_type = 'WANTED' and (v_media_count < 0 or v_media_count > 8) then
      raise exception using errcode = '22023', message = 'wanted listings require between 0 and 8 images';
    end if;

    delete from marketplace.listing_media
    where listing_id = p_listing_id;

    if v_media_count > 0 then
      for v_index in 0 .. v_media_count - 1 loop
        insert into marketplace.listing_media (
          listing_id,
          storage_path,
          position
        ) values (
          p_listing_id,
          v_media->>v_index,
          v_index::smallint
        );
      end loop;
    end if;
  end if;

  -- 7. Build and return updated listing entity
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
  where l.id = p_listing_id;

  return v_result;
end;
$$;

create function marketplace_api.update_listing(
  p_listing_id uuid,
  p_payload jsonb
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select marketplace_api.update_listing(
    coalesce(
      nullif(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      (p_payload->>'ownerId')::uuid,
      (p_payload->>'owner_id')::uuid
    ),
    p_listing_id,
    p_payload
  );
$$;

create function marketplace_api.transition_listing_status(
  p_caller_id uuid,
  p_listing_id uuid,
  p_target_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing marketplace.listings%rowtype;
  v_valid_transition boolean := false;
begin
  if p_caller_id is null then
    raise exception using errcode = '28000', message = 'unauthenticated caller';
  end if;

  -- 1. Lock and fetch current listing
  select * into v_listing
  from marketplace.listings
  where id = p_listing_id
  for update;

  if v_listing.id is null then
    raise exception using errcode = 'P0002', message = 'listing not found';
  end if;

  -- 2. Verify owner equality
  if v_listing.owner_id <> p_caller_id then
    raise exception using errcode = '42501', message = 'caller is not authorized to transition status of this listing';
  end if;

  -- 3. Validate state machine
  if v_listing.status = p_target_status then
    -- Idempotent transition
    return jsonb_build_object(
      'id', v_listing.id,
      'status', v_listing.status,
      'updatedAt', to_char(v_listing.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
  end if;

  if v_listing.status = 'active' and p_target_status in ('reserved', 'sold', 'archived') then
    v_valid_transition := true;
  elsif v_listing.status = 'reserved' and p_target_status in ('active', 'sold', 'archived') then
    v_valid_transition := true;
  elsif v_listing.status = 'sold' and p_target_status = 'archived' then
    v_valid_transition := true;
  end if;

  if not v_valid_transition then
    raise exception using errcode = '22023', message = 'invalid status transition from ' || v_listing.status || ' to ' || p_target_status;
  end if;

  -- 4. Update status
  update marketplace.listings
  set
    status = p_target_status,
    updated_at = transaction_timestamp()
  where id = p_listing_id;

  return jsonb_build_object(
    'id', v_listing.id,
    'status', p_target_status,
    'updatedAt', to_char(transaction_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

create function marketplace_api.transition_listing_status(
  p_listing_id uuid,
  p_target_status text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select marketplace_api.transition_listing_status(
    auth.uid(),
    p_listing_id,
    p_target_status
  );
$$;

create function marketplace_api.get_owner_listing(
  p_caller_id uuid,
  p_listing_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
  )
  from marketplace.listings l
  where l.id = p_listing_id
    and l.owner_id = p_caller_id;
$$;

create function marketplace_api.get_owner_listing(
  p_listing_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select marketplace_api.get_owner_listing(
    auth.uid(),
    p_listing_id
  );
$$;

create function marketplace_api.list_owner_listings(
  p_caller_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
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
      ) order by l.created_at desc
    ),
    '[]'::jsonb
  )
  from marketplace.listings l
  where l.owner_id = p_caller_id;
$$;

create function marketplace_api.list_owner_listings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select marketplace_api.list_owner_listings(
    auth.uid()
  );
$$;

revoke all on function marketplace_api.update_listing(uuid, uuid, jsonb) from public, anon;
grant execute on function marketplace_api.update_listing(uuid, uuid, jsonb) to authenticated, service_role;

revoke all on function marketplace_api.update_listing(uuid, jsonb) from public, anon;
grant execute on function marketplace_api.update_listing(uuid, jsonb) to authenticated, service_role;

revoke all on function marketplace_api.transition_listing_status(uuid, uuid, text) from public, anon;
grant execute on function marketplace_api.transition_listing_status(uuid, uuid, text) to authenticated, service_role;

revoke all on function marketplace_api.transition_listing_status(uuid, text) from public, anon;
grant execute on function marketplace_api.transition_listing_status(uuid, text) to authenticated, service_role;

revoke all on function marketplace_api.get_owner_listing(uuid, uuid) from public, anon;
grant execute on function marketplace_api.get_owner_listing(uuid, uuid) to authenticated, service_role;

revoke all on function marketplace_api.get_owner_listing(uuid) from public, anon;
grant execute on function marketplace_api.get_owner_listing(uuid) to authenticated, service_role;

revoke all on function marketplace_api.list_owner_listings(uuid) from public, anon;
grant execute on function marketplace_api.list_owner_listings(uuid) to authenticated, service_role;

revoke all on function marketplace_api.list_owner_listings() from public, anon;
grant execute on function marketplace_api.list_owner_listings() to authenticated, service_role;
