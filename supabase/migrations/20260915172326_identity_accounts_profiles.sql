create schema identity;
create schema identity_api;

revoke all on schema identity from public, anon, authenticated;
revoke all on schema identity_api from public, anon, authenticated, service_role;
grant usage on schema identity_api to anon, authenticated, service_role;

create table identity.accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),
  email_key text not null unique
    check (email_key ~ '^[0-9a-f]{64}$'),
  state text not null
    check (state in ('active_unconfirmed', 'active_confirmed', 'deletion_pending')),
  created_at timestamptz not null default transaction_timestamp(),
  confirmed_at timestamptz,
  deletion_requested_at timestamptz,
  purge_due_at timestamptz,
  check (
    (state = 'active_unconfirmed' and confirmed_at is null)
    or (state in ('active_confirmed', 'deletion_pending') and confirmed_at is not null)
  ),
  check ((state = 'deletion_pending') = (deletion_requested_at is not null)),
  check ((state = 'deletion_pending') = (purge_due_at is not null)),
  check (
    purge_due_at is null
    or (
      purge_due_at >= deletion_requested_at
      and purge_due_at <= deletion_requested_at + interval '30 days'
    )
  )
);

create table identity.profiles (
  auth_user_id uuid primary key
    references identity.accounts(auth_user_id) on delete cascade,
  display_name text not null,
  avatar_version bigint not null default 0 check (avatar_version >= 0),
  avatar_object_key text,
  updated_at timestamptz not null default transaction_timestamp(),
  check (char_length(display_name) between 2 and 50),
  check (display_name = btrim(display_name)),
  check (display_name !~ '[[:cntrl:]<>]')
);

create table identity.consents (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null
    references identity.accounts(auth_user_id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 64),
  privacy_version text not null check (char_length(privacy_version) between 1 and 64),
  adult_declared boolean not null check (adult_declared),
  accepted_at timestamptz not null,
  unique (auth_user_id, terms_version, privacy_version)
);

create index consents_auth_user_id_idx
  on identity.consents (auth_user_id);

alter table identity.accounts enable row level security;
alter table identity.accounts force row level security;
alter table identity.profiles enable row level security;
alter table identity.profiles force row level security;
alter table identity.consents enable row level security;
alter table identity.consents force row level security;

revoke all on all tables in schema identity from public, anon, authenticated;
revoke all on all sequences in schema identity from public, anon, authenticated;

create function identity.provision_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap jsonb := new.raw_user_meta_data;
  accepted_at timestamptz;
  initial_state text;
begin
  if jsonb_typeof(bootstrap) <> 'object'
    or bootstrap->>'email_key' !~ '^[0-9a-f]{64}$'
    or char_length(bootstrap->>'display_name') not between 2 and 50
    or bootstrap->>'display_name' <> btrim(bootstrap->>'display_name')
    or bootstrap->>'display_name' ~ '[[:cntrl:]<>]'
    or jsonb_typeof(bootstrap->'adult_declared') <> 'boolean'
    or (bootstrap->>'adult_declared')::boolean is not true
    or char_length(bootstrap->>'terms_version') not between 1 and 64
    or char_length(bootstrap->>'privacy_version') not between 1 and 64
  then
    raise exception using errcode = '22023', message = 'invalid identity bootstrap';
  end if;

  begin
    accepted_at := (bootstrap->>'accepted_at')::timestamptz;
  exception when others then
    raise exception using errcode = '22023', message = 'invalid identity bootstrap';
  end;

  if accepted_at is null then
    raise exception using errcode = '22023', message = 'invalid identity bootstrap';
  end if;

  initial_state := case
    when new.confirmed_at is null then 'active_unconfirmed'
    else 'active_confirmed'
  end;

  insert into identity.accounts (
    auth_user_id, email_key, state, created_at, confirmed_at
  ) values (
    new.id,
    bootstrap->>'email_key',
    initial_state,
    coalesce(new.created_at, transaction_timestamp()),
    new.confirmed_at
  );

  insert into identity.profiles (auth_user_id, display_name)
  values (new.id, bootstrap->>'display_name');

  insert into identity.consents (
    auth_user_id, terms_version, privacy_version, adult_declared, accepted_at
  ) values (
    new.id,
    bootstrap->>'terms_version',
    bootstrap->>'privacy_version',
    true,
    accepted_at
  );

  return new;
end;
$$;

comment on function identity.provision_auth_user() is
  'SECURITY DEFINER is required for the Auth-owned insert trigger to write private identity projections. It accepts no caller input, validates bounded bootstrap metadata, fixes search_path, and is not executable by API roles.';

revoke execute on function identity.provision_auth_user() from public, anon, authenticated, service_role;

create trigger provision_identity_after_auth_user_insert
after insert on auth.users
for each row execute function identity.provision_auth_user();

create type identity_api.public_profile as (
  public_id uuid,
  display_name text,
  joined_month text,
  avatar_url text
);

create function identity_api.get_public_profile(requested_public_id uuid)
returns setof identity_api.public_profile
language sql
stable
security definer
set search_path = ''
as $$
  select
    account.public_id,
    profile.display_name,
    to_char(account.created_at at time zone 'UTC', 'YYYY-MM') as joined_month,
    case
      when profile.avatar_object_key is null then null
      else '/media/avatars/' || account.public_id::text || '/' || profile.avatar_version::text
    end as avatar_url
  from identity.accounts as account
  join identity.profiles as profile using (auth_user_id)
  where account.public_id = requested_public_id
    and account.state = 'active_confirmed';
$$;

comment on function identity_api.get_public_profile(uuid) is
  'SECURITY DEFINER is required to project four allowlisted public fields without granting base-table access. The fixed SQL body has no dynamic SQL, fixes search_path, and is executable only by the documented API roles.';

revoke execute on function identity_api.get_public_profile(uuid)
  from public, anon, authenticated, service_role;
grant execute on function identity_api.get_public_profile(uuid)
  to anon, authenticated, service_role;
