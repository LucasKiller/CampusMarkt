# Feature Design: 009-messaging

## 1. Architectural Context & Decisions

CampusMarkt adheres to a modular monolith architecture (AD-006) with transport-neutral domain and validation packages (`@campusmarkt/domain`, `@campusmarkt/types`, `@campusmarkt/validation`), a Supabase/PostgreSQL backend (`marketplace` and `marketplace_api` schemas), and a Next.js App Router web application (`apps/web`).

### Key Architecture Decisions
- **AD-006**: Self-hosted Supabase stack on a single budget VPS; keep database queries bounded and avoid external caching daemons (Redis).
- **AD-009**: Database RPC boundary (`marketplace_api`) and transactional integrity.
- **AD-013**: Atomic reservation exclusivity using row-level locking on `marketplace.listings`.
- **AD-014**: Marketplace private messaging is architected as 1:1 listing-scoped conversations (`UNIQUE (listing_id, buyer_id)`) persisted in PostgreSQL (`marketplace.conversations` and `marketplace.messages`) with participant-only Row Level Security (`auth.uid() IN (buyer_id, seller_id)`). Message dispatch is authored exclusively via authenticated Next.js REST API / PostgreSQL RPC (`marketplace_api.send_message`), while realtime delivery uses Supabase Realtime channel subscription backed by deterministic keyset hydration (`GET /api/marketplace/conversations/[id]/messages?after=<id>`) upon reconnection or visibility recovery. Structured transaction states (offers, reservations) remain completely isolated in their dedicated tables and can only be rendered as read-only event milestones in conversation feeds without mutable chat synthesis.

---

## 2. Domain Model & Schemas

### 2.1 Entity Relationships
```text
+------------------------+          +-------------------------+
|  marketplace.listings  |          |      auth.users         |
+------------------------+          +-------------------------+
            |                               |         |
            | 1                             | buyer   | seller
            |                               |         |
            v N                             v         v
+-------------------------------------------------------------+
|                marketplace.conversations                    |
|  - id: uuid (PK)                                            |
|  - listing_id: uuid (FK listings)                           |
|  - buyer_id: uuid (FK users)                                |
|  - seller_id: uuid (FK users)                               |
|  - last_message_at: timestamptz                             |
|  - created_at / updated_at: timestamptz                     |
|  - UNIQUE (listing_id, buyer_id)                            |
|  - CHECK (buyer_id <> seller_id)                            |
+-------------------------------------------------------------+
                               | 1
                               |
                               v N
+-------------------------------------------------------------+
|                  marketplace.messages                       |
|  - id: uuid (PK)                                            |
|  - conversation_id: uuid (FK conversations)                 |
|  - sender_id: uuid (FK users)                               |
|  - content: text (1-2000 chars)                             |
|  - read_at: timestamptz NULL                                |
|  - created_at: timestamptz                                  |
+-------------------------------------------------------------+
```

### 2.2 Domain State & Transition Rules
- Conversations are created once per `(listing_id, buyer_id)` via `marketplace_api.get_or_create_conversation`.
- Messages are immutable once inserted. There is no editing or deleting of messages in V1.
- Read receipts: `marketplace_api.mark_conversation_read` sets `read_at = now()` for all incoming messages where `sender_id <> auth.uid()` and `read_at IS NULL`.
- Decoupled Milestone Projection: When rendering a conversation, the client fetches the listing's active offers and reservations for that buyer and seller, and renders read-only system event pills (e.g. "Angebot von €20.00 gesendet", "Reservierung aktiv") sorted by timestamp alongside chat messages.

---

## 3. Database Layer & Schema

### 3.1 Migration: `20260924200000_marketplace_conversations_and_messages.sql`

```sql
create table if not exists marketplace.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_conversation_listing_buyer unique (listing_id, buyer_id),
  constraint chk_no_self_conversation check (buyer_id <> seller_id)
);

create table if not exists marketplace.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references marketplace.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists idx_conversations_buyer_updated
  on marketplace.conversations (buyer_id, last_message_at desc);

create index if not exists idx_conversations_seller_updated
  on marketplace.conversations (seller_id, last_message_at desc);

create index if not exists idx_messages_conversation_created
  on marketplace.messages (conversation_id, created_at asc, id asc);

create index if not exists idx_messages_unread
  on marketplace.messages (conversation_id, sender_id, read_at)
  where read_at is null;

-- Row Level Security
alter table marketplace.conversations enable row level security;
alter table marketplace.messages enable row level security;

create policy "Participants can view their conversations"
  on marketplace.conversations for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Participants can view their messages"
  on marketplace.messages for select
  to authenticated
  using (
    exists (
      select 1 from marketplace.conversations c
       where c.id = conversation_id
         and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
```

### 3.2 Database RPCs: `marketplace_api`

```sql
-- 1. Get or Create Conversation
create or replace function marketplace_api.get_or_create_conversation(
  p_listing_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_seller_id uuid;
  v_listing_status marketplace.listing_status;
  v_conv record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  select seller_id, status into v_seller_id, v_listing_status
    from marketplace.listings
   where id = p_listing_id;

  if not found or v_listing_status = 'archived' then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_seller_id = v_user_id then
    raise exception 'CANNOT_MESSAGE_OWN_LISTING' using errcode = 'P0003';
  end if;

  -- Atomic insert or retrieve existing
  insert into marketplace.conversations (
    listing_id, buyer_id, seller_id
  ) values (
    p_listing_id, v_user_id, v_seller_id
  )
  on conflict (listing_id, buyer_id) do update
    set updated_at = now()
  returning * into v_conv;

  return jsonb_build_object(
    'conversationId', v_conv.id,
    'listingId', v_conv.listing_id,
    'buyerId', v_conv.buyer_id,
    'sellerId', v_conv.seller_id,
    'createdAt', v_conv.created_at
  );
end;
$$;

-- 2. Send Message
create or replace function marketplace_api.send_message(
  p_conversation_id uuid,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, marketplace, auth
as $$
declare
  v_user_id uuid;
  v_conv record;
  v_message_id uuid;
  v_trimmed text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  v_trimmed := trim(p_content);
  if char_length(v_trimmed) = 0 or char_length(p_content) > 2000 then
    raise exception 'INVALID_MESSAGE_CONTENT' using errcode = 'P0004';
  end if;

  select * into v_conv from marketplace.conversations where id = p_conversation_id;
  if not found then
    raise exception 'CONVERSATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_conv.buyer_id <> v_user_id and v_conv.seller_id <> v_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  insert into marketplace.messages (
    conversation_id, sender_id, content
  ) values (
    p_conversation_id, v_user_id, v_trimmed
  ) returning id into v_message_id;

  update marketplace.conversations
     set last_message_at = now(), updated_at = now()
   where id = p_conversation_id;

  return jsonb_build_object(
    'messageId', v_message_id,
    'conversationId', p_conversation_id,
    'senderId', v_user_id,
    'content', v_trimmed,
    'createdAt', now()
  );
end;
$$;
```

---

## 4. Application & Server Services

### 4.1 Transport DTOs (`packages/types/src/listings/messaging.ts`)
- `ConversationDTO`: metadata, listing summary, partner public profile (display name, avatar, university verification status), unread count, last message summary.
- `MessageDTO`: `id`, `conversationId`, `senderId`, `content`, `createdAt`, `readAt`.
- `SendMessageRequest`: `{ content: string }`.

### 4.2 Application Service (`MarketplaceMessagingService`)
- Coordinates validation (`validateSendMessageInput`).
- Rate limiting check: 30 actions per 60 seconds per user IP/ID.
- Calls `MarketplaceMessagingRepository`.
- Publishes telemetry events: `marketplace.message.sent`, `marketplace.conversation.read`.

---

## 5. Web UI Components & User Journeys

### 5.1 Inbox (`/messages`)
- Server component pre-fetches user conversations using `MarketplaceMessagingService.getUserConversations(userId)`.
- Displays responsive conversation cards showing listing thumbnail, listing title, partner name with university verification badge, last message preview, timestamp, and unread pill.
- Accessible empty state with browse CTA.

### 5.2 Conversation View (`/messages/[id]`)
- Sticky top header showing back arrow to inbox, partner name + trust badge, and listing summary link.
- Sticky negotiation bar showing current offer/reservation status with direct action CTAs (Accept/Decline/Cancel Reservation) matching Feature 008.
- Scrollable message stream with keyset pagination for older messages and auto-scroll to bottom on new messages.
- Realtime subscription to `conversation:<id>` with automatic fallback to keyset reconciliation on focus/reconnect.
- Accessible message composer form with character counter and keyboard shortcut (`Cmd+Enter` / `Ctrl+Enter` to submit).

### 5.3 Listing Details Entry Point
- Add "Nachricht schreiben" secondary action button on `/listings/[id]` next to "Kaufanfrage senden" / "Preis vorschlagen".
- Automatically routes to `/messages/[id]` upon opening or creating the thread.
