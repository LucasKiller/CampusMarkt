drop function identity_api.get_public_profile(uuid);

create function identity_api.get_public_profile(requested_public_id uuid)
returns table (
  public_id uuid,
  display_name text,
  joined_month text,
  avatar_url text,
  university_id text,
  badge_label text
)
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
    end as avatar_url,
    case
      when uv.status = 'verified' and uv.expires_at > transaction_timestamp()
      then uv.university_id
      else null
    end as university_id,
    case
      when uv.status = 'verified' and uv.expires_at > transaction_timestamp() and uv.university_id = 'tu-braunschweig'
      then 'TU Braunschweig'
      else null
    end as badge_label
  from identity.accounts as account
  join identity.profiles as profile using (auth_user_id)
  left join identity.university_verifications as uv using (auth_user_id)
  where account.public_id = requested_public_id
    and account.state = 'active_confirmed';
$$;

comment on function identity_api.get_public_profile(uuid) is
  'SECURITY DEFINER is required to project allowlisted public fields including optional active university verification badge without granting base-table access. The fixed SQL body has no dynamic SQL, fixes search_path, and is executable only by the documented API roles.';

revoke execute on function identity_api.get_public_profile(uuid)
  from public, anon, authenticated, service_role;
grant execute on function identity_api.get_public_profile(uuid)
  to anon, authenticated, service_role;
