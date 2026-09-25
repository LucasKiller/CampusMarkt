-- Feature 011: Submit report RPC with target validation, duplicate check, and self-report prevention

create or replace function marketplace_api.submit_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_report_id uuid;
  v_owner_id uuid;
  v_created_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_target_type is null or p_target_id is null or p_reason is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  if p_target_type not in ('listing', 'user') then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  if p_reason not in (
    'prohibited_content',
    'fraud_or_scam',
    'harassment_or_abuse',
    'unsupported_content',
    'privacy_violation',
    'other'
  ) then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  if p_details is not null and char_length(p_details) > 1000 then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  -- Self-reporting check
  if p_target_type = 'user' and p_target_id = v_user_id then
    raise exception 'CANNOT_REPORT_SELF' using errcode = 'P0002';
  end if;

  if p_target_type = 'listing' then
    select seller_id into v_owner_id from marketplace.listings where id = p_target_id;
    if not found then
      raise exception 'LISTING_NOT_FOUND' using errcode = 'P0003';
    end if;
    if v_owner_id = v_user_id then
      raise exception 'CANNOT_REPORT_SELF' using errcode = 'P0002';
    end if;
  end if;

  -- Duplicate pending check
  if exists (
    select 1 from marketplace.reports
     where reporter_id = v_user_id
       and target_type = p_target_type::marketplace.report_target_type
       and target_id = p_target_id
       and status = 'pending'
  ) then
    raise exception 'REPORT_ALREADY_PENDING' using errcode = 'P0004';
  end if;

  v_created_at := transaction_timestamp();

  insert into marketplace.reports (
    reporter_id,
    target_type,
    target_id,
    reason,
    details,
    status,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_target_type::marketplace.report_target_type,
    p_target_id,
    p_reason::marketplace.report_reason,
    p_details,
    'pending',
    v_created_at,
    v_created_at
  ) returning id into v_report_id;

  return jsonb_build_object(
    'reportId', v_report_id,
    'status', 'pending',
    'createdAt', v_created_at
  );
end;
$$;

revoke all on function marketplace_api.submit_report(text, uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.submit_report(text, uuid, text, text)
  to authenticated, service_role;
