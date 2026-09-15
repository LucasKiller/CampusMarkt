create table identity.deletion_jobs (
  auth_user_id uuid primary key
    references identity.accounts(auth_user_id) on delete cascade,
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'retry')),
  requested_at timestamptz not null,
  purge_due_at timestamptz not null,
  next_attempt_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  worker_id text,
  lease_until timestamptz,
  last_error_code text,
  check (
    purge_due_at >= requested_at
    and purge_due_at <= requested_at + interval '30 days'
  ),
  check (next_attempt_at <= purge_due_at),
  check (worker_id is null or char_length(worker_id) between 1 and 64),
  check (
    last_error_code is null
    or last_error_code ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  check (
    (state = 'processing' and worker_id is not null and lease_until is not null)
    or (state in ('pending', 'retry') and worker_id is null and lease_until is null)
  )
);

create index deletion_jobs_due_idx
  on identity.deletion_jobs (next_attempt_at, requested_at, auth_user_id)
  where state in ('pending', 'retry');
create index deletion_jobs_expired_lease_idx
  on identity.deletion_jobs (lease_until, auth_user_id)
  where state = 'processing';

alter table identity.deletion_jobs enable row level security;
alter table identity.deletion_jobs force row level security;
revoke all on table identity.deletion_jobs
  from public, anon, authenticated, service_role;

create or replace function identity_api.issue_action_token(
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
  if not exists (
    select 1
    from identity.accounts as account
    where account.auth_user_id = requested_auth_user_id
      and account.state in ('active_unconfirmed', 'active_confirmed')
  ) then
    raise exception using errcode = '28000', message = 'account is unavailable';
  end if;

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

create or replace function identity_api.stage_action_token(
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
      join identity.accounts as account using (auth_user_id)
      where token.token_hash = requested_token_hash
        and token.purpose = requested_purpose
        and token.used_at is null
        and token.invalidated_at is null
        and token.expires_at > transaction_timestamp()
        and account.state in ('active_unconfirmed', 'active_confirmed')
    ) as valid,
    requested_purpose as purpose;
$$;

create or replace function identity_api.consume_action_token(
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
    and exists (
      select 1
      from identity.accounts as account
      where account.auth_user_id = token.auth_user_id
        and account.state in ('active_unconfirmed', 'active_confirmed')
    )
  returning token.auth_user_id;
$$;

create function identity_api.request_deletion(
  requested_auth_user_id uuid,
  requested_session_id uuid
)
returns table (
  changed boolean,
  requested_at timestamptz,
  purge_due_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state text;
  current_requested_at timestamptz;
  current_purge_due_at timestamptz;
  current_avatar_key text;
  request_time constant timestamptz := transaction_timestamp();
  purge_time constant timestamptz :=
    transaction_timestamp() + interval '30 days';
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

  if not identity.password_assurance_is_recent(
    requested_auth_user_id,
    requested_session_id,
    transaction_timestamp()
  ) then
    raise exception using errcode = '28000', message = 'recent authentication required';
  end if;

  select
    account.state,
    account.deletion_requested_at,
    account.purge_due_at,
    profile.avatar_object_key
  into
    current_state,
    current_requested_at,
    current_purge_due_at,
    current_avatar_key
  from identity.accounts as account
  join identity.profiles as profile using (auth_user_id)
  where account.auth_user_id = requested_auth_user_id
  for update of account, profile;

  if not found then
    raise exception using errcode = 'P0002', message = 'account is unavailable';
  end if;

  if current_state = 'deletion_pending' then
    return query select false, current_requested_at, current_purge_due_at;
    return;
  end if;

  if current_state <> 'active_confirmed' then
    raise exception using errcode = '28000', message = 'account is unavailable';
  end if;

  update identity.accounts
  set state = 'deletion_pending',
    deletion_requested_at = request_time,
    purge_due_at = purge_time
  where auth_user_id = requested_auth_user_id;

  if current_avatar_key is not null then
    update identity.profiles
    set avatar_version = avatar_version + 1,
      avatar_object_key = null,
      updated_at = transaction_timestamp()
    where auth_user_id = requested_auth_user_id;

    perform identity.enqueue_avatar_cleanup(
      requested_auth_user_id,
      current_avatar_key
    );
  end if;

  insert into identity.deletion_jobs (
    auth_user_id,
    state,
    requested_at,
    purge_due_at,
    next_attempt_at
  ) values (
    requested_auth_user_id,
    'pending',
    request_time,
    purge_time,
    request_time
  )
  on conflict (auth_user_id) do nothing;

  return query
    select true, request_time, purge_time;
end;
$$;

create function identity_api.claim_deletion_job(
  requested_worker_id text,
  requested_lease_seconds integer
)
returns table (
  auth_user_id uuid,
  attempts integer,
  requested_at timestamptz,
  purge_due_at timestamptz,
  lease_until timestamptz,
  state text,
  worker_id text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_worker_id is null
    or char_length(requested_worker_id) not between 1 and 64
    or requested_worker_id !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
    or requested_lease_seconds not between 1 and 900
  then
    raise exception using errcode = '22023', message = 'invalid deletion claim';
  end if;

  return query
  with candidate as (
    select job.auth_user_id
    from identity.deletion_jobs as job
    where (
        job.state in ('pending', 'retry')
        and job.next_attempt_at <= transaction_timestamp()
      ) or (
        job.state = 'processing'
        and job.lease_until <= transaction_timestamp()
      )
    order by
      case
        when job.state = 'processing' then job.lease_until
        else job.next_attempt_at
      end,
      job.auth_user_id
    for update skip locked
    limit 1
  ), claimed as (
    update identity.deletion_jobs as job
    set state = 'processing',
      worker_id = requested_worker_id,
      lease_until = transaction_timestamp()
        + make_interval(secs => requested_lease_seconds),
      attempts = job.attempts + 1
    from candidate
    where job.auth_user_id = candidate.auth_user_id
    returning job.*
  )
  select
    claimed.auth_user_id,
    claimed.attempts,
    claimed.requested_at,
    claimed.purge_due_at,
    claimed.lease_until,
    claimed.state,
    claimed.worker_id
  from claimed;
end;
$$;

create function identity_api.complete_deletion_job(requested_auth_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from identity.accounts as account
    where account.auth_user_id = requested_auth_user_id
  );
$$;

create function identity_api.retry_deletion_job(
  requested_auth_user_id uuid,
  requested_error_code text,
  requested_next_attempt_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_error_code is null
    or requested_error_code !~ '^[a-z][a-z0-9_]{0,63}$'
    or requested_next_attempt_at is null
    or requested_next_attempt_at < transaction_timestamp()
  then
    raise exception using errcode = '22023', message = 'invalid deletion retry';
  end if;

  update identity.deletion_jobs
  set state = 'retry',
    next_attempt_at = least(requested_next_attempt_at, purge_due_at),
    worker_id = null,
    lease_until = null,
    last_error_code = requested_error_code
  where auth_user_id = requested_auth_user_id;

  return true;
end;
$$;

comment on function identity_api.request_deletion(uuid, uuid) is
  'SECURITY DEFINER is required for service-only atomic deletion state and queue writes. It fixes search_path, validates the supplied live user/session pair and exact ten-minute password assurance without user_metadata, locks only identity rows, and depublicizes any avatar before returning.';
comment on function identity_api.claim_deletion_job(text, integer) is
  'SECURITY DEFINER is required for a service-only bounded purge claim. It fixes search_path and uses FOR UPDATE SKIP LOCKED only for the short claim transaction; external Auth and Storage work occurs after commit.';
comment on function identity_api.complete_deletion_job(uuid) is
  'SECURITY DEFINER is required for service-only idempotent completion checks. It fixes search_path and reports success only after the identity account is already absent, preventing premature queue removal.';
comment on function identity_api.retry_deletion_job(uuid, text, timestamptz) is
  'SECURITY DEFINER is required for service-only durable purge retry scheduling. It fixes search_path, retains deletion-pending privacy, stores only a bounded non-secret error code, and clamps retry to the purge deadline.';

revoke execute on function identity_api.request_deletion(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.claim_deletion_job(text, integer)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.complete_deletion_job(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.retry_deletion_job(uuid, text, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function identity_api.request_deletion(uuid, uuid)
  to service_role;
grant execute on function identity_api.claim_deletion_job(text, integer)
  to service_role;
grant execute on function identity_api.complete_deletion_job(uuid)
  to service_role;
grant execute on function identity_api.retry_deletion_job(uuid, text, timestamptz)
  to service_role;
