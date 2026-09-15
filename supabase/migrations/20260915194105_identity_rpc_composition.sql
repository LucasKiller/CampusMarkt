create function identity_api.find_registration_by_email_key(
  requested_email_key text
)
returns table (auth_user_id uuid, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select account.auth_user_id, account.state
  from identity.accounts as account
  where requested_email_key ~ '^[0-9a-f]{64}$'
    and account.email_key = requested_email_key
    and account.state = 'active_unconfirmed'
  limit 1;
$$;

create function identity_api.find_recovery_by_email_key(
  requested_email_key text
)
returns table (auth_user_id uuid, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select account.auth_user_id, account.state
  from identity.accounts as account
  where requested_email_key ~ '^[0-9a-f]{64}$'
    and account.email_key = requested_email_key
    and account.state = 'active_confirmed'
  limit 1;
$$;

create function identity_api.password_assurance_is_recent(
  requested_auth_user_id uuid,
  requested_session_id uuid,
  requested_max_age_seconds integer
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select requested_max_age_seconds between 1 and 600
    and exists (
      select 1
      from identity.session_assurance as assurance
      join auth.sessions as session
        on session.id = assurance.session_id
        and session.user_id = assurance.auth_user_id
      where assurance.auth_user_id = requested_auth_user_id
        and assurance.session_id = requested_session_id
        and (
          session.not_after is null
          or session.not_after > transaction_timestamp()
        )
        and transaction_timestamp() >= assurance.password_verified_at
        and transaction_timestamp() <= assurance.password_verified_at
          + make_interval(secs => requested_max_age_seconds)
    );
$$;

create function identity_api.update_display_name(requested_display_name text)
returns table (changed boolean, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := auth.uid();
  caller_session_id uuid;
  current_display_name text;
begin
  begin
    caller_session_id := (auth.jwt()->>'session_id')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = '28000', message = 'session is not active';
  end;

  if caller_user_id is null
    or caller_session_id is null
    or not identity.active_service_session(caller_user_id, caller_session_id)
  then
    raise exception using errcode = '28000', message = 'session is not active';
  end if;

  if requested_display_name is null
    or char_length(requested_display_name) not between 2 and 50
    or requested_display_name <> btrim(requested_display_name)
    or requested_display_name ~ '[[:cntrl:]<>]'
  then
    raise exception using errcode = '22023', message = 'invalid display name';
  end if;

  select profile.display_name
  into current_display_name
  from identity.profiles as profile
  where profile.auth_user_id = caller_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'profile is unavailable';
  end if;

  if current_display_name = requested_display_name then
    return query select false, current_display_name;
    return;
  end if;

  update identity.profiles
  set display_name = requested_display_name,
    updated_at = transaction_timestamp()
  where auth_user_id = caller_user_id;

  return query select true, requested_display_name;
end;
$$;

comment on function identity_api.find_registration_by_email_key(text) is
  'SECURITY DEFINER is required for a service-only bounded lookup over private identity state. It fixes search_path, accepts only an exact pseudonymous email key, and returns only the actionable internal user ID and state.';
comment on function identity_api.find_recovery_by_email_key(text) is
  'SECURITY DEFINER is required for a service-only bounded lookup over private identity state. It fixes search_path, accepts only an exact pseudonymous email key, and returns only the actionable internal user ID and state.';
comment on function identity_api.password_assurance_is_recent(uuid, uuid, integer) is
  'SECURITY DEFINER is required for a service-only bounded check over private assurance and Auth session state. It fixes search_path and accepts only a one-to-600-second age without returning assurance timestamps.';
comment on function identity_api.update_display_name(text) is
  'SECURITY DEFINER is required for an authenticated owner mutation over a private profile. It fixes search_path, derives the user and live session from the JWT, validates the approved display-name bounds, and returns only the changed flag and public display name.';

revoke execute on function identity_api.find_registration_by_email_key(text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.find_recovery_by_email_key(text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.password_assurance_is_recent(uuid, uuid, integer)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.update_display_name(text)
  from public, anon, authenticated, service_role;

grant execute on function identity_api.find_registration_by_email_key(text)
  to service_role;
grant execute on function identity_api.find_recovery_by_email_key(text)
  to service_role;
grant execute on function identity_api.password_assurance_is_recent(uuid, uuid, integer)
  to service_role;
grant execute on function identity_api.update_display_name(text)
  to authenticated;
