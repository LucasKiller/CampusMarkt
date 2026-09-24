# Feature Context: 009-messaging

## 1. Problem Summary

While structured offers and reservations (Feature 008) provide clear financial and reservation commitments, in-person campus pickups require direct, granular coordination. Students need to ask specific questions before making an offer (e.g., textbook edition, bike frame size, condition flaws), clarify meeting details (e.g., "Meet in front of Mensa 1 at 12:30", "Waiting by the bike racks near the library entrance"), and communicate live arrival updates.

Without an integrated messaging system, users are forced to share personal phone numbers, WhatsApp links, or Instagram handles with strangers, eroding privacy and fracturing the marketplace experience.

Feature `009-messaging` establishes private, secure, real-time messaging between marketplace participants, strictly decoupled from transaction state machines while remaining contextually linked to the listing and active reservation.

---

## 2. Target Users & Pain Points

- **Student Buyers**:
  - *Pain*: Unwillingness to share private phone numbers or social media accounts with unverified strangers.
  - *Need*: In-app messaging directly tied to the item they are interested in or have reserved, with real-time delivery and notification of new messages.
- **Student Sellers**:
  - *Pain*: Scrambling between multiple chat apps while trying to remember which person is buying which textbook or household item.
  - *Need*: An organized conversation inbox grouped by listing, showing the other participant's verified status and reservation state at a glance.
- **Privacy & Safety**:
  - *Invariant*: Primary account emails and university verification emails must NEVER be exposed in message payloads or conversation metadata.
  - *Invariant*: In-app communication keeps user interactions auditable for upcoming reporting and blocking (Feature 011) and moderation (Feature 012).

---

## 3. Product Policies & Engineering Invariants

1. **Marketplace Invariants & Policy Boundaries (docs/product/01-domain-model.md, docs/product/03-marketplace-policy.md)**:
   - Private conversation is strictly between authorized marketplace participants (buyer and seller).
   - Conversations are strictly 1:1 per listing: unique per `(listing_id, buyer_id)`.
   - Users cannot start a conversation with themselves (`buyer_id <> seller_id`).
   - Text messages are used for questions and pickup coordination.
   - **Messages cannot substitute for structured offer or reservation state**; an informal agreement in chat has no mechanical effect on listing status or reservation exclusivity.
2. **Architectural & Realtime Boundary (AD-014)**:
   - Persisted in PostgreSQL (`marketplace.conversations` and `marketplace.messages`) with participant-only Row Level Security (`auth.uid() IN (buyer_id, seller_id)`).
   - Message insertion is authored exclusively through an authenticated REST API and PostgreSQL RPC (`marketplace_api.send_message`), ensuring strict input validation, rate limiting, and participant authorization.
   - Realtime delivery leverages Supabase Realtime channel subscriptions (`conversation:<id>`), backed by deterministic keyset cursor hydration (`GET /api/marketplace/conversations/[id]/messages?after=<id>`) upon reconnection or visibility recovery.
   - Unstructured chat records remain decoupled from structured offers and reservations. The UI renders unified read-only transaction milestone cards (offer submitted, counteroffer, reservation active) interleaved by timestamp without polluting message rows.
3. **Safety & Rate Limiting**:
   - Abuse control: Rate limit message creation to 30 messages per minute per user.
   - Content constraints: Non-empty text, trimmed, maximum length of 2,000 characters.

---

## 4. Upstream Dependencies

- `001-web-supabase-foundation`: Base Next.js App Router, Supabase client infrastructure, test harness.
- `002-identity-accounts`: User authentication session (`auth.uid()`), user public profiles.
- `003-university-verification`: Trust badge projection on conversation headers.
- `004-listing-creation-management`: `marketplace.listings` table and listing lifecycle states.
- `005-marketplace-feed-listing-details`: Listing details entry point for starting conversations.
- `008-purchase-intent-offers-reservations`: Offer and reservation states contextually displayed in conversation headers.

---

## 5. Downstream Dependents

- `010-pickup-completion`: Coordination leading directly to local handover confirmation or cancellation.
- `011-reporting-blocking`: Reporting abusive messages and blocking participants from sending further messages.
- `012-moderation`: Moderator review of reported conversation threads.
