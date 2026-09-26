# Feature Design: 012-moderation

## 1. Architectural Context & Decisions

CampusMarkt adheres to a modular monolith architecture (AD-006) with decoupled domain packages (`@campusmarkt/domain`, `@campusmarkt/types`, `@campusmarkt/validation`), a Supabase/PostgreSQL backend (`marketplace` and `marketplace_api` schemas), and a Next.js App Router web application (`apps/web`).

### Key Architecture Decisions
- **AD-006**: Self-hosted Supabase stack on a single budget VPS; keep queries bounded without extra daemons.
- **AD-009**: Database RPC boundary (`marketplace_api`) and transactional integrity.
- **AD-016**: Database-layer user blocking enforcement via index-backed anti-joins and reporter-blind RLS.
- **AD-017**: Marketplace moderation authorization, triage operations, and audit records are architected as database-enforced Role-Based Access Control (RBAC) via a dedicated `marketplace.moderator_assignments` table coupled with transactional PostgreSQL RPCs in `marketplace_api` and an append-only audit log in `marketplace.moderation_actions`. Moderator assignments are inaccessible to client modification (`service_role` only write access, preventing self-elevation). All privileged actions (`dismiss_report`, `remove_listing`, `suspend_user`) execute within transactional RPCs with pinned `search_path`, verifying `auth.uid()` against active assignments. Audit entries are committed atomically in the same transaction, and `UPDATE` and `DELETE` privileges on the audit table are explicitly revoked from all non-superuser roles to guarantee mathematical non-repudiation.

---

## 2. Domain Model & Lifecycle

### 2.1 State Transitions
```text
Report Status:
  +---------+   Moderator dismisses (unfounded/duplicate)
  | PENDING |---------------------------------------------> [ DISMISSED ]
  +---------+
       |
       | Moderator takes enforcement action (remove listing or suspend user)
       v
  [ ACTIONED ]

Listing Status:
  +--------+   Owner archives
  | ACTIVE |----------------------------------------------> [ ARCHIVED ]
  +--------+
       |
       | Moderator takes down listing (Marketplace Invariant 9)
       v
  [ REMOVED ]  (Permanent, excluded from search/feed/details, active reservations cancelled)
```

---

## 3. Database Layer & Schema

### 3.1 Migration: `20260926040000_marketplace_moderation.sql`

```sql
-- 1. Ensure 'removed' status is present on marketplace.listing_status
alter type marketplace.listing_status add value if not exists 'removed';

-- 2. Moderator action type enum
create type marketplace.moderator_action_type as enum (
  'dismiss_report',
  'remove_listing',
  'suspend_user'
);

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

-- Moderator assignments: only service_role can grant/revoke
grant select on marketplace.moderator_assignments to authenticated;
grant select, insert, update, delete on marketplace.moderator_assignments to service_role;

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
```

### 3.2 Database RPCs: `marketplace_api`

```sql
-- Helper: verify active moderator
create or replace function marketplace_api.is_moderator(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, marketplace, auth
stable
as $$
  select exists (
    select 1 from marketplace.moderator_assignments
     where user_id = p_user_id and revoked_at is null
  );
$$;

-- 1. Get Moderation Queue
create or replace function marketplace_api.get_moderation_queue()
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_items jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not marketplace_api.is_moderator(v_user_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'reporterId', r.reporter_id,
      'targetType', r.target_type,
      'targetId', r.target_id,
      'reason', r.reason,
      'details', r.details,
      'status', r.status,
      'createdAt', r.created_at,
      'listingTitle', l.title,
      'listingStatus', l.status,
      'userName', p.display_name
    ) order by r.created_at asc
  ), '[]'::jsonb)
  into v_items
  from marketplace.reports r
  left join marketplace.listings l on r.target_type = 'listing' and l.id = r.target_id
  left join marketplace.profiles p on r.target_type = 'user' and p.user_id = r.target_id
  where r.status = 'pending';

  return v_items;
end;
$$;

-- 2. Dismiss Report
create or replace function marketplace_api.dismiss_report(
  p_report_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_report record;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not marketplace_api.is_moderator(v_user_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into v_report from marketplace.reports where id = p_report_id for update;
  if not found then
    raise exception 'REPORT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_report.status <> 'pending' then
    raise exception 'REPORT_ALREADY_RESOLVED' using errcode = 'P0003';
  end if;

  update marketplace.reports
     set status = 'dismissed', updated_at = now()
   where id = p_report_id;

  insert into marketplace.moderation_actions (
    moderator_id, report_id, action_type, target_type, target_id, reason
  ) values (
    v_user_id, p_report_id, 'dismiss_report', v_report.target_type, v_report.target_id, p_reason
  );

  return jsonb_build_object('success', true, 'status', 'dismissed');
end;
$$;

-- 3. Remove Listing
create or replace function marketplace_api.remove_listing_moderator(
  p_report_id uuid,
  p_listing_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not marketplace_api.is_moderator(v_user_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  -- 1. Lock and update listing
  update marketplace.listings
     set status = 'removed', updated_at = now()
   where id = p_listing_id;

  -- 2. Cancel active reservations
  update marketplace.reservations
     set status = 'cancelled',
         cancellation_reason = 'moderation_removal',
         updated_at = now()
   where listing_id = p_listing_id and status = 'active';

  -- 3. Supersede pending offers
  update marketplace.offers
     set status = 'superseded', updated_at = now()
   where listing_id = p_listing_id and status = 'pending';

  -- 4. Update report if provided
  if p_report_id is not null then
    update marketplace.reports
       set status = 'actioned', updated_at = now()
     where id = p_report_id;
  end if;

  -- 5. Append audit entry
  insert into marketplace.moderation_actions (
    moderator_id, report_id, action_type, target_type, target_id, reason
  ) values (
    v_user_id, p_report_id, 'remove_listing', 'listing', p_listing_id, p_reason
  );

  return jsonb_build_object('success', true, 'status', 'removed');
end;
$$;

-- 4. Suspend User
create or replace function marketplace_api.suspend_user_moderator(
  p_report_id uuid,
  p_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_moderator_id uuid;
begin
  v_moderator_id := auth.uid();
  if v_moderator_id is null or not marketplace_api.is_moderator(v_moderator_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  -- 1. Insert suspension
  insert into marketplace.user_suspensions (
    user_id, suspended_by, reason
  ) values (
    p_user_id, v_moderator_id, p_reason
  )
  on conflict (user_id) do update
    set reason = p_reason, created_at = now();

  -- 2. Takedown user active listings
  update marketplace.listings
     set status = 'removed', updated_at = now()
   where seller_id = p_user_id and status in ('active', 'reserved');

  -- 3. Cancel active reservations
  update marketplace.reservations
     set status = 'cancelled',
         cancellation_reason = 'moderation_suspension',
         updated_at = now()
   where (seller_id = p_user_id or buyer_id = p_user_id) and status = 'active';

  -- 4. Update report if provided
  if p_report_id is not null then
    update marketplace.reports
       set status = 'actioned', updated_at = now()
     where id = p_report_id;
  end if;

  -- 5. Append audit entry
  insert into marketplace.moderation_actions (
    moderator_id, report_id, action_type, target_type, target_id, reason
  ) values (
    v_moderator_id, p_report_id, 'suspend_user', 'user', p_user_id, p_reason
  );

  return jsonb_build_object('success', true, 'status', 'suspended');
end;
$$;
```

---

## 4. Application & Server Services

### 4.1 Transport DTOs (`packages/types/src/listings/moderation.ts`)
- `ModerationActionType`: `'dismiss_report' | 'remove_listing' | 'suspend_user'`
- `ModerationQueueItemDTO`: `{ id: string, targetType: 'listing' | 'user', targetId: string, reason: string, details?: string, createdAt: string, listingTitle?: string, userName?: string }`
- `ModerationActionDTO`: `{ id: string, moderatorId: string, actionType: ModerationActionType, targetType: string, targetId: string, reason: string, createdAt: string }`
- `ExecuteModerationActionRequest`: `{ reportId?: string, actionType: ModerationActionType, targetType: 'listing' | 'user', targetId: string, reason: string }`

### 4.2 Application Service (`MarketplaceModerationService`)
- Coordinates validation (`validateModerationActionInput`).
- Verifies moderator authorization via `MarketplaceModerationRepository`.
- Publishes telemetry events: `marketplace.moderation.dismissed`, `marketplace.moderation.listing_removed`, `marketplace.moderation.user_suspended`.

---

## 5. UI Components & User Journeys

### 5.1 Moderation Console Layout (`/moderation`)
- Protected layout verifying `isModerator` server-side; non-moderators receive HTTP 403 or redirect to home.
- Tab navigation: "Prüfwarteschlange" (Queue) and "Audit-Protokoll" (Audit Log).

### 5.2 Review Queue View (`/moderation/page.tsx`)
- Displays pending reports ordered chronologically.
- Report cards with target preview link, reported category, details, and action triggers:
  - "Ablehnen" (Dismiss Report)
  - "Inserat entfernen" (Remove Listing)
  - "Nutzer sperren" (Suspend User)
- Accessible confirmation modal requiring mandatory justification note.

### 5.3 Audit Log View (`/moderation/audit/page.tsx`)
- Displays immutable append-only list of past moderation actions with moderator ID, action badge, target ID, reason, and timestamp.
