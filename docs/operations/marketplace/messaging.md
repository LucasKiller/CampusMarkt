# Marketplace Private Messaging Operations Runbook

This runbook defines operational guidance, system boundaries, security constraints, telemetry, and incident response procedures for Feature 009: Private Messaging ("1:1 Marktplatz-Nachrichten").

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 009 implements private 1:1 listing-scoped conversations and message dispatch for CampusMarkt V1:
- **Storage Model**:
  - `marketplace.conversations`: Listing-scoped 1:1 threads between buyer and seller (`UNIQUE (listing_id, buyer_id)`).
  - `marketplace.messages`: Immutable text messages (1-2000 characters) belonging to a conversation.
- **Participant Access & Row-Level Security (AD-014)**:
  - Enforced via PostgreSQL RLS policies on `marketplace.conversations` and `marketplace.messages`.
  - Non-participants cannot view conversations, read messages, or post into another user's thread.
- **Self-Messaging Prohibition**:
  - Enforced via database constraint `CHECK (buyer_id <> seller_id)`, RPC validation, and application service logic. Users cannot message themselves on their own listings.
- **Privacy Boundary**:
  - Primary and university emails are excluded from all messaging projections, API routes, and realtime payloads.
  - Profiles only reveal `displayName`, avatar URL, and verified `universityBadge`.
- **Rate Limiting**:
  - Enforces a maximum of 30 messages per minute per user.
- **Realtime & Reconciliation**:
  - Keyset cursor pagination (`before`, `after`, `limit`) enables reliable gap recovery upon reconnection or window focus.

---

## Preflight and Configuration Validation

Before deploying updates in production:

1. **Database Schema & Constraints**:
   - Verify `marketplace.conversations` and `marketplace.messages` exist with `ON DELETE CASCADE`.
   - Verify unique constraint `(listing_id, buyer_id)` and check constraint `(buyer_id <> seller_id)`.
2. **RPC Function Grants**:
   - Ensure the following RPC functions have execute grants to `authenticated` and `service_role`:
     - `marketplace_api.get_or_create_conversation`
     - `marketplace_api.send_message`
     - `marketplace_api.mark_conversation_read`
     - `marketplace_api.get_user_conversations`
3. **Row-Level Security (RLS)**:
   - Ensure RLS is enabled and verified on `marketplace.conversations` and `marketplace.messages`.

---

## Operational Verification

To verify that the messaging repository, application service, API routes, and unit tests pass:

```console
$ npm run check
$ npm run test:integration
```

---

## Incident Response & Recovery

### 1. Excessive Messaging / Rate Limiting (HTTP 429)
- **Symptom**: User receives HTTP 429 with `Retry-After: 60`.
- **Cause**: User exceeded 30 messages per minute.
- **Action**: Check telemetry for automated script loops. The rate limit resets automatically after the window expires.

### 2. Self-Messaging Attempt (HTTP 403)
- **Symptom**: Client receives HTTP 403 `FORBIDDEN` when attempting to start a conversation.
- **Cause**: User attempted to message their own listing.
- **Action**: Expected behavior under AD-014 invariants. The UI prevents rendering the "Nachricht schreiben" CTA to sellers on their own listings.

### 3. Read Receipts Inconsistency
- **Symptom**: User sees unread badge count despite opening the thread.
- **Cause**: Browser did not post read receipt on thread load.
- **Action**: The thread automatically calls `POST /api/marketplace/conversations/[id]/read` on mount. Keyset pagination on reload reconciles unread messages.
