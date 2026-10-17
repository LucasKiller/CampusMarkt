# Administration — scope and screen proposal

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Visual review update: the user explicitly liked and accepted this proposal and asked to continue. Retain the conditional entry, controlled editing, staff-access review and private-conversation exclusion. Acceptance does not turn proposed capabilities into approved implementation tasks; the behavioral/specification work listed below remains.

Created 2026-10-16 in native page **19 · Administration — scope proposal**. The user agreed to a separate administration workspace after the public support/legal screens, reusing moderation and excluding private conversations. This is the requested visual/scope proposal, pending review, not an implemented administrator role or an approved general-editing feature specification.

Existing product/domain constraints, AD017 and feature 012 continue to govern the current moderation capability. Existing identity, ownership, listing and transaction contracts remain authoritative. No application routes, database objects, role assignments, permissions, content publication or live records were changed.

## Drawn journeys

Three staff-only entry variants preserve account B: mobile account row, desktop account card and desktop profile-menu item. Fifteen desktop workspace compositions cover overview, listing directory, correction form and before/after review, user directory/public-profile record, settings, category/area-label editors, help-article draft editor, read-only legal pages, team, access-grant review, activity history and existing moderation queue within the administration shell. Eighteen mobile compositions cover those principal flows plus existing-account/role selection, activity detail, recent authentication and staff-access removal. Three mobile overviews and a ten-card permission/recovery board support review.

Main exports: `19-overview-desktop.png`, `19-entry-menu.png`, `19-entry-mobile-overview.png`, `19-correction-mobile-overview.png`, `19-access-mobile-overview.png`, `19-permissions-recovery.png`. Other exports follow `19-STATE-desktop.png`, `19-STATE-mobile.png` and `19-entry-STATE.png`.

All people, dates, changes, notes and short references (L-104, U-204 etc.) are fixtures. Short references illustrate a readable identifier; they do not authorize new stored reference columns or substitute for authoritative IDs. Page 19's chair has an intentional spelling-error fixture and active state; it is a different illustrative snapshot from page 17's reserved/removed moderation case. No actual owner content was changed. `lucas@example.com` appears only in the fictional current operator's reauthentication screen, never as target-user private data.

## Entry and permissions

| Actor | Proposed visible scope |
| --- | --- |
| Ordinary member | Existing account B; no administration entry or protected data |
| Moderator | Existing report review, dismissal/removal/suspension and moderation audit only |
| Administrator | Only explicitly granted listing/public-profile/configuration/activity sections |
| Staff-access manager | Separate explicit permission to review and change another existing account's staff access |

The full fixture is Lucas, Administrator with staff-access management granted. Administrator does not automatically mean every capability. Hide unavailable sections/actions and independently enforce access on every protected query/mutation. Do not grant access via editable public profiles, university badges or user-supplied metadata. Direct URLs, target selection and stale browser state receive the same permission checks.

A first privileged operator must be provisioned through a controlled internal process, never public registration or a self-promote button. The current application has a moderator-assignment boundary; expanded administrator capabilities, staff management and its bootstrap/recovery process require a new approved specification before coding. No secret-bearing internal configuration is exposed in the UI.

## Listings and users

The directory proposes search by public name/title/reference and status; implementation must use bounded, authorised projections, pagination and existing supported states. General corrections are separate from punitive moderation. The concrete listing example edits a title/description with mandatory justification, then reviews before/after. Ownership, price, listing type and transaction status are read-only in this first proposal. Do not change negotiated amounts, transfer ownership, accept an offer, mark pickup complete or silently alter a reservation through this editor. If additional fields are later allowed, define their invariants, conflict rules and actor permissions explicitly.

A reason is required (proposed maximum 1,000 trimmed characters), review precedes save, and the content change plus before/after/operator/time/reason record must succeed together. Existing records changed concurrently trigger reload/compare while preserving the draft. An uncertain result refreshes authoritative content and activity before retry. Do not overwrite a newer owner edit. Listing-level internal activity notes remain private; an owner-facing administrative change explanation requires a separately defined public-safe projection, not raw moderator notes or reporter identity. This owner history is a handoff requirement, not an already implemented notification system.

The user record permits only public-name correction and removal of an existing public avatar, with reason/review. The Maya fixture has initials/no actual photo, so its photo control is disabled as No public photo; enable removal only when a published photo exists. No credential/email editing, verification override, login-as-user, account impersonation or access to private conversations is present. No student-status inference or public reputation flag was added.

Restrictions route to the approved moderation case workflow; the general user record does not bypass feature 012's report/context/justification contract. Staff access removal is distinct from user suspension and retains ordinary marketplace access subject to independent account restrictions. General administrative profile editing and before/after audit are proposed new scope; they are not permissions inferred from the existing moderator role.

## Platform settings

Category and coarse pickup-area editors correct English/German display labels without changing identities, listing assignments, exact addresses or adding official meetup spots. The full category/area inventories, ordering and retired-item behavior still need design/spec reconciliation. Deleting/merging a used category/area is not a label edit and has no destructive shortcut here. Current physical-goods Sell/Give away/Wanted scope stays fixed; no future-type switches, payment-provider settings, credentials or secrets are introduced.

Help content has a draft editor and review-publication entry, not immediate blind publication. The shortened sample pickup article is a draft illustration, not a replacement of page 18's complete guide. Publishing needs its own explicit permission, version check, locale policy, before/after preview and acknowledged outcome. No rich HTML/script injection or live content save occurred. Existing legal pages are read-only previews here; changes require a separate authorised content/legal approval and publication process. The design does not certify or publish legal clauses.

## Staff and activity

Select an existing account, select a permitted role, add a reason, inspect the capabilities and confirm. Moderator review grants only the current moderation actions. Administrator and fine-grained grants need fully specified privilege sets before implementation; the radio option alone is not a complete authority contract. Staff-access management is not silently included in a general Administrator grant.

Sensitive staff changes require recent authentication and a fresh capability check. The illustrated email/password step reuses the existing identity approach; duration/rate-limit/session policy for this new action must be approved rather than copied blindly from account deletion. Authentication returns to review and never commits the grant automatically. Prevent self-elevation and removal of the last authorised access manager. Concurrent grants/revocations must enforce those invariants transactionally. Revoked sessions lose privileged access at the boundary; no indefinite permission caching.

Staff revoke confirmation states the impact and preserves the account and past audit. Activity is read-only and shows before/after, operator, target, time and justification. Moderation retains its existing immutable decision log; the new general activity history must define its own protected append-only/retention contract before implementation. No audit edit/delete/export or private-message search is included. Ordinary telemetry must not copy sensitive note bodies, credentials, emails or conversation content.

## Review and remaining work

Inspected native staff mobile/menu entry, desktop overview/edit/review/team/user/help editor and reused moderation queue, mobile staff selection/grant/help editor, entry/correction overviews and recovery board. Corrected fixture avatar-removal state and kept audit actor references consistent with granted privileges. Forty PNG exports and the native document are saved. This was static design work, with no app source/tests/commits, long-running process or external mutation.

Remaining: approved administrative feature/permission specification; full German, 320 px/tablet/long-content; category/area/content inventories; full Administrator permission editor and staff-access selection on desktop; full profile/category/area/publication review compositions; owner-facing change history; complete outcome/error/loading/empty/pagination/filter states; keyboard/dialog/focus behavior; denial/session/role-change end-to-end paths and independent validation. Recovery cards include design handoff guidance and are not final product error copy. Page 19 is reviewable but not a complete implementation or final validation of every state.

Next, after user review: consolidate the accepted screen inventory and prioritise missing states/locale/width/interaction work before coding. The administration expansion and page-12 payment proposal require their own approved behavioral contracts; visual approval alone does not authorize production infrastructure, privilege or payment changes.
