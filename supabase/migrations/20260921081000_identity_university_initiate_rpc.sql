create function identity_api.initiate_university_verification(
  requested_auth_user_id uuid,
  requested_university_id text,
  requested_email_hash text,
  requested_token_hash bytea
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_record record;
  active_conflict boolean;
  issued_at constant timestamptz := transaction_timestamp();
begin
  -- 1. Check account state: must exist and be 'active_confirmed'
  select state into account_record
  from identity.accounts
  where auth_user_id = requested_auth_user_id;

  if account_record.state is null then
    raise exception using errcode = 'P0002', message = 'account is unavailable';
  end if;

  if account_record.state <> 'active_confirmed' then
    raise exception using errcode = '28000', message = 'account is unavailable';
  end if;

  -- 2. Validate parameters
  if char_length(requested_university_id) not between 1 and 64
     or requested_email_hash !~ '^[0-9a-f]{64}$'
     or requested_token_hash is null
     or octet_length(requested_token_hash) <> 32
  then
    raise exception using errcode = '22023', message = 'invalid university verification input';
  end if;

  -- 3. Check for active conflict on another account
  select exists(
    select 1
    from identity.university_verifications
    where institutional_email_hash = requested_email_hash
      and auth_user_id <> requested_auth_user_id
      and status = 'verified'
      and expires_at > issued_at
  ) into active_conflict;

  if active_conflict then
    raise exception using errcode = '23505', message = 'institutional email is already verified';
  end if;

  -- 4. Upsert pending verification record
  insert into identity.university_verifications (
    auth_user_id,
    university_id,
    institutional_email_hash,
    status,
    token_hash,
    token_expires_at,
    verified_at,
    expires_at,
    created_at,
    updated_at
  ) values (
    requested_auth_user_id,
    requested_university_id,
    requested_email_hash,
    'pending',
    requested_token_hash,
    issued_at + interval '24 hours',
    null,
    null,
    issued_at,
    issued_at
  )
  on conflict (auth_user_id) do update
  set
    university_id = excluded.university_id,
    institutional_email_hash = excluded.institutional_email_hash,
    status = 'pending',
    token_hash = excluded.token_hash,
    token_expires_at = excluded.token_expires_at,
    verified_at = null,
    expires_at = null,
    updated_at = excluded.updated_at;

end;
$$;

revoke all on function identity_api.initiate_university_verification(uuid, text, text, bytea) from public, anon, authenticated;
grant execute on function identity_api.initiate_university_verification(uuid, text, text, bytea) to service_role;
