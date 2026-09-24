-- 20260925202000_marketplace_pickup_history_rpc.sql
-- Feature 010: Pickup History RPC
-- Implements fetching past purchases and sales with privacy boundaries (AD-015, PICK-04)

create or replace function marketplace_api.get_completed_transactions(
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_limit integer;
  v_transactions jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

  select coalesce(
    jsonb_agg(tx),
    '[]'::jsonb
  ) into v_transactions
  from (
    select jsonb_build_object(
      'reservationId', r.id,
      'listingId', l.id,
      'listingTitle', l.title,
      'listingType', l.listing_type,
      'agreedPriceCents', r.agreed_price_cents,
      'status', 'completed',
      'pickupArea', l.pickup_area,
      'completedAt', to_char(coalesce(r.completed_at, r.updated_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'completionNote', r.completion_note,
      'role', case when r.buyer_id = v_user_id then 'buyer' else 'seller' end,
      'partner', jsonb_build_object(
        'id', partner_id,
        'displayName', coalesce(p.display_name, 'CampusMarkt User'),
        'avatarUrl', case
          when p.avatar_object_key is null or a.public_id is null then null
          else '/media/avatars/' || a.public_id::text || '/' || p.avatar_version::text || '.webp'
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
    ) as tx
    from marketplace.reservations as r
    join marketplace.listings as l on l.id = r.listing_id
    cross join lateral (
      select case when r.buyer_id = v_user_id then r.seller_id else r.buyer_id end as partner_id
    ) as p_sub
    left join identity.accounts as a
      on a.auth_user_id = partner_id
    left join identity.profiles as p
      on p.auth_user_id = partner_id
    left join identity.university_verifications as uv
      on uv.auth_user_id = partner_id
      and uv.status = 'verified'
      and uv.expires_at > transaction_timestamp()
    where r.status = 'completed'
      and (r.buyer_id = v_user_id or r.seller_id = v_user_id)
    order by coalesce(r.completed_at, r.updated_at) desc, r.id desc
    limit v_limit
  ) sub;

  return v_transactions;
end;
$$;

revoke all on function marketplace_api.get_completed_transactions(integer)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_completed_transactions(integer)
  to authenticated, service_role;
