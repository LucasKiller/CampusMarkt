# Tasks: Feature 009-messaging

## Test Coverage Matrix

| Requirement | Acceptance Criteria | Test File | Test Type |
| --- | --- | --- | --- |
| MSG-01 | P1 Story 1: AC1, AC2, AC3, AC4, AC5 | `packages/domain/src/listings/messaging.test.ts`<br>`tests/integration/messaging/conversations-routes.test.ts`<br>`apps/web/tests/marketplace-messaging.spec.ts` | Unit / Integration / E2E |
| MSG-02 | P1 Story 2: AC1, AC2, AC3, AC4 | `packages/validation/src/listings/messaging.test.ts`<br>`apps/web/src/modules/messaging/application/messaging.test.ts`<br>`tests/integration/messaging/messages-routes.test.ts` | Unit / Integration |
| MSG-03 | P1 Story 3: AC1, AC2, AC3, AC4 | `apps/web/src/components/marketplace/messaging/message-list.test.tsx`<br>`tests/integration/messaging/messages-routes.test.ts`<br>`apps/web/tests/marketplace-messaging.spec.ts` | Component / Integration / E2E |
| MSG-04 | P1 Story 4: AC1, AC2, AC3, AC4 | `apps/web/src/app/messages/page.test.tsx`<br>`tests/integration/messaging/conversations-routes.test.ts`<br>`apps/web/tests/marketplace-messaging.spec.ts` | Component / Integration / E2E |
| MSG-05 | P1 Story 5: AC1, AC2, AC3 | `tests/architecture/messaging-boundary.test.ts`<br>`supabase/tests/marketplace-messaging-persistence.test.ts`<br>`apps/web/src/app/messages/[id]/page.test.tsx` | Architecture / Database / Component |

---

## Gate Check Commands

- **Quick gate**: `cmd.exe /c "npm run check"`
- **Database gate**: `cmd.exe /c "npm run check && npm run test:db"`
- **Integration gate**: `cmd.exe /c "npm run check && npm run test:integration"`
- **Full gate**: `cmd.exe /c "npm run check && npm run test:integration && npm run test:db"`

---

## Execution Plan

### Phase 1: Contracts and Domain Foundation
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Database Layer, RPCs and Persistence
```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Server Services and HTTP Routes
```text
T9 -> T10 -> T11 -> T12
```

### Phase 4: UI Components and User Journeys
```text
T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### Phase 1: Contracts and Domain Foundation

#### T1: Define conversation and message transport DTOs and type predicates
**What**: Define `ConversationDTO`, `MessageDTO`, request/response payloads, and type predicates.
**Where**: `packages/types/src/listings/messaging.ts`
**Depends on**: None
**Requirement**: MSG-01, MSG-02
**Done when**:
- [x] `ConversationDTO`, `MessageDTO`, and request interfaces defined.
- [x] Type predicates `isConversationDTO` and `isMessageDTO` implemented.
- [x] Re-exported from `packages/types/src/index.ts`.
- [x] Unit tests pass in `messaging.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): define conversation and message transport dtos`

#### T2: Implement message content and query validation schemas
**What**: Implement validation schemas for message content (1-2000 chars, trimmed) and cursor parameters.
**Where**: `packages/validation/src/listings/messaging.ts`
**Depends on**: T1
**Requirement**: MSG-02, MSG-03
**Done when**:
- [x] `validateSendMessageInput` checks trimmed content non-empty and $\le 2000$ characters.
- [x] `validateGetMessagesQuery` validates keyset cursor and limit bounds.
- [x] Re-exported from `packages/validation/src/index.ts`.
- [x] Unit tests pass in `messaging.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): implement message content validation schemas`

#### T3: Implement conversation domain invariants and helpers
**What**: Implement self-messaging prohibition (`assertCanMessage`), partner resolution, and milestone helpers.
**Where**: `packages/domain/src/listings/messaging.ts`
**Depends on**: T2
**Requirement**: MSG-01, MSG-05
**Done when**:
- [x] Invariant helper `assertCanMessage(buyerId, sellerId)` rejects self-messaging.
- [x] Timeline milestone helper formats read-only transaction events.
- [x] Re-exported from `packages/domain/src/index.ts`.
- [x] Unit tests pass in `messaging.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): implement conversation domain invariants and helpers`

#### T4: Add architectural boundary tests for messaging module
**What**: Add DDD boundary rules ensuring messages remain isolated from public catalog and cannot mutate transaction states.
**Where**: `tests/architecture/messaging-boundary.test.ts`
**Depends on**: T3
**Requirement**: MSG-01, MSG-05
**Done when**:
- [x] Boundaries enforce that private messages never leak into public catalog feeds.
- [x] Messaging code does not mutate offer or reservation tables directly.
- [x] All architectural boundary tests pass.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(messaging): add architectural boundary tests for messaging module`

---

### Phase 2: Database Layer, RPCs and Persistence

#### T5: Add conversations and messages tables migration
**What**: Create `marketplace.conversations` and `marketplace.messages` tables with 1:1 constraint and RLS.
**Where**: `supabase/migrations/20260924200000_marketplace_conversations_and_messages.sql`
**Depends on**: T4
**Requirement**: MSG-01, MSG-02, MSG-05
**Done when**:
- [ ] `marketplace.conversations` created with `unique (listing_id, buyer_id)` and `check (buyer_id <> seller_id)`.
- [ ] `marketplace.messages` created with cascade FKs and content length constraints.
- [ ] Participant-only RLS policies enabled for both tables.
**Tests**: db
**Gate**: Database
**Commit**: `feat(messaging): add conversations and messages tables migration`

#### T6: Implement get_or_create_conversation RPC
**What**: Implement `marketplace_api.get_or_create_conversation` with auth verification and self-messaging rejection.
**Where**: `supabase/migrations/20260924201000_marketplace_messaging_get_or_create_rpc.sql`
**Depends on**: T5
**Requirement**: MSG-01
**Done when**:
- [ ] Verifies active listing, checks `auth.uid()`, rejects self-messaging.
- [ ] Atomically retrieves or creates conversation record on conflict.
- [ ] Returns conversation DTO payload.
**Tests**: db
**Gate**: Database
**Commit**: `feat(messaging): implement get_or_create_conversation rpc`

#### T7: Implement send_message and mark_read RPCs
**What**: Implement `marketplace_api.send_message` and `marketplace_api.mark_conversation_read`.
**Where**: `supabase/migrations/20260924202000_marketplace_messaging_send_and_read_rpcs.sql`
**Depends on**: T6
**Requirement**: MSG-02, MSG-04
**Done when**:
- [ ] `marketplace_api.send_message` verifies participant access, inserts message, updates `last_message_at`.
- [ ] `marketplace_api.mark_conversation_read` marks unread messages with timestamp.
- [ ] `marketplace_api.get_user_conversations` returns inbox projection with unread counts.
**Tests**: db
**Gate**: Database
**Commit**: `feat(messaging): implement send_message and mark_read rpcs`

#### T8: Add database persistence and RLS tests
**What**: Add tests verifying schema constraints, 1:1 uniqueness, participant RLS, and message ordering.
**Where**: `supabase/tests/marketplace-messaging-persistence.test.ts`
**Depends on**: T7
**Requirement**: MSG-01, MSG-02, MSG-05
**Done when**:
- [ ] Verifies unique index prevents duplicate conversations for same buyer and listing.
- [ ] Proves non-participants cannot read or send messages.
- [ ] Verifies cascade deletion when listing is deleted.
- [ ] All database persistence tests pass.
**Tests**: db
**Gate**: Database
**Commit**: `test(messaging): add database persistence and rls tests`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplaceMessagingRepository
**What**: Implement repository adapter calling messaging RPCs and mapping typed DTOs.
**Where**: `apps/web/src/modules/messaging/server/messaging-repository.ts`
**Depends on**: T8
**Requirement**: MSG-01, MSG-02, MSG-03
**Done when**:
- [ ] `MarketplaceMessagingRepository` wraps RPC calls and queries.
- [ ] Maps database records to typed `ConversationDTO` and `MessageDTO`.
- [ ] Repository unit tests pass with mock Supabase client.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): implement marketplace messaging repository`

#### T10: Implement MarketplaceMessagingService
**What**: Implement application service coordinating validation, self-messaging prohibition, rate limiting (30/min), and telemetry.
**Where**: `apps/web/src/modules/messaging/application/messaging.ts`
**Depends on**: T9
**Requirement**: MSG-01, MSG-02
**Done when**:
- [ ] `MarketplaceMessagingService` coordinates conversation creation, message dispatch, and read receipts.
- [ ] Enforces 30 messages/min rate limit per user.
- [ ] Application service unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): implement marketplace messaging application service`

#### T11: Implement conversations list and creation API routes
**What**: Implement `GET /api/marketplace/conversations` and `POST /api/marketplace/conversations`.
**Where**: `apps/web/src/app/api/marketplace/conversations/route.ts`
**Depends on**: T10
**Requirement**: MSG-01, MSG-04
**Done when**:
- [ ] `GET /api/marketplace/conversations` returns user inbox list.
- [ ] `POST /api/marketplace/conversations` starts or retrieves conversation.
- [ ] Integration tests verify authentication, self-messaging rejection, and CSRF protection.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(messaging): implement conversations list and creation api routes`

#### T12: Implement messages sending and read API routes
**What**: Implement `GET /api/marketplace/conversations/[id]/messages`, `POST .../messages`, and `POST .../read`.
**Where**: `apps/web/src/app/api/marketplace/conversations/[id]/messages/route.ts`
**Depends on**: T11
**Requirement**: MSG-02, MSG-03, MSG-04
**Done when**:
- [ ] Keyset cursor retrieval supported for older and newer messages.
- [ ] Message posting enforces participant authorization and rate limits.
- [ ] Read receipt route updates unread status.
- [ ] Integration tests verify route handlers.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(messaging): implement messages sending and read api routes`

---

### Phase 4: UI Components and User Journeys

#### T13: Implement conversation message list and composer components
**What**: Implement accessible message bubbles, timestamps, sender distinction, and composer input.
**Where**: `apps/web/src/components/marketplace/messaging/message-list.tsx`
**Depends on**: T12
**Requirement**: MSG-02, MSG-03
**Done when**:
- [ ] Message bubbles render with distinct styling for current user vs partner.
- [ ] Composer input handles trimming, character count, and keyboard shortcuts (`Cmd+Enter`).
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): implement conversation message list and composer components`

#### T14: Implement conversation thread view with negotiation header
**What**: Implement `/messages/[id]` page displaying partner profile with trust badge and sticky negotiation status card.
**Where**: `apps/web/src/app/messages/[id]/page.tsx`
**Depends on**: T13
**Requirement**: MSG-03, MSG-05
**Done when**:
- [ ] Sticky header displays partner name, avatar, and university verification badge.
- [ ] Negotiation card shows active offer/reservation status with quick action buttons.
- [ ] Subscribes to Supabase Realtime channel for live message updates.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): implement conversation thread view with negotiation header`

#### T15: Implement inbox page and listing details CTA integration
**What**: Implement `/messages` inbox page and embed "Nachricht schreiben" button on `/listings/[id]`.
**Where**: `apps/web/src/app/messages/page.tsx`
**Depends on**: T14
**Requirement**: MSG-01, MSG-04
**Done when**:
- [ ] Inbox displays active conversations with latest message snippet, timestamp, and unread pill.
- [ ] Empty state renders with browse link when no conversations exist.
- [ ] "Nachricht schreiben" CTA button integrated into listing details page.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(messaging): implement inbox page and listing details cta integration`

#### T16: Prove end-to-end messaging journeys and add runbook
**What**: Implement Playwright E2E journeys covering chat initiation, live messaging, read receipts, and add operational runbook.
**Where**: `apps/web/tests/marketplace-messaging.spec.ts`
**Depends on**: T15
**Requirement**: MSG-01, MSG-02, MSG-03, MSG-04, MSG-05
**Done when**:
- [ ] Playwright E2E tests prove:
  - Buyer clicks "Nachricht schreiben" from listing and initiates conversation.
  - Messages sent by buyer and seller are delivered and displayed.
  - Inbox reflects unread count and latest message snippet.
  - Self-messaging is prohibited.
  - Negotiation card in chat displays active offer/reservation status.
- [ ] Operational runbook added to `docs/operations/marketplace/messaging.md`.
- [ ] All tests pass.
**Tests**: e2e
**Gate**: Full
**Commit**: `test(messaging): prove end to end messaging journeys and add runbook`
