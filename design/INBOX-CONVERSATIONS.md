# Inbox and conversations — direction A

Status: static proposal pending visual review. Editable source: page **09 · Inbox & conversations — direction A** in `CampusMarkt-Redesign.figcraft`. No private conversations were accessed or changed, and no application code changed.

## Included screens

- Mobile inbox with listing thumbnails, partner identity, latest snippet/time and unread counts.
- Desktop inbox before selection and the two-pane desktop conversation workspace.
- Mobile Sell chat with a pending offer and a separate reserved variant.
- Mobile Wanted conversation with an optional-photo placeholder and no monetary negotiation controls.
- New conversation without invented history; empty inbox on desktop/mobile; recoverable mobile inbox failure.
- German chat interface retaining the author's original listing, draft and message text.
- Recovery/state board: sending/sent/read, preserved failed-send draft, retry, older-message failure, refresh failure, unavailable private conversation and sending-limit feedback.
- Mobile overview: inbox, pending-offer conversation and reserved conversation.

## Interaction contract

Page 10 adds structured counteroffers and the user's latest chat direction: free-form text without quick replies, with a blocked-send correction for external contact sharing. A separate reviewed account-warning screen is proposed for confirmed recurrence. Enforcement details need an approved feature spec; no contact blocking or account moderation was implemented. See `COUNTEROFFERS-CHAT-GUIDANCE.md`.

Desktop preserves the accepted member navigation and places the conversation list next to the selected thread. Mobile inbox keeps the five-destination dock with Messages active. The thread replaces that dock with one composer above the safe area/keyboard. A compact header provides back-to-inbox, public partner/profile entry and shared EN/DE selector. The listing summary remains visible at the top and links to its detail.

Conversations are 1:1 and listing-scoped. Sort by latest message; show only public partner identity. Lena is the sample record with a current optional TU-email badge; Alex has no verification badge. No email address or identity guarantee is exposed. The unread mobile/desktop landing fixture has two unread conversations (Alex: two messages, Lena: one). In the open desktop fixture, Alex's incoming messages have been read, leaving Lena unread and one unread conversation in the global header. These are separate snapshots, not live account data.

Text messages are 1–2,000 trimmed characters. The populated draft contains 34 characters; the Wanted draft contains 33. Empty/invalid and sending states disable repeated submission. A failed send retains the exact draft with retry. Sent requires server acknowledgement; Read requires recorded recipient read state. No online presence, typing indicator, delivery guarantee, attachments, camera, audio or calling UI is introduced. Listing photo upload remains a separate flow.

The pending-offer card shows €20 against the listing's €25 asking price. The reserved variant shows the accepted €20 agreement and a View reservation route. These are read-only status/milestone representations with entry points to the existing structured negotiation/reservation flow. Ordinary message text does not accept an offer, reserve an item or complete pickup. Accept/decline/counter/cancel/complete compositions belong to the next screen unit. Wanted keeps contact and listing context without a fabricated offer/reservation.

Load older messages represents keyset history navigation. Preserve scroll position when prepending history and show a contextual retry on failure. On refresh failure, retain currently loaded messages and the draft. A failed inbox fetch is an error state, never a claim that there are no conversations. A non-participant receives no partner, listing or history data in the unavailable-conversation surface. Rate-limit feedback preserves the draft and uses the server's actual retry eligibility rather than a fixed fake countdown.

EN/DE changes interface labels and currency formatting while preserving authored content. The control shares the site's chosen preference and must preserve the draft during switching. Profile/listing/status cards need full-size interactive hit regions even where their visible link text is smaller. Send and history actions have 44 px targets. Announcements, focus handling and keyboard submission must follow the existing messaging contract.

## Existing sources

- Feature 009 spec/context/design: private listing-scoped text, 2,000 characters, read state, history and read-only milestones. The spec/025 refinement governs separation from structured actions where the older design prose is inconsistent.
- Feature 025 spec/context/design/tasks and current route projection: truthful inbox errors, latest 50-message history, older/newer reconciliation, preserved failed drafts and latest-page read receipts. Its four-second reconciliation is the current implementation baseline; this static redesign does not implement or promise sub-second Realtime transport.
- Feature 008: offer/reservation semantics; Feature 011: confidential reporting/blocking boundaries, whose detailed safety screens remain a later unit.
- `DESIGN.md`, `.specs/STATE.md`, the approved page-08 direction and the shared EN/DE navigation refinements.

## Visual QA and handoff limits

Rendered and inspected inbox, desktop thread/landing, Sell/Wanted/new/German mobile chats, the reserved overview, empty/error and recovery states. Checked text wrapping and composer bounds; corrected draft counters and unread-count snapshots. Reused the same fictional chair/bike assets and public-initial avatars; message text, names, timestamps, badges and transaction events are prototype fixtures.

Native source and `09-` PNG exports are saved. These are static editable designs; messaging, translation, read tracking, scrolling, sending and negotiation are not newly implemented by this artifact. No software test suite was run for this design-only work.

Remaining for final handoff: 320 px/tablet and full German journey checks, software-keyboard/IME/safe-area layouts, long messages/URLs and multiline composer growth, actual pointer/keyboard/focus and screen-reader behavior, precise scroll anchoring/new-message behavior, verified/unverified header variants, guest/session-expiry and confidential block/report flows, integration of approved negotiation actions and independent final design validation.

Next unit: structured offers, reservations and pickup coordination/completion.
