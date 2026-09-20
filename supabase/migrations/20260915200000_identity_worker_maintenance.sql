create function identity_api.prune_expired_rate_limit_buckets()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from identity.rate_limit_buckets
    where expires_at <= transaction_timestamp()
    returning 1
  )
  select count(*) from removed;
$$;

create function identity_api.prune_stale_session_assurance()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from identity.session_assurance as assurance
    where not exists (
      select 1
      from auth.sessions as session
      where session.id = assurance.session_id
        and (session.not_after is null or session.not_after > transaction_timestamp())
    )
    returning 1
  )
  select count(*) from removed;
$$;

comment on function identity_api.prune_expired_rate_limit_buckets() is
  'SECURITY DEFINER permits the service role to remove expired rate-limit windows. It fixes search_path and removes only expired buckets.';
comment on function identity_api.prune_stale_session_assurance() is
  'SECURITY DEFINER permits the service role to remove session assurances whose backing Auth session is absent or expired. It fixes search_path.';

revoke execute on function identity_api.prune_expired_rate_limit_buckets()
  from public, anon, authenticated, service_role;
revoke execute on function identity_api.prune_stale_session_assurance()
  from public, anon, authenticated, service_role;

grant execute on function identity_api.prune_expired_rate_limit_buckets()
  to service_role;
grant execute on function identity_api.prune_stale_session_assurance()
  to service_role;
