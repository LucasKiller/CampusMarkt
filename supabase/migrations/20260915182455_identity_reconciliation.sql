create function identity_api.synchronize_confirmation(requested_auth_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_confirmed_at timestamptz;
  current_state text;
begin
  select auth_user.confirmed_at
  into auth_confirmed_at
  from auth.users as auth_user
  where auth_user.id = requested_auth_user_id;

  if not found or auth_confirmed_at is null then
    return false;
  end if;

  select account.state
  into current_state
  from identity.accounts as account
  where account.auth_user_id = requested_auth_user_id
  for update;

  if not found or current_state <> 'active_unconfirmed' then
    return false;
  end if;

  if not exists (
    select 1
    from identity.profiles as profile
    where profile.auth_user_id = requested_auth_user_id
  ) or not exists (
    select 1
    from identity.consents as consent
    where consent.auth_user_id = requested_auth_user_id
      and consent.adult_declared
  ) then
    return false;
  end if;

  update identity.accounts
  set state = 'active_confirmed',
    confirmed_at = auth_confirmed_at
  where auth_user_id = requested_auth_user_id;

  return true;
end;
$$;

create function identity_api.repair_auth_projection(requested_auth_user_id uuid)
returns table (
  repaired boolean,
  profile_complete boolean,
  consent_complete boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap jsonb;
  auth_created_at timestamptz;
  auth_confirmed_at timestamptz;
  accepted_at timestamptz;
  current_state text;
  current_email_key text;
  inserted_rows integer;
  did_repair boolean := false;
begin
  select
    auth_user.raw_user_meta_data,
    auth_user.created_at,
    auth_user.confirmed_at
  into bootstrap, auth_created_at, auth_confirmed_at
  from auth.users as auth_user
  where auth_user.id = requested_auth_user_id
  for update;

  if not found then
    return query select false, false, false;
    return;
  end if;

  if bootstrap is null
    or jsonb_typeof(bootstrap) <> 'object'
    or coalesce(bootstrap->>'email_key' !~ '^[0-9a-f]{64}$', true)
    or coalesce(char_length(bootstrap->>'display_name') not between 2 and 50, true)
    or coalesce(bootstrap->>'display_name' <> btrim(bootstrap->>'display_name'), true)
    or coalesce(bootstrap->>'display_name' ~ '[[:cntrl:]<>]', true)
    or coalesce(jsonb_typeof(bootstrap->'adult_declared') <> 'boolean', true)
    or coalesce(bootstrap->'adult_declared' <> 'true'::jsonb, true)
    or coalesce(char_length(bootstrap->>'terms_version') not between 1 and 64, true)
    or coalesce(char_length(bootstrap->>'privacy_version') not between 1 and 64, true)
  then
    return query select false, false, false;
    return;
  end if;

  begin
    accepted_at := (bootstrap->>'accepted_at')::timestamptz;
  exception when others then
    return query select false, false, false;
    return;
  end;

  if accepted_at is null then
    return query select false, false, false;
    return;
  end if;

  select account.state, account.email_key
  into current_state, current_email_key
  from identity.accounts as account
  where account.auth_user_id = requested_auth_user_id;

  if found and (
    current_state = 'deletion_pending'
    or current_email_key <> bootstrap->>'email_key'
  ) then
    return query
      select
        false,
        exists (
          select 1 from identity.profiles as profile
          where profile.auth_user_id = requested_auth_user_id
        ),
        exists (
          select 1 from identity.consents as consent
          where consent.auth_user_id = requested_auth_user_id
            and consent.adult_declared
        );
    return;
  end if;

  if exists (
    select 1
    from identity.accounts as account
    where account.email_key = bootstrap->>'email_key'
      and account.auth_user_id <> requested_auth_user_id
  ) then
    return query select false, false, false;
    return;
  end if;

  begin
    insert into identity.accounts (
      auth_user_id,
      email_key,
      state,
      created_at,
      confirmed_at
    ) values (
      requested_auth_user_id,
      bootstrap->>'email_key',
      case
        when auth_confirmed_at is null then 'active_unconfirmed'
        else 'active_confirmed'
      end,
      coalesce(auth_created_at, transaction_timestamp()),
      auth_confirmed_at
    )
    on conflict (auth_user_id) do nothing;
    get diagnostics inserted_rows = row_count;
    did_repair := did_repair or inserted_rows > 0;

    insert into identity.profiles (auth_user_id, display_name)
    values (requested_auth_user_id, bootstrap->>'display_name')
    on conflict (auth_user_id) do nothing;
    get diagnostics inserted_rows = row_count;
    did_repair := did_repair or inserted_rows > 0;

    insert into identity.consents (
      auth_user_id,
      terms_version,
      privacy_version,
      adult_declared,
      accepted_at
    )
    select
      requested_auth_user_id,
      bootstrap->>'terms_version',
      bootstrap->>'privacy_version',
      true,
      accepted_at
    where not exists (
      select 1
      from identity.consents as consent
      where consent.auth_user_id = requested_auth_user_id
    )
    on conflict do nothing;
    get diagnostics inserted_rows = row_count;
    did_repair := did_repair or inserted_rows > 0;
  exception when unique_violation or check_violation or not_null_violation then
    return query select false, false, false;
    return;
  end;

  return query
    select
      did_repair,
      exists (
        select 1 from identity.profiles as profile
        where profile.auth_user_id = requested_auth_user_id
      ),
      exists (
        select 1 from identity.consents as consent
        where consent.auth_user_id = requested_auth_user_id
          and consent.adult_declared
      );
end;
$$;

comment on function identity_api.synchronize_confirmation(uuid) is
  'SECURITY DEFINER is required for service-only reconciliation between Auth and private identity state. It fixes search_path, trusts only auth.users.confirmed_at, never user_metadata authorization, creates no rows, requires complete projections, and performs one idempotent state transition.';
comment on function identity_api.repair_auth_projection(uuid) is
  'SECURITY DEFINER is required for service-only repair across Auth and private identity tables. It fixes search_path, locks one Auth identity briefly, treats raw_user_meta_data only as validated bootstrap input and never authorization, refuses deletion-pending or conflicting identities, and converges through constrained upserts.';

revoke execute on function identity_api.synchronize_confirmation(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.repair_auth_projection(uuid)
  from public, anon, authenticated, service_role;

grant execute on function identity_api.synchronize_confirmation(uuid)
  to service_role;
grant execute on function identity_api.repair_auth_projection(uuid)
  to service_role;
