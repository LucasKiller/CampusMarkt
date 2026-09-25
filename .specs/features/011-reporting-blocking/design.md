# Feature Design: 011-reporting-blocking

## 1. Architectural Context & Decisions

CampusMarkt adheres to a modular monolith architecture (AD-006) with decoupled domain packages (`@campusmarkt/domain`, `@campusmarkt/types`, `@campusmarkt/validation`), a Supabase/PostgreSQL backend (`marketplace` and `marketplace_api` schemas), and a Next.js App Router web application (`apps/web`).

### Key Architecture Decisions
- **AD-006**: Self-hosted Supabase stack on a single budget VPS; keep queries bounded without extra daemons.
- **AD-009**: Database RPC boundary (`marketplace_api`) and transactional integrity.
- **AD-010**: Keyset pagination on `(created_at, id)` for feed.
- **AD-011**: PostgreSQL native full-text search with GIN index.
- **AD-016**: User blocking and report confidentiality are architected as database-layer security boundaries executed within PostgreSQL RPCs and Row Level Security. Bidirectional user blocks (`marketplace.user_blocks`) are enforced inside `marketplace_api` RPCs (`get_public_feed`, `search_listings`, `send_message`, `create_offer`, `get_or_create_conversation`) using index-backed anti-joins supported by dual composite B-tree indexes (`(blocker_id, blocked_id)` and `(blocked_id, blocker_id)`). Reports (`marketplace.reports`) enforce strict write-only submission with reporter-blind RLS where reported targets have zero `SELECT` visibility across all API surfaces, eliminating covert channel leaks by construction.

---

## 2. Domain Model & Taxonomy

### 2.1 Report Reasons Taxonomy
- `prohibited_content`: Weapons, ammunition, drugs, alcohol, adult/sexual services, hazardous materials, stolen/counterfeit goods.
- `fraud_or_scam`: Deceptive item description, advance-fee requests, off-platform payment redirection, phishing.
- `harassment_or_abuse`: Threatening, abusive, discriminatory, or sexually harassing messages or conduct.
- `unsupported_content`: Services, jobs, housing/rooms, shipping-only, barter/swap listings.
- `privacy_violation`: Unsolicited exposure of personal phone numbers, emails, addresses, or impersonation.
- `other`: Policy violations not specifically enumerated.

### 2.2 Report Status Lifecycle
```text
  [User Submits Report]
            |
            v
       +---------+
       | PENDING |
       +---------+
         /   |   \
        /    |    \
       v     v     v
[ REVIEWED ] [ DISMISSED ] [ ACTIONED ]  (Managed by Feature 012 Moderation)
```

### 2.3 User Block Symmetry
```text
User A blocks User B:
  - User A cannot see User B's listings in feed/search.
  - User B cannot see User A's listings in feed/search.
  - Neither user can initiate chat or send messages to the other (HTTP 403 USER_BLOCKED).
  - Neither user can submit offers or reservations to the other (HTTP 403 USER_BLOCKED).
  - User A can unblock User B at any time via /account/blocked-users.
```

---

## 3. Database Layer & Schema

### 3.1 Migration: `20260925220000_marketplace_reporting_and_blocking.sql`

```sql
create type marketplace.report_reason as enum (
  'prohibited_content',
  'fraud_or_scam',
  'harassment_or_abuse',
  'unsupported_content',
  'privacy_violation',
  'other'
);

create type marketplace.report_target_type as enum (
  'listing',
  'user'
);

create type marketplace.report_status as enum (
  'pending',
  'reviewed',
  'dismissed',
  'actioned'
);

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
```

### 3.2 Database RPCs: `marketplace_api`

```sql
-- 1. Submit Report
create or replace function marketplace_api.submit_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_report_id uuid;
  v_owner_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Self-reporting check
  if p_target_type = 'user' and p_target_id = v_user_id then
    raise exception 'CANNOT_REPORT_SELF' using errcode = 'P0002';
  end if;

  if p_target_type = 'listing' then
    select seller_id into v_owner_id from marketplace.listings where id = p_target_id;
    if not found then
      raise exception 'LISTING_NOT_FOUND' using errcode = 'P0003';
    end if;
    if v_owner_id = v_user_id then
      raise exception 'CANNOT_REPORT_SELF' using errcode = 'P0002';
    end if;
  end if;

  -- Duplicate pending check
  if exists (
    select 1 from marketplace.reports
     where reporter_id = v_user_id
       and target_type = p_target_type::marketplace.report_target_type
       and target_id = p_target_id
       and status = 'pending'
  ) then
    raise exception 'REPORT_ALREADY_PENDING' using errcode = 'P0004';
  end if;

  insert into marketplace.reports (
    reporter_id, target_type, target_id, reason, details
  ) values (
    v_user_id,
    p_target_type::marketplace.report_target_type,
    p_target_id,
    p_reason::marketplace.report_reason,
    p_details
  ) returning id into v_report_id;

  return jsonb_build_object(
    'reportId', v_report_id,
    'status', 'pending',
    'createdAt', now()
  );
end;
$$;

-- 2. Block User
create or replace function marketplace_api.block_user(
  p_blocked_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_block_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if v_user_id = p_blocked_id then
    raise exception 'CANNOT_BLOCK_SELF' using errcode = 'P0002';
  end if;

  insert into marketplace.user_blocks (
    blocker_id, blocked_id
  ) values (
    v_user_id, p_blocked_id
  )
  on conflict (blocker_id, blocked_id) do update
    set created_at = now()
  returning id into v_block_id;

  return jsonb_build_object(
    'blockId', v_block_id,
    'blockedId', p_blocked_id,
    'createdAt', now()
  );
end;
$$;

-- 3. Unblock User
create or replace function marketplace_api.unblock_user(
  p_blocked_id uuid
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
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  delete from marketplace.user_blocks
   where blocker_id = v_user_id
     and blocked_id = p_blocked_id;

  return jsonb_build_object(
    'unblockedId', p_blocked_id,
    'success', true
  );
end;
$$;
```

---

## 4. Application & Server Services

### 4.1 Transport DTOs (`packages/types/src/listings/safety.ts`)
- `ReportReason`: enum values.
- `CreateReportRequest`: `{ targetType: 'listing' | 'user', targetId: string, reason: ReportReason, details?: string }`.
- `ReportConfirmationDTO`: `{ reportId: string, status: 'pending', createdAt: string }`.
- `UserBlockDTO`: `{ id: string, blockedId: string, blockedName: string, avatarUrl?: string, createdAt: string }`.

### 4.2 Application Service (`MarketplaceSafetyService`)
- Coordinates validation (`validateCreateReportInput`, `validateBlockUserInput`).
- Rate limiting check: 10 actions per 60 seconds per user.
- Calls `MarketplaceSafetyRepository`.
- Publishes telemetry events: `marketplace.report.submitted`, `marketplace.user.blocked`, `marketplace.user.unblocked`.

---

## 5. UI Components & User Journeys

### 5.1 Report Modal (`ReportModal`)
- Triggered by "Inserat melden" button on listing details or "Nutzer melden" in conversation options dropdown.
- Accessible modal with reason selector, optional details textarea with character counter ($\le 1000$), and confirmation submission.
- Success confirmation dialog reassuring confidential processing.

### 5.2 Block User Modal & Confirmation
- Triggered by "Nutzer blockieren" action in chat header or seller profile card.
- Modal clearly explains mutual blocking effects (chat terminated, mutual listings hidden, offers blocked).
- Confirmation triggers `POST /api/marketplace/blocks`.

### 5.3 Blocked Users Management Page (`/account/blocked-users`)
- Lists all active blocks with user name, avatar, date blocked, and "Entsperren" (Unblock) button.
- Accessible empty state when no users are blocked.

### 5.4 Mutual Interaction Guards
- If a user attempts to view a listing owned by a user they have blocked (or who blocked them), returns 404.
- In chat threads between blocked users, message input is disabled with explanatory banner.
