create table identity.action_tokens (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null
    references identity.accounts(auth_user_id) on delete cascade,
  purpose text not null
    check (purpose in ('email_confirmation', 'password_recovery')),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  created_at timestamptz not null default transaction_timestamp(),
  expires_at timestamptz not null,
  used_at timestamptz,
  invalidated_at timestamptz,
  check (expires_at > created_at),
  check (used_at is null or invalidated_at is null)
);

create index action_tokens_auth_user_id_idx
  on identity.action_tokens (auth_user_id);
create index action_tokens_active_purpose_expiry_idx
  on identity.action_tokens (purpose, expires_at)
  where used_at is null and invalidated_at is null;

alter table identity.action_tokens enable row level security;
alter table identity.action_tokens force row level security;
revoke all on table identity.action_tokens from public, anon, authenticated;
revoke all on sequence identity.action_tokens_id_seq from public, anon, authenticated;

create function identity_api.issue_action_token(
  requested_auth_user_id uuid,
  requested_purpose text,
  requested_token_hash bytea
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  issued_at constant timestamptz := transaction_timestamp();
  lifetime interval;
begin
  lifetime := case requested_purpose
    when 'email_confirmation' then interval '24 hours'
    when 'password_recovery' then interval '30 minutes'
    else null
  end;

  if lifetime is null then
    raise exception using errcode = '22023', message = 'invalid action token purpose';
  end if;

  update identity.action_tokens
  set invalidated_at = issued_at
  where auth_user_id = requested_auth_user_id
    and purpose = requested_purpose
    and used_at is null
    and invalidated_at is null;

  insert into identity.action_tokens (
    auth_user_id, purpose, token_hash, created_at, expires_at
  ) values (
    requested_auth_user_id,
    requested_purpose,
    requested_token_hash,
    issued_at,
    issued_at + lifetime
  );
end;
$$;

create function identity_api.stage_action_token(
  requested_token_hash bytea,
  requested_purpose text
)
returns table (valid boolean, purpose text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from identity.action_tokens as token
      where token.token_hash = requested_token_hash
        and token.purpose = requested_purpose
        and token.used_at is null
        and token.invalidated_at is null
        and token.expires_at > transaction_timestamp()
    ) as valid,
    requested_purpose as purpose;
$$;

create function identity_api.consume_action_token(
  requested_token_hash bytea,
  requested_purpose text
)
returns table (auth_user_id uuid)
language sql
security definer
set search_path = ''
as $$
  update identity.action_tokens as token
  set used_at = transaction_timestamp()
  where token.token_hash = requested_token_hash
    and token.purpose = requested_purpose
    and token.used_at is null
    and token.invalidated_at is null
    and token.expires_at > transaction_timestamp()
  returning token.auth_user_id;
$$;

create function identity_api.invalidate_action_token(
  requested_token_hash bytea,
  requested_purpose text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with invalidated as (
    update identity.action_tokens as token
    set invalidated_at = transaction_timestamp()
    where token.token_hash = requested_token_hash
      and token.purpose = requested_purpose
      and token.used_at is null
      and token.invalidated_at is null
    returning 1
  )
  select exists (select 1 from invalidated);
$$;

create function identity_api.prune_expired_action_tokens()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from identity.action_tokens
    where expires_at <= transaction_timestamp()
    returning 1
  )
  select count(*) from removed;
$$;

comment on function identity_api.issue_action_token(uuid, text, bytea) is
  'SECURITY DEFINER permits the service role to mutate the private token store through a fixed, purpose-bounded operation. The function fixes search_path and receives only an internal user ID and SHA-256 digest.';
comment on function identity_api.stage_action_token(bytea, text) is
  'SECURITY DEFINER permits service-only validation against the private token store. It fixes search_path and returns no account identifier.';
comment on function identity_api.consume_action_token(bytea, text) is
  'SECURITY DEFINER permits one atomic service-only transition in the private token store. It fixes search_path and returns the internal user ID only after successful consumption.';
comment on function identity_api.invalidate_action_token(bytea, text) is
  'SECURITY DEFINER permits service-only compensation after delivery failure. It fixes search_path and performs one bounded conditional update.';
comment on function identity_api.prune_expired_action_tokens() is
  'SECURITY DEFINER permits service-only expiry cleanup of the private token store. It fixes search_path and deletes only expired rows.';

revoke execute on function identity_api.issue_action_token(uuid, text, bytea)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.stage_action_token(bytea, text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.consume_action_token(bytea, text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.invalidate_action_token(bytea, text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.prune_expired_action_tokens()
  from public, anon, authenticated, service_role;

grant execute on function identity_api.issue_action_token(uuid, text, bytea)
  to service_role;
grant execute on function identity_api.stage_action_token(bytea, text)
  to service_role;
grant execute on function identity_api.consume_action_token(bytea, text)
  to service_role;
grant execute on function identity_api.invalidate_action_token(bytea, text)
  to service_role;
grant execute on function identity_api.prune_expired_action_tokens()
  to service_role;
