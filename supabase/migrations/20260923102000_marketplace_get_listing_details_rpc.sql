-- Public listing details RPC with ordered media and seller trust badge

create function marketplace_api.get_public_listing_details(
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
    'listingType', l.listing_type,
    'title', l.title,
    'description', l.description,
    'priceCents', l.price_cents,
    'category', l.category,
    'pickupArea', l.pickup_area,
    'condition', l.condition,
    'status', l.status,
    'createdAt', to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'coverImage', (
      select m.storage_path
      from marketplace.listing_media as m
      where m.listing_id = l.id and m.position = 0
    ),
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
    ),
    'images', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'storagePath', m.storage_path,
            'position', m.position
          ) order by m.position asc
        )
        from marketplace.listing_media as m
        where m.listing_id = l.id
      ),
      '[]'::jsonb
    )
  )
  from marketplace.listings as l
  left join identity.accounts as a
    on a.auth_user_id = l.owner_id
  left join identity.profiles as p
    on p.auth_user_id = l.owner_id
  left join identity.university_verifications as uv
    on uv.auth_user_id = l.owner_id
    and uv.status = 'verified'
    and uv.expires_at > transaction_timestamp()
  where l.id = p_listing_id;
$$;

comment on function marketplace_api.get_public_listing_details(uuid) is
  'SECURITY DEFINER discovery query projecting public listing details with ordered image gallery and seller trust badge. Excludes private emails and internal hashes.';

revoke all on function marketplace_api.get_public_listing_details(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_public_listing_details(uuid)
  to anon, authenticated, service_role;
