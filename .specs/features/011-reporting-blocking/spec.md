# Reporting and Blocking Specification

**Status:** Draft

## Problem Statement

Marketplace participants need robust, immediate mechanisms to protect themselves against abusive conduct, policy violations, harassment, and fraud. When encountering prohibited content, scam attempts, or offensive messages, users need to submit confidential reports with structured categories so that moderators can take auditable action. Furthermore, victims of harassment or unwanted contact need an immediate self-defense tool: the ability to block an individual, severing all communication, hiding mutual listings across feed and search, and preventing offers or reservations, all without exposing the reporter or blocker to retaliation.

## Goals

- [ ] Support structured reporting of listings and user accounts with predefined policy categories.
- [ ] Guarantee absolute reporter confidentiality: reported users must never discover who reported them or whether a report exists.
- [ ] Prevent self-reporting: users cannot report their own listings or accounts.
- [ ] Prevent duplicate pending report spam against the same target by the same reporter.
- [ ] Enforce bidirectional user blocking at the database layer (AD-016): blocked and blocker users cannot see each other's listings in feed or search.
- [ ] Prohibit messaging, purchase intents, offers, and reservations between mutually blocked users.
- [ ] Provide a dedicated management view (`/account/blocked-users`) allowing users to view and unblock blocked accounts.
- [ ] Exclude private email addresses and internal hashes from all reporting and blocking projections.
- [ ] Rate-limit report and block creation (max 10 actions/min) to prevent abuse and denial-of-service attempts.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Automated AI or algorithmic content moderation | Deferred beyond V1; V1 relies on structured human moderation (Feature 012). |
| Administrative moderation queue and triage dashboard | Owned by downstream Feature `012-moderation`. |
| Public block lists or community reputation flags | Blocking is strictly a private, personal safety tool; public blacklists violate privacy policy. |
| Automatic listing takedown on report threshold | Takedowns require explicit human moderator action (Feature 012) to prevent malicious brigade-reporting. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Enforcement boundary | Database-layer anti-joins in PostgreSQL RPCs & RLS | Unanimous Jury decision (AD-016): satisfies AGENTS.md data-boundary rule, protects keyset pagination (AD-010), eliminates covert leaks. | yes |
| Report reasons | Pre-defined policy taxonomy (prohibited, fraud, harassment, unsupported, privacy, other) | Directly matches Marketplace Policy (docs/product/03-marketplace-policy.md). | yes |
| Block symmetry | Bidirectional exclusion (neither party sees the other's content) | Prevents stalking, cross-snooping, and unwanted interactions symmetrically. | yes |
| Target awareness | Zero target notification or visibility | Reporting is completely confidential; targets are unaware of reports until moderator action (Feature 012). | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Report details trimmed and limited to max 1,000 characters; target ID must be valid UUID; reason must match allowed enum. |
| Failure / partial-failure states | Submitting a report on an already-deleted listing returns HTTP 404; duplicate pending reports return HTTP 409 `REPORT_ALREADY_EXISTS`. |
| Idempotency / retry handling | Blocking an already-blocked user is safely idempotent and returns HTTP 200 with the active block record. |
| Auth boundaries & rate limits | Guest access is rejected with HTTP 401; mutations rate-limited to 10 req/min per user. |
| Concurrency / ordering | Composite unique constraints on `marketplace.user_blocks(blocker_id, blocked_id)` and pending reports prevent race duplicates. |
| Data lifecycle & cascades | Deleted user accounts cascade delete their block entries; reports retain target references with `ON DELETE SET NULL` for audit trails. |
| Observability | Telemetry records `report.submitted` and `user.blocked` events with target type and reason category without logging PII. |
| Privacy boundary | Target users cannot query reports table where they are the target; reports API never returns reporter identity to unauthorized callers. |

---

## User Stories

### P1: Structured Listing and User Reporting ⭐ MVP

As a registered marketplace user,  
I want to report a suspicious listing or abusive user with a structured policy reason,  
So that marketplace operators can review the violation and keep the community safe.

#### Acceptance Criteria

- **WHEN** an authenticated user submits a report for an active listing or user account with an approved reason (`prohibited_content`, `fraud_or_scam`, `harassment_or_abuse`, `unsupported_content`, `privacy_violation`, `other`) and optional details ($\le 1000$ chars),  
  **THEN** the system records the report in `marketplace.reports` with status `pending` and returns HTTP 201 with the report confirmation.
- **WHEN** a user attempts to report their own listing or their own user account (`reporter_id = target_id`),  
  **THEN** the request is rejected with HTTP 400 and error code `CANNOT_REPORT_SELF`.
- **WHEN** an unauthenticated visitor attempts to submit a report,  
  **THEN** the system rejects the request with HTTP 401 `UNAUTHENTICATED`.
- **WHEN** a user attempts to submit a second report for the same target while an earlier report is still `pending`,  
  **THEN** the system rejects the request with HTTP 409 and code `REPORT_ALREADY_PENDING`.
- **WHEN** a user exceeds the rate limit of 10 reports per minute,  
  **THEN** the request is rejected with HTTP 429 `RATE_LIMITED`.

---

### P1: Absolute Reporter Confidentiality and Target Blindness ⭐ MVP

As a user reporting a safety or policy violation,  
I want complete confidentiality regarding my report,  
So that I can report bad actors without fear of personal retaliation or harassment.

#### Acceptance Criteria

- **WHEN** a reported user queries any public or authenticated API endpoint (including listings, profile, or reports),  
  **THEN** the system never reveals that a report exists against them or any details regarding the reporter's identity.
- **WHEN** Row Level Security policies are evaluated on `marketplace.reports`,  
  **THEN** target users are denied `SELECT` access to reports filed against them, permitting only the original reporter to inspect their own submission status.
- **WHEN** report confirmation receipts are returned to the reporter,  
  **THEN** the response completely excludes all primary and verification emails and internal security hashes.

---

### P1: Bidirectional User Blocking and Content Exclusion ⭐ MVP

As a marketplace participant,  
I want to block another user,  
So that they can no longer contact me or see my content, and I no longer see theirs.

#### Acceptance Criteria

- **WHEN** an authenticated user blocks another user,  
  **THEN** the system creates a block record in `marketplace.user_blocks` and returns HTTP 201 with confirmation.
- **WHEN** a user attempts to block themselves (`blocker_id = blocked_id`),  
  **THEN** the request is rejected with HTTP 400 and error code `CANNOT_BLOCK_SELF`.
- **WHEN** an authenticated user browses the public marketplace feed or executes a search,  
  **THEN** the query plan applies index-backed anti-joins that automatically exclude all listings owned by users who blocked the viewer or whom the viewer blocked (AD-016).
- **WHEN** a visitor views a listing owned by a user with whom an active mutual block exists,  
  **THEN** the system returns HTTP 404 `NOT_FOUND` as if the listing does not exist.

---

### P1: Interaction Gates in Messaging and Negotiation ⭐ MVP

As a user who has blocked an individual,  
I want all messaging, offer, and reservation interactions with that individual to be completely blocked,  
So that they cannot harass or transact with me.

#### Acceptance Criteria

- **WHEN** a blocked user attempts to send a message in an existing conversation with the blocker,  
  **THEN** the request is rejected with HTTP 403 and error code `USER_BLOCKED`.
- **WHEN** a blocked user attempts to submit a purchase intent or price offer on the blocker's listing,  
  **THEN** the request is rejected with HTTP 403 `USER_BLOCKED`.
- **WHEN** an active conversation thread is opened where a mutual block exists,  
  **THEN** the UI displays a disabled message composer with a clear notice that messaging is unavailable due to an active block.

---

### P1: Block List Management and Unblock Flow ⭐ MVP

As a user with blocked accounts,  
I want to view my blocked users and unblock them if circumstances change,  
So that I maintain full control over my privacy and block preferences.

#### Acceptance Criteria

- **WHEN** an authenticated user visits `/account/blocked-users`,  
  **THEN** the page displays a list of all users they have blocked, showing their public display name, avatar, and date blocked.
- **WHEN** a user clicks "Entsperren" (Unblock) for a blocked user,  
  **THEN** the system removes the block entry and returns HTTP 200, immediately restoring ordinary public visibility.
- **WHEN** a user has no blocked accounts,  
  **THEN** the page renders an accessible empty state confirming no users are currently blocked.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| REP-01 | Structured listing and user reporting with rate limiting | P1 Story 1: AC1, AC2, AC3, AC4, AC5 | Database RPC / API | pending |
| REP-02 | Absolute reporter confidentiality and target-blind RLS | P1 Story 2: AC1, AC2, AC3 | Security / RLS / Database | pending |
| REP-03 | Bidirectional user blocking and feed/search exclusion (AD-016) | P1 Story 3: AC1, AC2, AC3, AC4 | Database RPC / PostgreSQL | pending |
| REP-04 | Blocking interaction gates in messaging, offers, and reservations | P1 Story 4: AC1, AC2, AC3 | Security / API / Application | pending |
| REP-05 | Block list management and unblock flow (`/account/blocked-users`) | P1 Story 5: AC1, AC2, AC3 | UI Pages / Application | pending |
