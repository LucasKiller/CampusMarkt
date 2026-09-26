# Messaging Specification

**Status:** Verified

## Problem Statement

Marketplace buyers and sellers need a direct, private, in-app messaging channel to coordinate item details and in-person pickups on campus without having to share personal phone numbers or external social media handles with strangers. Chat messages must be reliable and delivered in real time, while strictly maintaining separation from structured financial proposals and reservation states (Feature 008). Conversations must be scoped 1:1 per listing-buyer pair, protected by PostgreSQL Row Level Security, and safeguarded against spam, self-messaging, and private identity leaks.

## Goals

- [x] Support 1:1 private conversations scoped uniquely to each `(listing_id, buyer_id)` pair.
- [x] Prevent self-messaging: users cannot initiate a conversation on their own listings (`buyer_id <> seller_id`).
- [x] Persist text messages in PostgreSQL with participant-only Row Level Security (`auth.uid() IN (buyer_id, seller_id)`).
- [x] Implement atomic message insertion via `marketplace_api.send_message` with validation and rate limiting (max 30 messages/min).
- [x] Support real-time message delivery over Supabase Realtime channel subscriptions with graceful fallback and keyset pagination.
- [x] Provide an organized inbox view (`/messages`) displaying active conversations, latest message snippets, unread indicators, and partner trust badges.
- [x] Track message read state and provide `marketplace_api.mark_conversation_read` to update read timestamps.
- [x] Display contextual transaction milestones (offers, counteroffers, active reservations) within the conversation timeline as read-only event indicators without polluting chat tables.
- [x] Strictly protect user privacy by never exposing primary or institutional email addresses or internal auth hashes.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Media / image attachments in chat | V1 messaging is text-only for questions and pickup coordination. Media is handled on listings (Feature 004). |
| Voice or video calling | V1 focuses on asynchronous and synchronous text coordination. |
| User blocking and message reporting | Owned by downstream Feature `011-reporting-blocking`. |
| Automated time-based message deletion | Handled in future retention/compliance policies. |
| Group chats or multi-buyer threads | Marketplace conversations are strictly 1:1 between one prospective buyer and the seller. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Transport & real-time delivery | PostgreSQL schema + Supabase Realtime channel subscription + Next.js REST API / RPC | Unanimous Jury decision (AD-014): zero extra daemons on VPS (AD-006), database-level RLS security, and deterministic keyset hydration on reconnect. | yes |
| Conversation scope | Strictly 1:1 per `(listing_id, buyer_id)` | Prevents duplicate fragmented threads between the same buyer and seller for the same item. | yes |
| Message size bounds | 1 to 2,000 characters, trimmed | Accommodates detailed directions (e.g. campus building instructions) while preventing payload bloat. | yes |
| Rate limiting | Max 30 messages per minute per user | Protects database connections and prevents harassment or bot spam. | yes |
| Structured transaction separation | Chat messages and offers/reservations live in separate tables; UI interleaves read-only milestones | Invariant: Chat text cannot substitute for structured offer or reservation state. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Message content must be trimmed, non-empty, and at most 2,000 characters; conversation ID must be a valid UUID. |
| Failure / partial-failure states | If Supabase Realtime disconnects or drops, the client automatically falls back to keyset reconciliation on window focus/reconnect without losing unsent drafts. |
| Idempotency / retry handling | Client assigns a temporary client message ID during optimistic rendering; duplicates within 2 seconds with identical payload are deduplicated. |
| Auth boundaries & rate limits | Guest access is rejected with HTTP 401; non-participants attempting access receive HTTP 403 `FORBIDDEN`; rate limits enforced at 30 req/min. |
| Concurrency / ordering | Messages ordered deterministically by `(created_at ASC, id ASC)`. Conversations ordered in inbox by `last_message_at DESC`. |
| Data lifecycle & cascades | Deleting a listing cascades to its conversations and messages (`ON DELETE CASCADE`); participant account deletion cascades safely. |
| Observability | Telemetry records `message.sent`, `conversation.created`, and `conversation.read` events without logging message body content. |
| Privacy boundary | Private emails, phone numbers, and identity hashes are never returned in conversation or message DTOs; only public display names and university badges are projected. |

---

## User Stories

### P1: 1:1 Conversation Scoping and Initialization ⭐ MVP

As an authenticated buyer interested in an item,  
I want to initiate a private conversation with the seller from the listing page,  
So that I can ask specific questions and coordinate meetup logistics privately.

#### Acceptance Criteria

- **WHEN** an authenticated buyer clicks "Nachricht schreiben" on an active listing,  
  **THEN** the system finds or creates the unique conversation record for `(listing_id, buyer_id)` and returns HTTP 200/201 with the conversation details.
- **WHEN** a user attempts to initiate a conversation on their own listing (`buyer_id = seller_id`),  
  **THEN** the system rejects the request with HTTP 403 and error code `CANNOT_MESSAGE_OWN_LISTING`.
- **WHEN** an unauthenticated visitor clicks "Nachricht schreiben",  
  **THEN** the application redirects them to `/login?next=/listings/[id]`.
- **WHEN** a buyer opens an existing conversation on a listing where a thread already exists,  
  **THEN** the system returns the existing conversation without creating duplicate records.
- **WHEN** conversation metadata is queried,  
  **THEN** the response includes only public participant profiles (display name, avatar, university trust badge) and completely excludes primary and verification emails.

---

### P1: Message Sending, Validation, and Rate Limiting ⭐ MVP

As an authorized conversation participant,  
I want to send text messages within the conversation,  
So that I can communicate directly with the buyer or seller.

#### Acceptance Criteria

- **WHEN** an authorized participant submits a non-empty text message between 1 and 2,000 characters,  
  **THEN** the message is persisted in `marketplace.messages` with status `sent` and timestamp `created_at`, updating the parent conversation's `last_message_at`.
- **WHEN** a user submits an empty message, whitespace-only message, or message exceeding 2,000 characters,  
  **THEN** the request is rejected with HTTP 400 and code `INVALID_INPUT` with field error details.
- **WHEN** a user who is neither the buyer nor the seller attempts to post a message to the conversation,  
  **THEN** the request is rejected with HTTP 403 `FORBIDDEN`.
- **WHEN** a user exceeds the rate limit of 30 messages per minute,  
  **THEN** the request is rejected with HTTP 429 `RATE_LIMITED` and a `Retry-After` header.

---

### P1: Realtime Delivery and Message History Keyset Pagination ⭐ MVP

As an active conversation participant,  
I want new messages to appear immediately in real time and load historical messages reliably,  
So that the conversation feels responsive and smooth.

#### Acceptance Criteria

- **WHEN** a participant sends a message,  
  **THEN** the message is broadcast across the Supabase Realtime channel for that conversation and received by the other participant within 1 second.
- **WHEN** a participant opens a conversation thread,  
  **THEN** the system fetches the most recent messages (up to 50) ordered chronologically `(created_at ASC, id ASC)`.
- **WHEN** older messages exist in the conversation,  
  **THEN** the client can fetch earlier messages using keyset cursor pagination (`before=<timestamp>`) without duplicates or omissions.
- **WHEN** a client reconnects after network disruption or tab backgrounding,  
  **THEN** the client queries for messages created since its latest received message (`after=<timestamp>`) and reconciles the local message list seamlessly.

---

### P1: Conversation Inbox and Read State Tracking ⭐ MVP

As an active marketplace user,  
I want a centralized inbox showing all my ongoing buyer and seller conversations,  
So that I can easily track unread messages and stay on top of my campus transactions.

#### Acceptance Criteria

- **WHEN** an authenticated user navigates to `/messages`,  
  **THEN** the inbox displays all conversations where `auth.uid() IN (buyer_id, seller_id)`, sorted by `last_message_at DESC`.
- **WHEN** displaying a conversation card in the inbox,  
  **THEN** it shows the listing title, listing price/type, partner display name with university trust badge, last message snippet, timestamp, and unread indicator.
- **WHEN** an authorized user opens an active conversation with unread incoming messages,  
  **THEN** the system marks the messages as read and updates the unread badge count accordingly.
- **WHEN** a user has no active conversations,  
  **THEN** the inbox renders an accessible empty state with a call-to-action to browse the marketplace feed.

---

### P1: Negotiation Context Integration and Public Boundary Protection ⭐ MVP

As a buyer or seller coordinating an exchange,  
I want to see the current offer or reservation status directly in my conversation view,  
So that I know the agreed price and reservation status without having messages replace formal actions.

#### Acceptance Criteria

- **WHEN** a conversation is viewed for a listing with an active offer or reservation,  
  **THEN** a sticky contextual status card renders at the top of the chat showing the current state (e.g. "Angebot ausstehend: €20", "Reserviert für Abholung: €25") with action buttons matching Feature 008.
- **WHEN** an offer is created, countered, or accepted,  
  **THEN** a read-only event milestone pill appears in the chat timeline without inserting synthetic mutable user messages into `marketplace.messages`.
- **WHEN** inspecting database grants and RLS policies on `marketplace.conversations` and `marketplace.messages`,  
  **THEN** anonymous access is completely denied, and authenticated users can only view and mutate rows where they are the explicit `buyer_id` or `seller_id`.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| MSG-01 | 1:1 conversation scoping, initialization, and self-message prohibition | P1 Story 1: AC1, AC2, AC3, AC4, AC5 | Database RPC / API | verified |
| MSG-02 | Message sending, content validation, participant authorization, rate limit | P1 Story 2: AC1, AC2, AC3, AC4 | Database RPC / API | verified |
| MSG-03 | Realtime channel delivery, keyset message pagination, and reconnect reconciliation | P1 Story 3: AC1, AC2, AC3, AC4 | Realtime / API / Transport | verified |
| MSG-04 | Centralized inbox view (`/messages`), unread count tracking, and read receipts | P1 Story 4: AC1, AC2, AC3, AC4 | UI Pages / Application | verified |
| MSG-05 | Negotiation status card integration, milestone pills, and participant-only RLS boundary | P1 Story 5: AC1, AC2, AC3 | Security / RLS / UI | verified |
