-- Feature 014 applies the approved annual trust-badge cadence to existing and
-- future confirmations. PostgreSQL calendar arithmetic clamps leap-day
-- confirmations to the last valid day of the target month.
update identity.university_verifications
set
  expires_at = verified_at + interval '12 months',
  updated_at = transaction_timestamp()
where status = 'verified'
  and verified_at is not null
  and expires_at is distinct from verified_at + interval '12 months';

create or replace function identity_api.confirm_university_verification(
  requested_token_hash bytea
)
returns table (
  auth_user_id uuid,
  university_id text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  pending_record record;
  account_state text;
  active_conflict boolean;
  confirmed_at constant timestamptz := transaction_timestamp();
  new_expires_at constant timestamptz := confirmed_at + interval '12 months';
begin
  if requested_token_hash is null or octet_length(requested_token_hash) <> 32 then
    raise exception using errcode = '22023', message = 'invalid verification token';
  end if;

  select * into pending_record
  from identity.university_verifications
  where token_hash = requested_token_hash
  for update;

  if pending_record.auth_user_id is null then
    raise exception using errcode = 'P0002', message = 'verification token is invalid or expired';
  end if;

  if pending_record.token_expires_at <= confirmed_at then
    raise exception using errcode = '22023', message = 'verification token is expired';
  end if;

  select state into account_state
  from identity.accounts
  where auth_user_id = pending_record.auth_user_id;

  if account_state is null or account_state <> 'active_confirmed' then
    raise exception using errcode = '28000', message = 'account is unavailable';
  end if;

  select exists(
    select 1
    from identity.university_verifications
    where institutional_email_hash = pending_record.institutional_email_hash
      and auth_user_id <> pending_record.auth_user_id
      and status = 'verified'
      and expires_at > confirmed_at
  ) into active_conflict;

  if active_conflict then
    raise exception using errcode = '23505', message = 'institutional email is already verified';
  end if;

  update identity.university_verifications
  set
    status = 'verified',
    token_hash = null,
    token_expires_at = null,
    verified_at = confirmed_at,
    expires_at = new_expires_at,
    updated_at = confirmed_at
  where auth_user_id = pending_record.auth_user_id;

  return query
  select
    verification.auth_user_id,
    verification.university_id,
    verification.status,
    verification.expires_at
  from identity.university_verifications verification
  where verification.auth_user_id = pending_record.auth_user_id;
end;
$$;

revoke all on function identity_api.confirm_university_verification(bytea) from public, anon, authenticated;
grant execute on function identity_api.confirm_university_verification(bytea) to service_role;
