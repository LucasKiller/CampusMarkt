-- 2. Get user favorite IDs (for client hydration, AD-012)
create or replace function marketplace_api.get_user_favorite_ids()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_ids text[];
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return array[]::text[];
  end if;

  select coalesce(array_agg(f.listing_id::text order by f.created_at desc), array[]::text[])
    into v_ids
    from marketplace.favorites f
    join marketplace.listings l on l.id = f.listing_id
   where f.user_id = v_user_id
     and l.status <> 'archived';

  return v_ids;
end;
$$;

revoke all on function marketplace_api.get_user_favorite_ids()
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_user_favorite_ids()
  to authenticated, service_role;

-- 3. Get user favorites dashboard listings
create or replace function marketplace_api.get_user_favorites(
  p_cursor_created_at timestamptz default null,
  p_cursor_listing_id uuid default null,
  p_limit int default 20
)
returns table (
  listing_id uuid,
  listing_type text,
  title text,
  price_cents integer,
  category text,
  pickup_area text,
  condition text,
  status text,
  created_at timestamptz,
  cover_image text,
  seller_id uuid,
  seller_display_name text,
  seller_avatar_url text,
  seller_verified boolean,
  seller_institution text,
  favorited_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  return query
  select
    l.id as listing_id,
    l.listing_type,
    l.title,
    l.price_cents,
    l.category,
    l.pickup_area,
    l.condition,
    l.status,
    l.created_at,
    (
      select lm.storage_path
        from marketplace.listing_media lm
       where lm.listing_id = l.id
       order by lm.position asc
       limit 1
    ) as cover_image,
    l.owner_id as seller_id,
    coalesce(p.display_name, 'CampusMarkt User') as seller_display_name,
    case
      when p.avatar_object_key is null or a.public_id is null then null
      else '/media/avatars/' || a.public_id::text || '/' || p.avatar_version::text
    end as seller_avatar_url,
    case
      when uv.status = 'verified' and uv.expires_at > transaction_timestamp()
      then true
      else false
    end as seller_verified,
    case
      when uv.status = 'verified' and uv.expires_at > transaction_timestamp()
      then uv.university_id
      else null
    end as seller_institution,
    f.created_at as favorited_at
  from marketplace.favorites f
  join marketplace.listings l on l.id = f.listing_id
  left join identity.accounts a on a.auth_user_id = l.owner_id
  left join identity.profiles p on p.auth_user_id = l.owner_id
  left join identity.university_verifications uv on uv.auth_user_id = l.owner_id
  where f.user_id = v_user_id
    and l.status <> 'archived'
    and (
      p_cursor_created_at is null
      or (f.created_at, f.listing_id) < (p_cursor_created_at, p_cursor_listing_id)
    )
  order by f.created_at desc, f.listing_id desc
  limit least(coalesce(p_limit, 20), 50);
end;
$$;

revoke all on function marketplace_api.get_user_favorites(timestamptz, uuid, int)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_user_favorites(timestamptz, uuid, int)
  to authenticated, service_role;
