# Inbox Repair

**Status:** Approved by the operator's 2026-10-04 request.

## Problem

Messaging RPCs use `auth.uid()`, while the web messaging service currently calls them with a service-role client that has no user session. The inbox suppresses loading errors as an empty state, and the thread reads the oldest page of messages, omits older-message controls, and polls only after an existing message. Messaging screens also predate the approved visual direction and English default.

## Scope

Repair the existing 1:1, text-only messaging journey. Use the request's verified user token for all messaging RPCs and table reads; keep participant checks and RLS. Render the inbox and thread with the approved `DESIGN.md` tokens and active language. Do not add chat attachments, notifications, new negotiation states, or deployment.

## Acceptance criteria

### INBOX-01: Authenticated data boundary

1. WHEN a verified participant opens the inbox or a thread, starts a conversation, sends a message, or marks one read, THEN the database request SHALL carry that participant's token so `auth.uid()` and RLS apply.
2. WHEN the token is absent or the requester is not a participant, THEN private conversation data SHALL not be returned.
3. WHEN the listing owner views their own listing, THEN the message entry point SHALL be hidden even when their public profile ID differs from their auth ID.

### INBOX-02: Reliable conversation history

1. WHEN a thread opens, THEN it SHALL show the most recent 50 messages in chronological order.
2. WHEN older messages exist, THEN a user SHALL be able to load them without duplicate entries.
3. WHEN new messages arrive or the tab regains focus, THEN the thread SHALL reconcile every available page without duplicate entries, including when the initial thread has no messages.
4. WHEN a send fails, THEN the draft SHALL remain and a visible error SHALL allow retry.
5. WHEN the recipient reads a sent message in the latest 50-message page while the thread remains open, THEN its read receipt SHALL update. A failed mark-read request SHALL be retried on the next reconciliation.

### INBOX-03: Inbox truthfulness and design

1. WHEN inbox loading fails, THEN the page SHALL show a recoverable error rather than an empty-conversation claim.
2. WHEN conversations exist, THEN the list SHALL be ordered by latest message and show partner, listing, latest snippet, time, and unread count.
3. WHEN inbox or thread renders, THEN it SHALL follow `DESIGN.md` colors, spacing, surfaces, responsive layout, and active English/German language.

## Requirement traceability

| Requirement | Test evidence | Status |
| --- | --- | --- |
| INBOX-01 | Token-client boundary, route, and listing owner tests | Pass in local validation; SQL execution pending |
| INBOX-02 | Repository pagination, rate-limit mapping, thread tests, browser catch-up and read-receipt tests | Pass in local validation; SQL execution pending |
| INBOX-03 | Inbox rendering, failure-state, language, and responsive browser tests | Pass in local validation |
