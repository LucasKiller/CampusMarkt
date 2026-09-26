-- Migration: 20260926042000_marketplace_moderation_action_rpcs.sql
-- Feature 012: Moderation Actions & Audit Log RPCs (AD-017)

-- Ensure check constraint on listings allows 'removed' status if enforced via check constraint
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'listings_status_check' and conrelid = 'marketplace.listings'::regclass
  ) then
    alter table marketplace.listings drop constraint listings_status_check;
    alter table marketplace.listings add constraint listings_status_check
      check (status in ('active', 'reserved', 'sold', 'archived', 'removed'));
  end if;
end $$;

-- 1. Dismiss Report RPC
create or replace function marketplace_api.dismiss_report(
  p_report_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_report record;
  v_trimmed_reason text;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not marketplace_api.is_moderator(v_user_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  v_trimmed_reason := trim(p_reason);
  if v_trimmed_reason is null or length(v_trimmed_reason) = 0 or length(v_trimmed_reason) > 1000 then
    raise exception 'INVALID_JUSTIFICATION' using errcode = 'P0005';
  end if;

  select * into v_report from marketplace.reports where id = p_report_id for update;
  if not found then
    raise exception 'REPORT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_report.status <> 'pending' then
    raise exception 'REPORT_ALREADY_RESOLVED' using errcode = 'P0003';
  end if;

  update marketplace.reports
     set status = 'dismissed', updated_at = now()
   where id = p_report_id;

  insert into marketplace.moderation_actions (
    moderator_id, report_id, action_type, target_type, target_id, reason
  ) values (
    v_user_id, p_report_id, 'dismiss_report', v_report.target_type, v_report.target_id, v_trimmed_reason
  );

  return jsonb_build_object('success', true, 'status', 'dismissed');
end;
$$;

grant execute on function marketplace_api.dismiss_report(uuid, text) to authenticated, service_role;

-- 2. Remove Listing RPC
create or replace function marketplace_api.remove_listing_moderator(
  p_report_id uuid,
  p_listing_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_listing record;
  v_trimmed_reason text;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not marketplace_api.is_moderator(v_user_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  v_trimmed_reason := trim(p_reason);
  if v_trimmed_reason is null or length(v_trimmed_reason) = 0 or length(v_trimmed_reason) > 1000 then
    raise exception 'INVALID_JUSTIFICATION' using errcode = 'P0005';
  end if;

  -- Lock listing
  select * into v_listing from marketplace.listings where id = p_listing_id for update;
  if not found then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0004';
  end if;

  -- 1. Update listing status to 'removed'
  update marketplace.listings
     set status = 'removed', updated_at = now()
   where id = p_listing_id;

  -- 2. Cancel active reservations atomically
  update marketplace.reservations
     set status = 'cancelled',
         cancellation_reason = 'moderation_removal',
         cancelled_by = v_user_id,
         updated_at = now()
   where listing_id = p_listing_id and status = 'active';

  -- 3. Supersede pending offers
  update marketplace.offers
     set status = 'superseded', updated_at = now()
   where listing_id = p_listing_id and status = 'pending';

  -- 4. Update report if provided
  if p_report_id is not null then
    update marketplace.reports
       set status = 'actioned', updated_at = now()
     where id = p_report_id;
  end if;

  -- 5. Append audit entry
  insert into marketplace.moderation_actions (
    moderator_id, report_id, action_type, target_type, target_id, reason
  ) values (
    v_user_id, p_report_id, 'remove_listing', 'listing', p_listing_id, v_trimmed_reason
  );

  return jsonb_build_object('success', true, 'status', 'removed');
end;
$$;

grant execute on function marketplace_api.remove_listing_moderator(uuid, uuid, text) to authenticated, service_role;

-- 3. Suspend User RPC
create or replace function marketplace_api.suspend_user_moderator(
  p_report_id uuid,
  p_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_moderator_id uuid;
  v_trimmed_reason text;
begin
  v_moderator_id := auth.uid();
  if v_moderator_id is null or not marketplace_api.is_moderator(v_moderator_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  v_trimmed_reason := trim(p_reason);
  if v_trimmed_reason is null or length(v_trimmed_reason) = 0 or length(v_trimmed_reason) > 1000 then
    raise exception 'INVALID_JUSTIFICATION' using errcode = 'P0005';
  end if;

  -- 1. Insert or update suspension
  insert into marketplace.user_suspensions (
    user_id, suspended_by, reason
  ) values (
    p_user_id, v_moderator_id, v_trimmed_reason
  )
  on conflict (user_id) do update
    set reason = v_trimmed_reason, suspended_by = v_moderator_id, created_at = now();

  -- 2. Takedown user active listings
  update marketplace.listings
     set status = 'removed', updated_at = now()
   where owner_id = p_user_id and status in ('active', 'reserved');

  -- 3. Cancel active reservations where user is buyer or seller
  update marketplace.reservations
     set status = 'cancelled',
         cancellation_reason = 'moderation_suspension',
         cancelled_by = v_moderator_id,
         updated_at = now()
   where (seller_id = p_user_id or buyer_id = p_user_id) and status = 'active';

  -- 4. Supersede pending offers where user is buyer or seller
  update marketplace.offers
     set status = 'superseded', updated_at = now()
   where (buyer_id = p_user_id or seller_id = p_user_id) and status = 'pending';

  -- 5. Update report if provided
  if p_report_id is not null then
    update marketplace.reports
       set status = 'actioned', updated_at = now()
     where id = p_report_id;
  end if;

  -- 6. Append audit entry
  insert into marketplace.moderation_actions (
    moderator_id, report_id, action_type, target_type, target_id, reason
  ) values (
    v_moderator_id, p_report_id, 'suspend_user', 'user', p_user_id, v_trimmed_reason
  );

  return jsonb_build_object('success', true, 'status', 'suspended');
end;
$$;

grant execute on function marketplace_api.suspend_user_moderator(uuid, uuid, text) to authenticated, service_role;

-- 4. Get Moderation Audit Log RPC
create or replace function marketplace_api.get_moderation_audit_log(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_items jsonb;
  v_effective_limit integer;
  v_effective_offset integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not marketplace_api.is_moderator(v_user_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  v_effective_limit := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_effective_offset := greatest(coalesce(p_offset, 0), 0);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'moderatorId', a.moderator_id,
      'reportId', a.report_id,
      'actionType', a.action_type,
      'targetType', a.target_type,
      'targetId', a.target_id,
      'reason', a.reason,
      'createdAt', to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) order by a.created_at desc
  ), '[]'::jsonb)
  into v_items
  from (
    select * from marketplace.moderation_actions
    order by created_at desc
    limit v_effective_limit
    offset v_effective_offset
  ) a;

  return v_items;
end;
$$;

grant execute on function marketplace_api.get_moderation_audit_log(integer, integer) to authenticated, service_role;
