create table public.foundation_canary (
  id bigint generated always as identity primary key,
  marker text not null
);

comment on table public.foundation_canary is
  'Foundation-only canary used to verify migrations and private-by-default RLS.';

alter table public.foundation_canary enable row level security;
alter table public.foundation_canary force row level security;

revoke all on table public.foundation_canary from public, anon, authenticated;
revoke all on sequence public.foundation_canary_id_seq from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.foundation_canary to anon, authenticated;
