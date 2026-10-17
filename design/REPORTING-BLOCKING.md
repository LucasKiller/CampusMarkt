# Reporting and blocking — screen proposal

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Review update: the user liked page 16 and confirmed that blocking disables sending for both participants rather than silently discarding messages. Retain the blocker's specific notice and the other participant's generic unavailable notice, without announcing who blocked them. The earlier conversation history remains in the participant example; actual retention/access must follow the existing messaging contract. The user then asked to continue to moderation.

Created 2026-10-16 in native page **16 · Reporting & blocking — direction A**. Static responsive-web proposal pending user review, not implementation. Sources: `docs/product/03-marketplace-policy.md`, active AD016, and feature 011's spec/context/design/tasks. Feature 011's header says Draft while traceability records verified requirements; the visual work does not resolve that delivery-status inconsistency or authorize application changes.

## Coverage

Ten 390 × 844 mobile compositions: listing reason selection, listing report details, account report details, receipt, block confirmation, acknowledged blocked outcome, blocked-account management, unblock confirmation and empty state, plus historical conversation with disabled composer. Five 1440 × 1080 desktop compositions: reason selection, report details, receipt modal, block modal and account block management. Two three-screen mobile overviews and a ten-state entry/recovery board complete this unit.

Entry mapping: listing's existing Report listing action opens the reason flow; public-profile Report profile and conversation menu Report account open the same flow with an account target. Conversation/profile Block opens explicit block confirmation. The accepted account B's Blocked accounts row opens management. The account report fixture uses Harassment or abuse; other reasons remain available through Change. Self-owned targets never expose report/block entry. These are design handoffs, not wired links.

Main exports: `16-report-mobile-overview.png`, `16-block-mobile-overview.png`, `16-report-desktop.png`, `16-reasons-desktop.png`, `16-manage-desktop.png`, `16-safety-recovery.png`. Individual mobile and desktop states follow `16-STATE-mobile.png` and `16-STATE-desktop.png`.

## Reporting contract

Require authentication, preserve the target on sign-in return and do not submit automatically. The selected reason is required; details are optional, trimmed and limited to 1,000 characters. No attachment/upload capability was added. Reason labels map exactly to the existing six values: prohibited/unsafe item → `prohibited_content`; fraud/scam → `fraud_or_scam`; harassment/abuse → `harassment_or_abuse`; unsupported → `unsupported_content`; privacy/impersonation → `privacy_violation`; something else → `other`.

The selected-radio states are illustrative; new forms start unselected with Continue disabled until a reason is chosen. The example textarea is blank with placeholder text and a 0/1,000 counter. Change preserves optional context. Receipt appears only after server acknowledgement. Reporting does not automatically remove content, penalize or block an account. Target users receive no reporter identity or report visibility; do not put reporter email or institutional data in receipts. Do not promise a review deadline or invent a case number/status history without an approved projection.

Recovery covers missing reason, already-pending report, unavailable/deleted target, request failure preserving input, authentication and rate limit. Duplicates do not create a second receipt. Feature 011 inconsistently names duplicate errors `REPORT_ALREADY_EXISTS` and `REPORT_ALREADY_PENDING`; reconcile actual endpoint code before wiring, while preserving the same user-facing result. Server rate limiting is 10 report/block creations per minute; render server retry timing only when supplied. Never claim success on an uncertain result.

## Blocking contract

Blocking is an explicit separate choice, available before or after reporting. It prevents messaging and new purchase-intent, offer and reservation interactions, excludes mutual listings from authenticated feed/search and makes blocked listing details unavailable. It sends no block notification. Public guest browsing remains public; UI must not promise that blocking prevents access outside a signed-in account. Do not expose who blocked the viewer in generic thread errors.

The blocker's thread says “You blocked Maya”; the other participant gets generic messaging-unavailable copy and a disabled composer. Retained chat bubbles are illustrative existing participant history, not a newly promised data-retention policy. No new message-scoped report API was introduced: reporting a conversation participant remains an account report. Reconcile authorized moderation context/evidence under feature 012; no blanket private-message access is implied.

Blocking does not itself cancel or complete an existing pickup and does not submit a report. Actual existing-reservation/support transitions, especially proposed future paid cases, need explicit reconciliation before integration; don't silently invent automatic cancellation/refunds. Blocking cannot be a self-action. Repeated creation is idempotent; apply state only after acknowledgement.

Management shows only accounts the owner blocked, public name/avatar and private blocked date. Fictional Lucas (header L) is the viewer; Maya and Alex are fictional targets. No real accounts were reported or blocked. Unblock confirmation removes only the viewer's block, leaves reports unchanged and does not promise renewed interaction if a reciprocal block or other restriction remains. Acknowledged unblock, failed block changes and empty state are included. A failed/uncertain mutation must refresh actual status rather than presume success.

## Review and remaining work

Visually inspected report reason/detail/receipt, mobile and desktop block, desktop management and reason selection, mobile overview and disabled thread. Red denotes block confirmation; reporting stays a neutral teal action. Language controls retain shared EN/DE; no university badge, warning score or punitive status is attached to reported users.

Remaining: full German, 320 px/tablet, long names, keyboard-visible form states, textarea/mobile keyboard and sticky-action scroll, loading/unsaved/error compositions, desktop account-report/unblock/empty variants, actual entry menus and end-to-end link/focus behavior. Accessible implementation needs a labelled radio group, live validation/status, modal focus/return and disabled-composer semantics. Independent final validation remains outstanding. No app code, tests, commits, services or external mutations were involved. Next design unit: authorized moderation, then help/policy/legal layouts.
