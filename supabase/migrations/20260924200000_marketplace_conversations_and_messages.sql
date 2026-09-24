-- Feature 009: Marketplace conversations and messages

create table if not exists marketplace.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default transaction_timestamp(),
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  constraint uq_conversation_listing_buyer unique (listing_id, buyer_id),
  constraint chk_no_self_conversation check (buyer_id <> seller_id)
);

create table if not exists marketplace.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references marketplace.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default transaction_timestamp()
);

-- Performance Indexes
create index if not exists idx_conversations_buyer_updated
  on marketplace.conversations (buyer_id, last_message_at desc);

create index if not exists idx_conversations_seller_updated
  on marketplace.conversations (seller_id, last_message_at desc);

create index if not exists idx_conversations_listing
  on marketplace.conversations (listing_id);

create index if not exists idx_messages_conversation_created
  on marketplace.messages (conversation_id, created_at asc, id asc);

create index if not exists idx_messages_unread
  on marketplace.messages (conversation_id, sender_id, read_at)
  where read_at is null;

-- Enable and force Row Level Security
alter table marketplace.conversations enable row level security;
alter table marketplace.conversations force row level security;
alter table marketplace.messages enable row level security;
alter table marketplace.messages force row level security;

-- Grants
grant select on table marketplace.conversations to authenticated;
grant select, insert, update, delete on table marketplace.conversations to service_role;

grant select on table marketplace.messages to authenticated;
grant select, insert, update, delete on table marketplace.messages to service_role;

-- RLS Policies: Participant-only
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
