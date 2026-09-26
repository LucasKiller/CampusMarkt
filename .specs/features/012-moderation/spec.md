# Moderation Specification

**Status:** Implemented

## Problem Statement

When users report policy-violating listings or malicious accounts, marketplace operators need a secure, auditable, and least-privilege moderation console to review pending reports, inspect target context, and execute enforcement actions. Without structured moderation tooling, operators risk unauthorized privilege escalation, fragmented enforcement, uncoordinated takedowns, and a lack of durable audit evidence required by European consumer and platform safety policies.

## Goals

- [x] Enforce least-privilege Role-Based Access Control (RBAC) via `marketplace.moderator_assignments` (AD-017).
- [x] Prevent self-elevation: ordinary users cannot assign themselves the moderator role through user metadata or client tokens.
- [x] Provide a secure review queue for triage of pending reports submitted via Feature 011.
- [x] Support auditable report dismissal (`dismiss_report`) with mandatory justification note.
- [x] Support listing removal (`remove_listing`) setting listing status to `removed` (Marketplace Invariant 9) and atomically cancelling any active reservation.
- [x] Support bad-actor account suspension (`suspend_user`), rejecting subsequent actions by that user.
- [x] Record all moderation actions in an immutable, append-only audit trail (`marketplace.moderation_actions`) with zero `UPDATE` or `DELETE` grants.
- [x] Exclude private email addresses and internal identity hashes from moderation projections.
- [x] Provide an accessible moderation workspace (`/moderation`) with review queue and audit log tabs.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Automated AI / machine-learning content classification | Deferred beyond V1; V1 relies on structured human moderator review. |
| In-app user appeal workflow | Appeals are handled out-of-band via operator support in V1. |
| Public moderation logs or community flagging scores | Internal moderation records are private to authorized operators. |
| Automated mass-account ban waves | Actions are executed per report with individual moderator justification. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| RBAC model | Dedicated `marketplace.moderator_assignments` table | Unanimous Jury decision (AD-017): strictly isolated from user-editable profile tables; engine-level protection. | yes |
| Audit immutability | PostgreSQL engine-level `REVOKE UPDATE, DELETE` | Guarantees non-repudiation and compliance without requiring external log aggregation daemons on budget VPS. | yes |
| Listing removal outcome | Listing status transitions to `removed` (Invariant 9) | Distinguishes moderator takedown from owner archiving (`archived`); permanently blocks discovery. | yes |
| Reservation cascade | Active reservation cancelled with reason `moderation_removal` | Frees buyer from obligation to meet or pay for a policy-violating item. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Moderator reason / note must be non-empty, trimmed, and $\le 1000$ characters; reportId, targetId, and moderatorId must be valid UUIDs. |
| Failure / partial-failure states | Attempting an action on an already-resolved report returns HTTP 409 `REPORT_ALREADY_RESOLVED`. |
| Idempotency / retry handling | Attempting to remove an already-removed listing returns HTTP 200 with the existing removed status. |
| Auth boundaries & rate limits | Only users present in `marketplace.moderator_assignments` where `revoked_at IS NULL` can access `/moderation` or call moderation RPCs; others receive HTTP 403 `FORBIDDEN`. |
| Concurrency / ordering | Transactional row-level locking on listing and report rows ensures atomic state cascades and eliminates race conditions. |
| Data lifecycle & cascades | Deleted user accounts preserve moderator audit logs with `ON DELETE RESTRICT` or historical user snapshot; audit logs are never deleted. |
| Observability | Structured telemetry logs for `moderation.report.dismissed`, `moderation.listing.removed`, `moderation.user.suspended` without PII. |
| Privacy boundary | Target user never receives notification of reporter identity; reporter email is not exposed to the moderator unless necessary for safety escalation. |

---

## User Stories

### P1: Least-Privilege Moderator RBAC and Authorization ⭐ MVP

As a platform operator,  
I want moderator permissions to be governed by a secure, non-self-assignable role,  
So that ordinary users and attackers cannot access privileged moderation tooling.

#### Acceptance Criteria

- **WHEN** an authenticated user who is assigned an active role in `marketplace.moderator_assignments` requests the moderation queue or invokes moderation RPCs,  
  **THEN** the system grants access and allows execution of privileged operations.
- **WHEN** an authenticated user who is NOT an active moderator attempts to access `/moderation` or invoke any moderation endpoint,  
  **THEN** the request is rejected with HTTP 403 `FORBIDDEN`.
- **WHEN** an unauthenticated visitor attempts to access `/moderation`,  
  **THEN** the system redirects them to `/login?next=/moderation`.
- **WHEN** inspecting database permissions,  
  **THEN** ordinary users have zero write or update access to `marketplace.moderator_assignments`.

---

### P1: Moderation Queue and Report Triage ⭐ MVP

As an authorized community moderator,  
I want to view a centralized queue of pending reports with target context,  
So that I can investigate and triage community safety complaints.

#### Acceptance Criteria

- **WHEN** an authorized moderator visits `/moderation`,  
  **THEN** the queue displays all reports with status `pending`, sorted by `created_at ASC` (oldest first).
- **WHEN** a report card is rendered,  
  **THEN** it displays the target type (`listing` or `user`), target title/name, reported policy reason, reporter context details, and submission timestamp without exposing reporter primary email.
- **WHEN** a moderator determines a report is unfounded or duplicate and clicks "Ablehnen" (Dismiss) with a justification note ($\le 1000$ chars),  
  **THEN** the system updates report status to `dismissed`, records the action in `marketplace.moderation_actions`, and removes it from the pending queue.

---

### P1: Listing Removal and Transaction Cascades ⭐ MVP

As an authorized moderator reviewing a policy-violating listing,  
I want to take down the listing immediately,  
So that it is removed from the marketplace and any active reservations are safely cancelled.

#### Acceptance Criteria

- **WHEN** a moderator submits a listing removal action with a justification note,  
  **THEN** the system atomically updates `marketplace.listings.status = 'removed'`, cancels any active reservation with reason `moderation_removal`, marks competing pending offers `superseded`, updates the report status to `actioned`, and records the action in the audit log (Marketplace Invariant 9).
- **WHEN** a listing is marked `removed`,  
  **THEN** it is immediately excluded from all public feeds, search queries, and details pages (returning HTTP 404 to visitors).
- **WHEN** the seller views their own removed listing in `/account/listings`,  
  **THEN** it displays a clear "Von der Moderation entfernt" badge with no option to relist or edit.

---

### P1: Bad-Actor Account Suspension ⭐ MVP

As an authorized moderator reviewing a malicious or abusive user,  
I want to suspend their account,  
So that they cannot continue listing, messaging, or scamming other students.

#### Acceptance Criteria

- **WHEN** a moderator submits a user suspension action with a justification note,  
  **THEN** the system updates the user's account state to `suspended`, marks their active listings `removed` or `archived`, cancels any active reservations, updates the report status to `actioned`, and records the action in the audit log.
- **WHEN** a suspended user attempts to post a listing, send a message, make an offer, or reserve an item,  
  **THEN** the request is rejected with HTTP 403 and error code `ACCOUNT_SUSPENDED`.

---

### P1: Immutable Append-Only Audit Trail ⭐ MVP

As a platform auditor or lead operator,  
I want every moderation decision to be durably and immutably recorded,  
So that all enforcement actions are fully accountable and tamper-proof.

#### Acceptance Criteria

- **WHEN** any moderation action is executed (dismissal, removal, suspension),  
  **THEN** an audit entry is atomically written to `marketplace.moderation_actions` capturing `(id, moderator_id, action_type, target_type, target_id, reason, created_at)`.
- **WHEN** attempting to execute an `UPDATE` or `DELETE` query on `marketplace.moderation_actions`,  
  **THEN** PostgreSQL rejects the statement with permission denied (privileges revoked from public/authenticated).
- **WHEN** an authorized moderator visits `/moderation/audit`,  
  **THEN** the system displays the chronological log of all historical moderation actions with timestamps and justification notes.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| MOD-01 | Least-privilege moderator RBAC and authorization (AD-017) | P1 Story 1: AC1, AC2, AC3, AC4 | Security / RLS / Database | verified |
| MOD-02 | Moderation queue review and report dismissal | P1 Story 2: AC1, AC2, AC3 | Database RPC / UI Pages | verified |
| MOD-03 | Listing takedown, status `removed`, and reservation cascades | P1 Story 3: AC1, AC2, AC3 | Database RPC / PostgreSQL | verified |
| MOD-04 | Bad-actor account suspension and mutation lockout | P1 Story 4: AC1, AC2 | Database RPC / Security | verified |
| MOD-05 | Immutable append-only audit trail (`marketplace.moderation_actions`) | P1 Story 5: AC1, AC2, AC3 | Database / PostgreSQL / Audit | verified |
