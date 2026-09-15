create table identity.session_assurance (
  session_id uuid primary key,
  auth_user_id uuid not null
    references identity.accounts(auth_user_id) on delete cascade,
  password_verified_at timestamptz not null,
  created_at timestamptz not null default transaction_timestamp()
);

create index session_assurance_auth_user_id_idx
  on identity.session_assurance (auth_user_id);

alter table identity.session_assurance enable row level security;
alter table identity.session_assurance force row level security;
revoke all on table identity.session_assurance
  from public, anon, authenticated, service_role;

create function identity_api.current_session_is_active()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := auth.uid();
  caller_session_id uuid;
begin
  if caller_user_id is null then
    return false;
  end if;

  begin
    caller_session_id := (auth.jwt()->>'session_id')::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if caller_session_id is null then
    return false;
  end if;

  return exists (
    select 1
    from auth.sessions as session
    where session.id = caller_session_id
      and session.user_id = caller_user_id
      and (session.not_after is null or session.not_after > transaction_timestamp())
  );
end;
$$;

create function identity_api.current_identity_status()
returns table (
  auth_user_id uuid,
  is_active boolean,
  email_confirmed boolean,
  profile_complete boolean,
  consent_complete boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    caller.auth_user_id,
    coalesce(account.state in ('active_unconfirmed', 'active_confirmed'), false),
    coalesce(auth_user.confirmed_at is not null and account.state = 'active_confirmed', false),
    profile.auth_user_id is not null,
    exists (
      select 1
      from identity.consents as consent
      where consent.auth_user_id = caller.auth_user_id
        and consent.adult_declared
    )
  from (select auth.uid() as auth_user_id) as caller
  left join auth.users as auth_user on auth_user.id = caller.auth_user_id
  left join identity.accounts as account on account.auth_user_id = caller.auth_user_id
  left join identity.profiles as profile on profile.auth_user_id = caller.auth_user_id;
$$;

create function identity_api.record_password_assurance(
  requested_auth_user_id uuid,
  requested_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from auth.sessions as session
    where session.id = requested_session_id
      and session.user_id = requested_auth_user_id
      and (session.not_after is null or session.not_after > transaction_timestamp())
  ) then
    raise exception using errcode = '28000', message = 'session is not active';
  end if;

  insert into identity.session_assurance (
    session_id, auth_user_id, password_verified_at
  ) values (
    requested_session_id, requested_auth_user_id, transaction_timestamp()
  )
  on conflict (session_id)
  do update set
    auth_user_id = excluded.auth_user_id,
    password_verified_at = excluded.password_verified_at;
end;
$$;

create function identity.password_assurance_is_recent(
  requested_auth_user_id uuid,
  requested_session_id uuid,
  checked_at timestamptz default transaction_timestamp()
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from identity.session_assurance as assurance
    where assurance.auth_user_id = requested_auth_user_id
      and assurance.session_id = requested_session_id
      and checked_at >= assurance.password_verified_at
      and checked_at <= assurance.password_verified_at + interval '10 minutes'
  );
$$;

create function identity_api.revoke_user_sessions(requested_auth_user_id uuid)
returns bigint
language sql
security definer
set search_path = ''
as $$
  with revoked as (
    delete from auth.sessions
    where user_id = requested_auth_user_id
    returning 1
  )
  select count(*) from revoked;
$$;

comment on function identity_api.current_session_is_active() is
  'SECURITY DEFINER is required to check the private Auth session table. The function fixes search_path and authorizes only the auth.uid and JWT session_id pair supplied by the authenticated request.';
comment on function identity_api.current_identity_status() is
  'SECURITY DEFINER is required to project private identity completeness without table grants. The function fixes search_path and reads only the current auth.uid; user metadata is never consulted.';
comment on function identity_api.record_password_assurance(uuid, uuid) is
  'SECURITY DEFINER is required for service-only assurance writes. The function fixes search_path and verifies the supplied user/session relationship and expiry in auth.sessions before upsert.';
comment on function identity_api.revoke_user_sessions(uuid) is
  'SECURITY DEFINER is required for service-only immediate all-session revocation in the Auth-owned table. The function fixes search_path and deletes sessions only for the supplied internal user ID.';

revoke execute on function identity.password_assurance_is_recent(uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.current_session_is_active()
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.current_identity_status()
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.record_password_assurance(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.revoke_user_sessions(uuid)
  from public, anon, authenticated, service_role;

grant execute on function identity_api.current_session_is_active()
  to authenticated;
grant execute on function identity_api.current_identity_status()
  to authenticated;
grant execute on function identity_api.record_password_assurance(uuid, uuid)
  to service_role;
grant execute on function identity_api.revoke_user_sessions(uuid)
  to service_role;
