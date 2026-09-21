create table identity.university_verifications (
  auth_user_id uuid primary key
    references identity.accounts(auth_user_id) on delete cascade,
  university_id text not null
    check (char_length(university_id) between 1 and 64),
  institutional_email_hash text not null
    check (institutional_email_hash ~ '^[0-9a-f]{64}$'),
  status text not null
    check (status in ('pending', 'verified', 'revoked')),
  token_hash bytea
    check (token_hash is null or octet_length(token_hash) = 32),
  token_expires_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  check (
    (status = 'pending' and token_hash is not null and token_expires_at is not null) or
    (status in ('verified', 'revoked') and token_hash is null and token_expires_at is null)
  ),
  check (expires_at is null or expires_at > verified_at)
);

create index university_verifications_email_hash_idx
  on identity.university_verifications (institutional_email_hash);

create index university_verifications_active_badge_idx
  on identity.university_verifications (auth_user_id, status, expires_at);

create index university_verifications_token_hash_idx
  on identity.university_verifications (token_hash)
  where token_hash is not null;

alter table identity.university_verifications enable row level security;
alter table identity.university_verifications force row level security;

revoke all on table identity.university_verifications from public, anon, authenticated;
grant select, insert, update, delete on table identity.university_verifications to service_role;
