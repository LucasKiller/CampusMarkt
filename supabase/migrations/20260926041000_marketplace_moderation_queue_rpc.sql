-- Migration: 20260926041000_marketplace_moderation_queue_rpc.sql
-- Feature 012: Moderation Queue and RBAC helper RPCs

-- 1. Helper: verify active moderator by user ID
create or replace function marketplace_api.is_moderator(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, marketplace, auth
stable
as $$
  select exists (
    select 1 from marketplace.moderator_assignments
     where user_id = p_user_id and revoked_at is null
  );
$$;

-- 2. Helper: verify current authenticated caller is an active moderator
create or replace function marketplace_api.is_moderator()
returns boolean
language sql
security definer
set search_path = public, marketplace, auth
stable
as $$
  select case
    when auth.uid() is null then false
    else marketplace_api.is_moderator(auth.uid())
  end;
$$;

grant execute on function marketplace_api.is_moderator(uuid) to authenticated, service_role;
grant execute on function marketplace_api.is_moderator() to authenticated, service_role;

-- 3. Get Moderation Queue RPC
create or replace function marketplace_api.get_moderation_queue()
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_items jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not marketplace_api.is_moderator(v_user_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'reporterId', r.reporter_id,
      'targetType', r.target_type,
      'targetId', r.target_id,
      'reason', r.reason,
      'details', r.details,
      'status', r.status,
      'createdAt', r.created_at,
      'listingTitle', l.title,
      'listingStatus', l.status,
      'userName', p.display_name
    ) order by r.created_at asc
  ), '[]'::jsonb)
  into v_items
  from marketplace.reports r
  left join marketplace.listings l on r.target_type = 'listing' and l.id = r.target_id
  left join marketplace.profiles p on r.target_type = 'user' and p.user_id = r.target_id
  where r.status = 'pending';

  return v_items;
end;
$$;

grant execute on function marketplace_api.get_moderation_queue() to authenticated, service_role;
