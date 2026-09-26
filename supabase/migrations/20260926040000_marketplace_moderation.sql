-- Migration: 20260926040000_marketplace_moderation.sql
-- Feature 012: Moderation Console and RBAC (AD-017)

-- 1. Ensure 'removed' status is present on marketplace.listing_status (Marketplace Invariant 9)
alter type marketplace.listing_status add value if not exists 'removed';

-- 2. Moderator action type enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'moderator_action_type' and typnamespace = 'marketplace'::regnamespace) then
    create type marketplace.moderator_action_type as enum (
      'dismiss_report',
      'remove_listing',
      'suspend_user'
    );
  end if;
end $$;

-- 3. Dedicated moderator assignments table (RBAC)
create table if not exists marketplace.moderator_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default transaction_timestamp(),
  revoked_at timestamptz
);

create unique index if not exists idx_active_moderator_assignment
  on marketplace.moderator_assignments (user_id)
  where revoked_at is null;

-- 4. User suspensions table
create table if not exists marketplace.user_suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  suspended_by uuid not null references auth.users(id),
  reason text not null check (char_length(reason) <= 1000),
  created_at timestamptz not null default transaction_timestamp()
);

-- 5. Append-only moderation audit log
create table if not exists marketplace.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id),
  report_id uuid references marketplace.reports(id) on delete set null,
  action_type marketplace.moderator_action_type not null,
  target_type marketplace.report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(trim(reason)) > 0 and char_length(reason) <= 1000),
  created_at timestamptz not null default transaction_timestamp()
);

create index if not exists idx_moderation_actions_created
  on marketplace.moderation_actions (created_at desc);

create index if not exists idx_moderation_actions_target
  on marketplace.moderation_actions (target_type, target_id);

-- 6. Engine-level security & immutable grants (AD-017)
alter table marketplace.moderator_assignments enable row level security;
alter table marketplace.moderator_assignments force row level security;
alter table marketplace.user_suspensions enable row level security;
alter table marketplace.user_suspensions force row level security;
alter table marketplace.moderation_actions enable row level security;
alter table marketplace.moderation_actions force row level security;

-- Revoke all UPDATE and DELETE from non-superusers on audit log
revoke update, delete on marketplace.moderation_actions from public, authenticated, anon;
grant select on marketplace.moderation_actions to authenticated;
grant select, insert on marketplace.moderation_actions to service_role;

-- User suspensions grants
grant select on marketplace.user_suspensions to authenticated;
grant select, insert, update, delete on marketplace.user_suspensions to service_role;

-- Moderator assignments: only service_role can grant/revoke (prevents self-elevation)
revoke insert, update, delete on marketplace.moderator_assignments from public, authenticated, anon;
grant select on marketplace.moderator_assignments to authenticated;
grant select, insert, update, delete on marketplace.moderator_assignments to service_role;

-- RLS Policies
create policy "Users can check moderator status"
  on marketplace.moderator_assignments for select
  to authenticated
  using (true);

create policy "Moderators can view audit log"
  on marketplace.moderation_actions for select
  to authenticated
  using (
    exists (
      select 1 from marketplace.moderator_assignments
       where user_id = auth.uid() and revoked_at is null
    )
  );

create policy "Moderators can view suspensions"
  on marketplace.user_suspensions for select
  to authenticated
  using (
    exists (
      select 1 from marketplace.moderator_assignments
       where user_id = auth.uid() and revoked_at is null
    )
  );
