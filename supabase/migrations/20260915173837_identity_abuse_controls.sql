create table identity.rate_limit_buckets (
  action text not null
    check (action in ('sign_in', 'registration', 'confirmation_resend', 'recovery')),
  subject_kind text not null check (subject_kind in ('identity', 'ip')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  expires_at timestamptz not null check (expires_at > window_started_at),
  primary key (action, subject_kind, subject_hash, window_started_at)
);

create index rate_limit_buckets_expiry_idx
  on identity.rate_limit_buckets (expires_at);

create table identity.security_events (
  id bigint generated always as identity primary key,
  auth_user_id uuid references identity.accounts(auth_user_id) on delete cascade,
  subject_hash text check (subject_hash is null or subject_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  event_type text not null check (
    event_type in (
      'registration', 'confirmation', 'confirmation_resend', 'sign_in',
      'sign_out', 'recovery', 'password_reset', 'reauthentication',
      'profile_update', 'avatar_update', 'account_deletion', 'worker'
    )
  ),
  outcome text not null check (
    outcome in (
      'accepted', 'succeeded', 'denied', 'rate_limited', 'invalid',
      'dependency_failure', 'conflict', 'retry'
    )
  ),
  correlation_id uuid not null,
  occurred_at timestamptz not null default transaction_timestamp(),
  check (subject_hash is not null or ip_hash is not null or auth_user_id is not null)
);

create index security_events_auth_user_occurred_idx
  on identity.security_events (auth_user_id, occurred_at desc);
create index security_events_type_occurred_idx
  on identity.security_events (event_type, occurred_at desc);

alter table identity.rate_limit_buckets enable row level security;
alter table identity.rate_limit_buckets force row level security;
alter table identity.security_events enable row level security;
alter table identity.security_events force row level security;
revoke all on table identity.rate_limit_buckets from public, anon, authenticated, service_role;
revoke all on table identity.security_events from public, anon, authenticated, service_role;
revoke all on sequence identity.security_events_id_seq from public, anon, authenticated, service_role;

create function identity_api.consume_rate_limits(
  requested_action text,
  requested_subject_hash text,
  requested_ip_hash text
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked_at constant timestamptz := transaction_timestamp();
  window_seconds integer;
  identity_limit integer;
  ip_limit integer;
  window_start timestamptz;
  window_end timestamptz;
  identity_attempts integer;
  ip_attempts integer;
  identity_expiry timestamptz;
  ip_expiry timestamptz;
begin
  if requested_subject_hash !~ '^[0-9a-f]{64}$'
    or requested_ip_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'invalid rate limit fingerprint';
  end if;

  case requested_action
    when 'sign_in' then
      window_seconds := 900;
      identity_limit := 10;
      ip_limit := 100;
    when 'registration', 'confirmation_resend', 'recovery' then
      window_seconds := 3600;
      identity_limit := 3;
      ip_limit := 30;
    else
      raise exception using errcode = '22023', message = 'invalid rate limit action';
  end case;

  window_start := to_timestamp(
    floor(extract(epoch from checked_at) / window_seconds) * window_seconds
  );
  window_end := window_start + make_interval(secs => window_seconds);

  insert into identity.rate_limit_buckets (
    action, subject_kind, subject_hash, window_started_at, attempts, expires_at
  ) values (
    requested_action, 'identity', requested_subject_hash, window_start, 1, window_end
  )
  on conflict (action, subject_kind, subject_hash, window_started_at)
  do update set attempts = identity.rate_limit_buckets.attempts + 1
  returning attempts, expires_at into identity_attempts, identity_expiry;

  insert into identity.rate_limit_buckets (
    action, subject_kind, subject_hash, window_started_at, attempts, expires_at
  ) values (
    requested_action, 'ip', requested_ip_hash, window_start, 1, window_end
  )
  on conflict (action, subject_kind, subject_hash, window_started_at)
  do update set attempts = identity.rate_limit_buckets.attempts + 1
  returning attempts, expires_at into ip_attempts, ip_expiry;

  allowed := identity_attempts <= identity_limit and ip_attempts <= ip_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      case when identity_attempts > identity_limit
        then ceil(extract(epoch from identity_expiry - checked_at))::integer
        else 0
      end,
      case when ip_attempts > ip_limit
        then ceil(extract(epoch from ip_expiry - checked_at))::integer
        else 0
      end,
      1
    )
  end;
  return next;
end;
$$;

create function identity_api.append_security_event(
  requested_auth_user_id uuid,
  requested_subject_hash text,
  requested_ip_hash text,
  requested_event_type text,
  requested_outcome text,
  requested_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_auth_user_id is null
    and requested_subject_hash is null
    and requested_ip_hash is null
  then
    raise exception using errcode = '23514', message = 'security event requires a pseudonymous subject';
  end if;

  insert into identity.security_events (
    auth_user_id, subject_hash, ip_hash, event_type, outcome, correlation_id
  ) values (
    requested_auth_user_id,
    requested_subject_hash,
    requested_ip_hash,
    requested_event_type,
    requested_outcome,
    requested_correlation_id
  );
end;
$$;

comment on function identity_api.consume_rate_limits(text, text, text) is
  'SECURITY DEFINER is required for a service-only atomic upsert against private abuse buckets. It validates pseudonymous fingerprints, fixes search_path, and locks identity before IP consistently.';
comment on function identity_api.append_security_event(uuid, text, text, text, text, uuid) is
  'SECURITY DEFINER is required for service-only append access to the private audit table. It accepts allowlisted values and pseudonymous identifiers only and fixes search_path.';

revoke execute on function identity_api.consume_rate_limits(text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.append_security_event(uuid, text, text, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function identity_api.consume_rate_limits(text, text, text)
  to service_role;
grant execute on function identity_api.append_security_event(uuid, text, text, text, text, uuid)
  to service_role;
