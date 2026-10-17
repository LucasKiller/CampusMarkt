# Moderation workspace — design proposal

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

The user liked page 17 and agreed to retain moderation as a section of a broader Administration workspace. Public support/legal screens come first, then Administration entry and expanded listing/user/settings/permission designs. This does not grant blanket editing powers or authorize new application implementation. Private conversations remain excluded from the proposed admin workspace.

Created 2026-10-16 in native page **17 · Moderation workspace — direction A**. Static responsive-browser compositions pending visual review. No live reports were read, resolved or actioned. Sources: feature 012 spec/context/design/tasks; marketplace policy; AD017; the accepted direction and page-16 safety flow. Implementation permissions remain governed by approved feature tasks.

## Coverage

- Twelve mobile compositions: queue, listing case, removal justification, dismissal justification, account case, suspension justification, acknowledged removal, audit history, access denied, removed listing owner view, suspended-account view and empty queue.
- Seven desktop compositions: queue, listing case, account case, audit history, removal, dismissal and suspension justification.
- Two mobile overviews and an eight-state recovery/authorization board.

Desktop has a dedicated internal shell with Review queue, Audit log and Back to marketplace. It does not add staff navigation to ordinary users' marketplace screens. Mobile uses contextual headers and queue/audit tabs. Main exports: `17-queue-desktop.png`, `17-listing-desktop.png`, `17-audit-desktop.png`, `17-review-mobile-overview.png`, `17-account-mobile-overview.png`, `17-moderation-recovery.png`; individual states follow `17-STATE-mobile.png` or `17-STATE-desktop.png`.

## Review and decision contract

Queue order is oldest pending report first; cards/rows show target type/name, policy reason, reporter-supplied context and timestamp. Case view separates the reported allegation from target context and the operator's eventual determination. All sample allegations, account names, item names, decisions, times, report numbers #101–106 and moderator labels M-03/M-07 are fictional fixtures. They are not allegations about real users, server counts, actual short-ID formats or production audit records. Populated notes illustrate a post-review decision; do not automatically prefill them in the real form or treat a reporter's allegation alone as a confirmed violation.

Only the three existing actions are offered: dismiss report, remove listing or suspend account. Listing cases expose dismissal/removal; account cases expose dismissal/suspension. Every action needs a trimmed non-empty justification up to 1,000 characters. Actual fresh forms start blank with the final action disabled; screenshots show illustrative completed notes and matching counters. Cancel preserves the case without acting. There is no automatic scoring, AI classification, mass action, role management, warning threshold, timed suspension or restore button.

Removal atomically sets the listing to removed, cancels its active reservation and supersedes pending offers while actioning the report and recording the audit entry. Owner view is read-only with Removed by moderation and no edit/relist. This is separate from owner archiving or user blocking. Suspension restricts posting/messaging/offers/reservations, hides active listings through the approved removal/archive behavior, cancels active reservations and records the case decision. Do not silently promise payment refunds: integrated payments remain a separate proposed scope requiring reconciliation.

Dismissal removes the report from pending with an audit entry and leaves target state unchanged. Acknowledged outcomes are shown only after the atomic operation succeeds. Audit history is read-only, newest first, with action, target/report context, moderator reference, justification and timestamp. Authorized record details must resolve real action/target/moderator IDs; no reporter email, identity hash or token is projected. No audit edit/delete/export control is introduced.

## Authorization and privacy

Server/data-boundary checks require an active assignment, not a self-editable account label. Unauthenticated visits return through sign-in; authenticated non-moderators receive the restricted view. Revoked access clears protected content and disables further actions. Re-check permission after reauthentication and never replay a pending destructive action automatically. UI visibility alone is insufficient authorization.

The workspace excludes primary/institutional email, reporter contact details, hashes and tokens. Reporter text may contain private information and must remain confined to authorized review. Do not copy the text into ordinary telemetry or target-user messages. A report does not authorize unrestricted browsing of private conversations; any additional evidence projection needs its approved access boundary. Current case context is a compact summary; complete authorized target/evidence retrieval and navigation remain integration work.

Targets see generic removed/suspended state, never reporter identity, report text or internal notes. The prototype's “contact CampusMarkt support” is a copy/destination requirement to reconcile with the next help unit and an actual operator channel. No invented support email, promised response time or in-app appeals workflow was added. V1 appeals remain out of band per feature 012.

## Failure handling and review

Recovery board covers missing justification, a report resolved by another moderator, queue failure, an uncertain decision result, expired session, revoked/absent role, acknowledged dismissal and suspension. Cards contain handoff guidance as well as user-facing titles; their explanatory engineering wording is not final product error copy. Preserve draft notes on recoverable failure; refresh authoritative case/audit state before retrying uncertain actions. Never show an empty queue after a failed load or claim success before acknowledgement. Already-removed listing actions follow the existing idempotency contract; resolved-report conflicts need refresh rather than a second action.

Visually inspected desktop queue/listing/removal/audit and mobile queue/case/removal/suspension/restricted views, plus the recovery board. Remaining: full German, 320 px/tablet/long-content checks, keyboard/focus/announcements, textarea/mobile keyboard and sticky actions, actual authorized context/evidence links, audit-detail and pagination views, desktop owner/restriction/empty/outcome variants, all loading/error dialogs and independent end-to-end validation. No application source, test, commit, service or external mutation was involved. Next unit: help, policies and legal page layouts; final content review is separate from these visual proposals.
