-- Feature 011: User blocking and unblocking RPCs (block_user, unblock_user, get_blocked_users)

create or replace function marketplace_api.block_user(
  p_blocked_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_block_id uuid;
  v_created_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_blocked_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  if v_user_id = p_blocked_id then
    raise exception 'CANNOT_BLOCK_SELF' using errcode = 'P0002';
  end if;

  v_created_at := transaction_timestamp();

  insert into marketplace.user_blocks (
    blocker_id,
    blocked_id,
    created_at
  ) values (
    v_user_id,
    p_blocked_id,
    v_created_at
  )
  on conflict (blocker_id, blocked_id) do update
    set created_at = marketplace.user_blocks.created_at
  returning id, created_at into v_block_id, v_created_at;

  return jsonb_build_object(
    'blockId', v_block_id,
    'blockedId', p_blocked_id,
    'createdAt', v_created_at
  );
end;
$$;

create or replace function marketplace_api.unblock_user(
  p_blocked_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_blocked_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0005';
  end if;

  delete from marketplace.user_blocks
   where blocker_id = v_user_id
     and blocked_id = p_blocked_id;

  return jsonb_build_object(
    'unblockedId', p_blocked_id,
    'success', true
  );
end;
$$;

create or replace function marketplace_api.get_blocked_users()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, marketplace, identity, auth
as $$
declare
  v_user_id uuid;
  v_blocked_users jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  select coalesce(
    jsonb_agg(bu order by bu_created_at desc),
    '[]'::jsonb
  ) into v_blocked_users
  from (
    select
      ub.created_at as bu_created_at,
      jsonb_build_object(
        'id', ub.id,
        'blockedId', ub.blocked_id,
        'blockedName', coalesce(p.display_name, 'CampusMarkt User'),
        'avatarUrl', case
          when p.avatar_object_key is null or a.public_id is null then null
          else '/media/avatars/' || a.public_id::text || '/' || p.avatar_version::text || '.webp'
        end,
        'createdAt', to_char(ub.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) as bu
    from marketplace.user_blocks ub
    left join identity.accounts a on a.auth_user_id = ub.blocked_id
    left join identity.profiles p on p.auth_user_id = ub.blocked_id
    where ub.blocker_id = v_user_id
  ) q;

  return v_blocked_users;
end;
$$;

revoke all on function marketplace_api.block_user(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.block_user(uuid)
  to authenticated, service_role;

revoke all on function marketplace_api.unblock_user(uuid)
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.unblock_user(uuid)
  to authenticated, service_role;

revoke all on function marketplace_api.get_blocked_users()
  from public, anon, authenticated, service_role;
grant execute on function marketplace_api.get_blocked_users()
  to authenticated, service_role;
