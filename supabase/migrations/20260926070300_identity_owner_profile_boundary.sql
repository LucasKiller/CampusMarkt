create function identity_api.get_owner_profile()
returns table (
  public_id uuid,
  display_name text,
  joined_month text,
  avatar_url text,
  university_id text,
  badge_label text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := auth.uid();
  caller_session_id uuid;
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

  return query
  select
    account.public_id,
    profile.display_name,
    to_char(account.created_at at time zone 'UTC', 'YYYY-MM') as joined_month,
    case
      when profile.avatar_object_key is null then null
      else '/media/avatars/' || account.public_id::text || '/' || profile.avatar_version::text
    end as avatar_url,
    case
      when verification.status = 'verified'
        and verification.expires_at > transaction_timestamp()
      then verification.university_id
      else null
    end as university_id,
    case
      when verification.status = 'verified'
        and verification.expires_at > transaction_timestamp()
        and verification.university_id = 'tu-braunschweig'
      then 'TU Braunschweig'
      else null
    end as badge_label
  from identity.accounts as account
  join identity.profiles as profile using (auth_user_id)
  left join identity.university_verifications as verification using (auth_user_id)
  where account.auth_user_id = caller_user_id
    and account.state = 'active_confirmed';
end;
$$;

comment on function identity_api.get_owner_profile() is
  'SECURITY DEFINER is required for an authenticated owner to read an allowlisted projection from private identity tables. It fixes search_path, derives the user and live session from the JWT, accepts no caller-selected identity, and returns only public profile fields.';

revoke execute on function identity_api.get_owner_profile()
  from public, anon, authenticated, service_role;
grant execute on function identity_api.get_owner_profile()
  to authenticated;

create function identity_api.get_university_verification_record(
  requested_auth_user_id uuid
)
returns table (
  status text,
  university_id text,
  expires_at timestamptz,
  token_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    verification.status,
    verification.university_id,
    verification.expires_at,
    verification.token_expires_at
  from identity.university_verifications as verification
  join identity.accounts as account using (auth_user_id)
  where verification.auth_user_id = requested_auth_user_id
    and account.state = 'active_confirmed';
$$;

comment on function identity_api.get_university_verification_record(uuid) is
  'SECURITY DEFINER is required for a service-only bounded status lookup over private university-verification state. It fixes search_path, accepts only the server-authenticated user ID, and omits institutional email hashes and token hashes.';

revoke execute on function identity_api.get_university_verification_record(uuid)
  from public, anon, authenticated, service_role;
grant execute on function identity_api.get_university_verification_record(uuid)
  to service_role;

create function identity_api.resolve_avatar_media(
  requested_public_id uuid,
  requested_version bigint
)
returns table (object_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.avatar_object_key
  from identity.accounts as account
  join identity.profiles as profile using (auth_user_id)
  where account.public_id = requested_public_id
    and account.state = 'active_confirmed'
    and profile.avatar_version = requested_version
    and profile.avatar_object_key is not null;
$$;

comment on function identity_api.resolve_avatar_media(uuid, bigint) is
  'SECURITY DEFINER is required for a service-only resolution of an immutable public avatar URL to its private storage key. It fixes search_path, requires an active confirmed account and exact version, and returns only the object key.';

revoke execute on function identity_api.resolve_avatar_media(uuid, bigint)
  from public, anon, authenticated, service_role;
grant execute on function identity_api.resolve_avatar_media(uuid, bigint)
  to service_role;
