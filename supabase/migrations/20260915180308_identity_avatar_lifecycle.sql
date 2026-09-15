insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'profile-avatars',
  'profile-avatars',
  false,
  4194304,
  array['image/webp']
);

create table identity.avatar_cleanup_jobs (
  id bigint generated always as identity primary key,
  auth_user_id uuid
    references identity.accounts(auth_user_id) on delete set null,
  object_key text not null unique
    check (
      object_key ~ '^profiles/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-9][0-9]*-[0-9a-f]{32,64}[.]webp$'
    ),
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'retry')),
  delete_by timestamptz not null,
  next_attempt_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  worker_id text,
  lease_until timestamptz,
  last_error_code text,
  check (next_attempt_at <= delete_by),
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

create index avatar_cleanup_jobs_auth_user_id_idx
  on identity.avatar_cleanup_jobs (auth_user_id);
create index avatar_cleanup_jobs_due_idx
  on identity.avatar_cleanup_jobs (next_attempt_at, delete_by, id)
  where state in ('pending', 'retry');
create index avatar_cleanup_jobs_expired_lease_idx
  on identity.avatar_cleanup_jobs (lease_until, id)
  where state = 'processing';

alter table identity.avatar_cleanup_jobs enable row level security;
alter table identity.avatar_cleanup_jobs force row level security;
revoke all on table identity.avatar_cleanup_jobs
  from public, anon, authenticated, service_role;
revoke all on sequence identity.avatar_cleanup_jobs_id_seq
  from public, anon, authenticated, service_role;

create function identity.active_service_session(
  requested_auth_user_id uuid,
  requested_session_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions as session
    join identity.accounts as account
      on account.auth_user_id = session.user_id
    where session.id = requested_session_id
      and session.user_id = requested_auth_user_id
      and (session.not_after is null or session.not_after > transaction_timestamp())
      and account.state = 'active_confirmed'
  );
$$;

create function identity.enqueue_avatar_cleanup(
  requested_auth_user_id uuid,
  requested_object_key text
)
returns void
language sql
set search_path = ''
as $$
  insert into identity.avatar_cleanup_jobs (
    auth_user_id,
    object_key,
    state,
    delete_by,
    next_attempt_at
  ) values (
    requested_auth_user_id,
    requested_object_key,
    'pending',
    transaction_timestamp() + interval '24 hours',
    transaction_timestamp()
  )
  on conflict (object_key) do nothing;
$$;

create function identity_api.swap_avatar(
  requested_auth_user_id uuid,
  requested_session_id uuid,
  expected_avatar_version bigint,
  candidate_object_key text
)
returns table (
  swapped boolean,
  avatar_version bigint,
  previous_object_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_public_id uuid;
  current_avatar_version bigint;
  current_object_key text;
begin
  if not identity.active_service_session(
    requested_auth_user_id,
    requested_session_id
  ) then
    raise exception using errcode = '28000', message = 'session is not active';
  end if;

  select account.public_id, profile.avatar_version, profile.avatar_object_key
  into current_public_id, current_avatar_version, current_object_key
  from identity.accounts as account
  join identity.profiles as profile using (auth_user_id)
  where account.auth_user_id = requested_auth_user_id
  for update of profile;

  if not found then
    raise exception using errcode = 'P0002', message = 'profile is unavailable';
  end if;

  if candidate_object_key is null
    or candidate_object_key = current_object_key
    or candidate_object_key !~ (
      '^profiles/' || current_public_id::text || '/'
      || '[1-9][0-9]*-[0-9a-f]{32,64}[.]webp$'
    )
  then
    raise exception using errcode = '22023', message = 'invalid avatar object key';
  end if;

  if current_avatar_version <> expected_avatar_version then
    perform identity.enqueue_avatar_cleanup(
      requested_auth_user_id,
      candidate_object_key
    );
    return query select false, current_avatar_version, current_object_key;
    return;
  end if;

  update identity.profiles
  set avatar_version = current_avatar_version + 1,
    avatar_object_key = candidate_object_key,
    updated_at = transaction_timestamp()
  where auth_user_id = requested_auth_user_id;

  if current_object_key is not null then
    perform identity.enqueue_avatar_cleanup(
      requested_auth_user_id,
      current_object_key
    );
  end if;

  return query
    select true, current_avatar_version + 1, current_object_key;
end;
$$;

create function identity_api.remove_avatar(
  requested_auth_user_id uuid,
  requested_session_id uuid
)
returns table (
  changed boolean,
  avatar_version bigint,
  previous_object_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_avatar_version bigint;
  current_object_key text;
begin
  if not identity.active_service_session(
    requested_auth_user_id,
    requested_session_id
  ) then
    raise exception using errcode = '28000', message = 'session is not active';
  end if;

  select profile.avatar_version, profile.avatar_object_key
  into current_avatar_version, current_object_key
  from identity.profiles as profile
  where profile.auth_user_id = requested_auth_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'profile is unavailable';
  end if;

  if current_object_key is null then
    return query select false, current_avatar_version, null::text;
    return;
  end if;

  update identity.profiles
  set avatar_version = current_avatar_version + 1,
    avatar_object_key = null,
    updated_at = transaction_timestamp()
  where auth_user_id = requested_auth_user_id;

  perform identity.enqueue_avatar_cleanup(
    requested_auth_user_id,
    current_object_key
  );

  return query
    select true, current_avatar_version + 1, current_object_key;
end;
$$;

create function identity_api.claim_avatar_cleanup_job(
  requested_worker_id text,
  requested_lease_seconds integer
)
returns table (
  id bigint,
  auth_user_id uuid,
  object_key text,
  attempts integer,
  delete_by timestamptz,
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
    raise exception using errcode = '22023', message = 'invalid cleanup claim';
  end if;

  return query
  with candidate as (
    select job.id
    from identity.avatar_cleanup_jobs as job
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
      job.id
    for update skip locked
    limit 1
  ), claimed as (
    update identity.avatar_cleanup_jobs as job
    set state = 'processing',
      worker_id = requested_worker_id,
      lease_until = transaction_timestamp()
        + make_interval(secs => requested_lease_seconds),
      attempts = job.attempts + 1
    from candidate
    where job.id = candidate.id
    returning job.*
  )
  select
    claimed.id,
    claimed.auth_user_id,
    claimed.object_key,
    claimed.attempts,
    claimed.delete_by,
    claimed.lease_until,
    claimed.state,
    claimed.worker_id
  from claimed;
end;
$$;

create function identity_api.complete_avatar_cleanup_job(requested_job_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with completed as (
    delete from identity.avatar_cleanup_jobs
    where id = requested_job_id
    returning id
  )
  select true;
$$;

create function identity_api.retry_avatar_cleanup_job(
  requested_job_id bigint,
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
    raise exception using errcode = '22023', message = 'invalid cleanup retry';
  end if;

  update identity.avatar_cleanup_jobs
  set state = 'retry',
    next_attempt_at = least(requested_next_attempt_at, delete_by),
    worker_id = null,
    lease_until = null,
    last_error_code = requested_error_code
  where id = requested_job_id;

  return true;
end;
$$;

comment on function identity_api.swap_avatar(uuid, uuid, bigint, text) is
  'SECURITY DEFINER is required for service-only CAS writes to private identity state. It fixes search_path, validates the supplied active confirmed user/session pair without user_metadata, locks one profile briefly, validates the immutable owner key, and durably queues losing or superseded keys.';
comment on function identity_api.remove_avatar(uuid, uuid) is
  'SECURITY DEFINER is required for service-only immediate avatar depublication. It fixes search_path, validates the supplied active confirmed user/session pair without user_metadata, locks one profile briefly, and queues the prior key in the same transaction.';
comment on function identity_api.claim_avatar_cleanup_job(text, integer) is
  'SECURITY DEFINER is required for a service-only bounded queue claim. It fixes search_path and uses FOR UPDATE SKIP LOCKED only for the short claim transaction; external Storage work occurs after commit.';
comment on function identity_api.complete_avatar_cleanup_job(bigint) is
  'SECURITY DEFINER is required for service-only idempotent queue completion. It fixes search_path and treats an already absent job as success.';
comment on function identity_api.retry_avatar_cleanup_job(bigint, text, timestamptz) is
  'SECURITY DEFINER is required for service-only durable retry scheduling. It fixes search_path, stores only a bounded non-secret error code, and clamps retry to the cleanup deadline.';

revoke execute on function identity.active_service_session(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function identity.enqueue_avatar_cleanup(uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.swap_avatar(uuid, uuid, bigint, text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.remove_avatar(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.claim_avatar_cleanup_job(text, integer)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.complete_avatar_cleanup_job(bigint)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.retry_avatar_cleanup_job(bigint, text, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function identity_api.swap_avatar(uuid, uuid, bigint, text)
  to service_role;
grant execute on function identity_api.remove_avatar(uuid, uuid)
  to service_role;
grant execute on function identity_api.claim_avatar_cleanup_job(text, integer)
  to service_role;
grant execute on function identity_api.complete_avatar_cleanup_job(bigint)
  to service_role;
grant execute on function identity_api.retry_avatar_cleanup_job(bigint, text, timestamptz)
  to service_role;
