-- Feature 011: Marketplace reporting and blocking tables, indexes, and RLS policies

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'marketplace' and t.typname = 'report_reason') then
    create type marketplace.report_reason as enum (
      'prohibited_content',
      'fraud_or_scam',
      'harassment_or_abuse',
      'unsupported_content',
      'privacy_violation',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'marketplace' and t.typname = 'report_target_type') then
    create type marketplace.report_target_type as enum (
      'listing',
      'user'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'marketplace' and t.typname = 'report_status') then
    create type marketplace.report_status as enum (
      'pending',
      'reviewed',
      'dismissed',
      'actioned'
    );
  end if;
end $$;

create table if not exists marketplace.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type marketplace.report_target_type not null,
  target_id uuid not null,
  reason marketplace.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status marketplace.report_status not null default 'pending',
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp()
);

-- Unique index preventing duplicate pending reports by same reporter for same target
create unique index if not exists idx_one_pending_report_per_target
  on marketplace.reports (reporter_id, target_type, target_id)
  where status = 'pending';

-- Fast lookup for reports by target (for moderation triage)
create index if not exists idx_reports_target
  on marketplace.reports (target_type, target_id, status);

create table if not exists marketplace.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default transaction_timestamp(),
  constraint uq_user_block unique (blocker_id, blocked_id),
  constraint chk_no_self_block check (blocker_id <> blocked_id)
);

-- Bidirectional indexes for high-speed anti-joins in feed and search (AD-016)
create index if not exists idx_user_blocks_blocker
  on marketplace.user_blocks (blocker_id, blocked_id);

create index if not exists idx_user_blocks_blocked
  on marketplace.user_blocks (blocked_id, blocker_id);

-- RLS Enforcement
alter table marketplace.reports enable row level security;
alter table marketplace.reports force row level security;
alter table marketplace.user_blocks enable row level security;
alter table marketplace.user_blocks force row level security;

-- Grants
grant select, insert on table marketplace.reports to authenticated;
grant select, insert, update, delete on table marketplace.reports to service_role;

grant select, insert, delete on table marketplace.user_blocks to authenticated;
grant select, insert, update, delete on table marketplace.user_blocks to service_role;

-- Reports RLS: Reporter can insert and view their own submissions; TARGET HAS ZERO VISIBILITY
create policy "Reporters can insert reports"
  on marketplace.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

create policy "Reporters can view their own reports"
  on marketplace.reports for select
  to authenticated
  using (auth.uid() = reporter_id);

-- Blocks RLS: Users can manage their own blocks
create policy "Users can view their blocks"
  on marketplace.user_blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "Users can insert blocks"
  on marketplace.user_blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "Users can delete their blocks"
  on marketplace.user_blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);
