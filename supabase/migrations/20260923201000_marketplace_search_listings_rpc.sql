-- Marketplace search listings RPC with full-text search and multi-facet filtering

create or replace function marketplace_api.search_listings(
  p_query text default null,
  p_categories text[] default null,
  p_pickup_areas text[] default null,
  p_listing_types text[] default null,
  p_conditions text[] default null,
  p_min_price_cents integer default null,
  p_max_price_cents integer default null,
  p_verified_only boolean default false,
  p_sort text default 'relevance',
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
  v_query text;
  v_tsquery tsquery;
  v_items jsonb;
begin
  v_limit := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_query := nullif(trim(p_query), '');

  if v_query is not null then
    v_tsquery := websearch_to_tsquery('german'::regconfig, v_query);
  end if;

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
      and (v_tsquery is null or l.search_vector @@ v_tsquery)
      and (p_categories is null or cardinality(p_categories) = 0 or l.category = any(p_categories))
      and (p_pickup_areas is null or cardinality(p_pickup_areas) = 0 or l.pickup_area = any(p_pickup_areas))
      and (p_listing_types is null or cardinality(p_listing_types) = 0 or l.listing_type = any(p_listing_types))
      and (p_conditions is null or cardinality(p_conditions) = 0 or l.condition = any(p_conditions))
      and (p_min_price_cents is null or (l.listing_type = 'SELL' and l.price_cents >= p_min_price_cents))
      and (p_max_price_cents is null or (l.listing_type = 'SELL' and l.price_cents <= p_max_price_cents))
      and (not coalesce(p_verified_only, false) or (uv.status = 'verified' and uv.expires_at > transaction_timestamp()))
    order by
      case when v_tsquery is not null then ts_rank_cd(l.search_vector, v_tsquery) end desc nulls last,
      l.created_at desc,
      l.id desc
    limit v_limit
  ) sub;

  return v_items;
end;
$$;

comment on function marketplace_api.search_listings(text, text[], text[], text[], text[], integer, integer, boolean, text, integer) is
  'SECURITY DEFINER search RPC using PostgreSQL FTS websearch_to_tsquery and multi-facet filtering. Excludes sold/archived listings and private seller PII.';

revoke all on function marketplace_api.search_listings(text, text[], text[], text[], text[], integer, integer, boolean, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.search_listings(text, text[], text[], text[], text[], integer, integer, boolean, text, integer)
  to anon, authenticated, service_role;
