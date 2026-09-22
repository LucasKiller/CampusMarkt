-- Keyset paginated public marketplace feed RPC

create function marketplace_api.get_public_feed(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_category text default null,
  p_pickup_area text default null,
  p_listing_type text default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_items jsonb;
begin
  v_limit := least(greatest(coalesce(p_limit, 20), 1), 50);

  select coalesce(
    jsonb_agg(item),
    '[]'::jsonb
  ) into v_items
  from (
    select jsonb_build_object(
      'id', l.id,
      'listingType', l.listing_type,
      'title', l.title,
      'priceCents', l.price_cents,
      'category', l.category,
      'pickupArea', l.pickup_area,
      'condition', l.condition,
      'status', l.status,
      'createdAt', to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'coverImage', m.storage_path,
      'seller', jsonb_build_object(
        'publicId', coalesce(a.public_id, l.owner_id),
        'displayName', coalesce(p.display_name, 'CampusMarkt User'),
        'avatarUrl', case
          when p.avatar_object_key is null or a.public_id is null then null
          else '/media/avatars/' || a.public_id::text || '/' || p.avatar_version::text
        end,
        'universityBadge', case
          when uv.status = 'verified' and uv.expires_at > transaction_timestamp() and uv.university_id = 'tu-braunschweig'
          then jsonb_build_object(
            'universityId', uv.university_id,
            'badgeLabel', 'TU Braunschweig'
          )
          else null
        end
      )
    ) as item
    from marketplace.listings as l
    left join marketplace.listing_media as m
      on m.listing_id = l.id and m.position = 0
    left join identity.accounts as a
      on a.auth_user_id = l.owner_id
    left join identity.profiles as p
      on p.auth_user_id = l.owner_id
    left join identity.university_verifications as uv
      on uv.auth_user_id = l.owner_id
      and uv.status = 'verified'
      and uv.expires_at > transaction_timestamp()
    where l.status in ('active', 'reserved')
      and (
        p_cursor_created_at is null
        or p_cursor_id is null
        or (l.created_at, l.id) < (p_cursor_created_at, p_cursor_id)
      )
      and (p_category is null or l.category = p_category)
      and (p_pickup_area is null or l.pickup_area = p_pickup_area)
      and (p_listing_type is null or l.listing_type = p_listing_type)
    order by l.created_at desc, l.id desc
    limit v_limit
  ) sub;

  return v_items;
end;
$$;

comment on function marketplace_api.get_public_feed(timestamptz, uuid, text, text, text, integer) is
  'SECURITY DEFINER keyset paginated discovery query projecting public listing cards with cover photos and seller trust badges. Excludes private emails and internal hashes.';

revoke all on function marketplace_api.get_public_feed(timestamptz, uuid, text, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_public_feed(timestamptz, uuid, text, text, text, integer)
  to anon, authenticated, service_role;
