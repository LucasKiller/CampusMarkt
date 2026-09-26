# University Verification Specification

**Status:** Implemented

> **Policy amendment (Feature 014, 2026-09-26):** The original 180-day implementation and its historical validation were superseded by the approved twelve-calendar-month policy in AD-019. This specification now reflects the active policy; the original evidence remains unchanged in `validation.md`.

## Problem Statement

CampusMarkt users currently have accounts and public profiles, but there is no mechanism to verify student or university affiliation. Students in Braunschweig want a verifiable trust signal to identify fellow university members when arranging in-person exchanges. The marketplace needs an optional university verification capability that issues a visible trust badge without exposing the student's institutional email address or granting exclusive access privileges.

## Goals

- [x] Let a confirmed registered user submit an institutional email address for supported universities (starting with TU Braunschweig).
- [x] Deliver a one-time verification link with a bounded 24-hour lifetime to the institutional address.
- [x] Issue a visible trust badge on the user's public profile upon verification confirmation.
- [x] Enforce 1:1 uniqueness so that one institutional identity cannot verify multiple active CampusMarkt accounts simultaneously.
- [x] Automatically expire verifications after 12 calendar months with a seamless reverification path.
- [x] Protect student privacy by storing only a pseudonymous HMAC-SHA-256 hash at rest and never exposing the institutional address in public profiles, APIs, or logs.
- [x] Integrate with the account deletion lifecycle to purge verification records when an account is deleted.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Gatekeeping standard marketplace access behind university verification | CampusMarkt V1 is open to all local Braunschweig residents; verification is purely a trust badge. |
| Additional universities beyond TU Braunschweig | V1 focuses strictly on the local Braunschweig student community; other institutions will be added in later specs. |
| Single Sign-On (SSO) / Shibboleth / DFN-AAI integration | Email loop verification provides a lightweight, self-serve mechanism without institutional partnership dependencies. |
| Manual document or student ID card upload and moderation | Adds significant operational overhead and privacy liability; email domain verification is the approved V1 method. |
| Automatic student discount calculations | Feature 004/005 define listing and offer mechanics independently. |
| Plaintext institutional email retention after verification | Strict data minimization policy requires discarding plaintext institutional email addresses once confirmed. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Initial supported institution | TU Braunschweig (`@tu-braunschweig.de`, `@tu-bs.de`) | Matches V1 geographic focus and existing student email domains. | yes |
| Verification token lifetime | One-time link valid for 24 hours | Matches the primary account email confirmation window and allows ample inbox turnaround. | yes |
| Verification validity period | 12 calendar months from confirmation date | Approved annual trust-signal renewal cadence (AD-019). | yes |
| Institutional email storage | Store only normalized HMAC-SHA-256 hash in database; discard plaintext after verification | Prevents mass scraping, data leaks, and unnecessary PII retention. | yes |
| Uniqueness constraint | Exactly one active verification per institutional email hash | Prevents fraudulent multi-account trust badge farming. | yes |
| Voluntary badge disconnect | Allow users to disconnect their university verification from their account settings | Users retain full autonomy over their displayed profile trust signals. | yes |
| Rate limiting on requests | Maximum 3 verification requests per account and IP per hour | Prevents email spamming, inbox harassment, and resource abuse. | yes |
| Account deletion behavior | Verification records are deleted when the parent account is purged | Frees the institutional email hash so the student can verify a new account later if desired. | yes |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Initiate university verification ⭐ MVP

**User Story**: As a confirmed registered user, I want to submit my TU Braunschweig email address so that I can receive a verification link to prove my student affiliation.

**Why P1**: Without initiation and email delivery, no student verification can take place.

**Acceptance Criteria**:

1. WHEN an authenticated user submits an institutional email whose domain matches an active supported institution (`tu-braunschweig.de` or `tu-bs.de`) below the rate limit THEN the system SHALL create a pending verification record and send a one-time verification link that expires after 24 hours.
2. The system SHALL normalize the institutional email address by trimming whitespace and lowercasing before computing its verification hash.
3. IF the submitted email domain does not match an accepted institution domain THEN the system SHALL reject the request with HTTP 400 and an actionable error identifying the domain requirement.
4. IF the normalized institutional email is currently verified by another active account THEN the system SHALL reject the request with HTTP 409 and a non-disclosing conflict message.
5. IF verification requests for an account reach 3 attempts within one hour THEN the system SHALL reject subsequent requests with HTTP 429 and a `Retry-After` header.
6. IF SMTP delivery fails THEN the system SHALL record a bounded dependency failure, return HTTP 503, and SHALL not advance the verification to confirmed status.
7. WHILE an account is unconfirmed or deletion-pending, the system SHALL deny verification initiation requests with HTTP 403.
8. The system SHALL never log or expose plaintext institutional email addresses or raw verification tokens in telemetry.

---

### P1: Confirm university verification and issue badge ⭐ MVP

**User Story**: As a student who received a verification email, I want to follow the verification link so that my account receives the official TU Braunschweig trust badge.

**Why P1**: Completing the verification loop is the core event that activates the trust badge.

**Acceptance Criteria**:

1. WHEN a user follows a valid, unused verification link before expiry THEN the system SHALL mark the university verification as confirmed and set the expiration timestamp to exactly 12 calendar months from confirmation.
2. WHEN university verification is confirmed THEN the system SHALL store the normalized institutional email hash, discard the plaintext address, and revoke the consumed action token.
3. WHEN verification confirmation succeeds THEN the system SHALL immediately make the university badge visible on the user's public profile.
4. IF a verification token is expired, malformed, or already consumed THEN the system SHALL reject confirmation with HTTP 400 and an actionable message offering a new verification request.
5. IF two confirmation requests for the same token race concurrently THEN the system SHALL confirm the verification once and preserve exactly one active verification state.
6. IF the initiating user account was marked deletion-pending before confirmation THEN the system SHALL reject confirmation and cancel the pending verification.

---

### P1: Display verified badge with strict privacy ⭐ MVP

**User Story**: As a marketplace participant, I want to see the university badge on a user's profile and listings so that I can trust their institutional affiliation without seeing their private email.

**Why P1**: The trust badge must be visible to public marketplace visitors while preserving complete privacy of the underlying institutional email.

**Acceptance Criteria**:

1. WHEN any visitor reads a public profile for an account with active university verification THEN the system SHALL return the university identifier (`tu-braunschweig`), display label (`TU Braunschweig`), and verification status.
2. WHILE a university verification is expired, revoked, or pending, the system SHALL omit the university badge from public profile responses.
3. The system SHALL exclude institutional email addresses, email hashes, verification tokens, and verification timestamps from all public profile responses.
4. The system SHALL permit unverified registered users to browse, search, and participate in all standard marketplace interactions without penalty.

---

### P1: Expire and reverify university affiliation ⭐ MVP

**User Story**: As a verified student whose semester has ended, I want clear notice of expiration and an easy reverification flow so that I can keep my trust badge current.

**Why P1**: Student status changes over time; verifications must expire automatically and remain renewable.

**Acceptance Criteria**:

1. WHEN system time reaches or exceeds the 12-calendar-month expiration timestamp THEN the system SHALL evaluate the verification as expired and cease displaying the badge on public profiles.
2. WHEN an authenticated user views their account settings with an expired or expiring verification THEN the system SHALL display the current verification status and provide an initiation action for reverification.
3. WHEN a user reverifies with a valid institutional email before or after expiration THEN the system SHALL update the verification state and extend expiration to 12 calendar months from the new confirmation date.
4. IF a reverification attempt uses a different institutional email that is already verified by another active account THEN the system SHALL reject the reverification with HTTP 409.

---

### P1: Disconnect badge and account deletion lifecycle ⭐ MVP

**User Story**: As a user, I want to disconnect my university badge voluntarily, and ensure my verification data is purged if I delete my CampusMarkt account.

**Why P1**: User control and GDPR-compliant lifecycle management must govern all identity-linked verification data.

**Acceptance Criteria**:

1. WHEN an authenticated owner explicitly requests to disconnect their university verification THEN the system SHALL revoke the verification, remove the badge from the public profile immediately, and purge the verification record.
2. WHEN an account deletion purge is executed by the identity cleanup worker THEN the system SHALL delete all university verification records and tokens associated with that account.
3. WHEN a verification record is deleted or purged THEN the system SHALL release the institutional email hash so that the institutional email may be used to verify another account in the future.
4. IF an unauthenticated user or non-owner attempts to disconnect a verification THEN the system SHALL reject the request with HTTP 401 or HTTP 403.

---

### P1: Enforce abuse boundaries and security logging ⭐ MVP

**User Story**: As the marketplace operator, I want strict abuse controls and privacy-safe audit logging on verification endpoints so that institutional email bombing and spoofing are prevented.

**Why P1**: Email verification endpoints are prime targets for automated spam and harassment if not rigorously bounded.

**Acceptance Criteria**:

1. The system SHALL enforce a maximum of 3 verification initiation requests per account per hour and 30 verification requests per IP per hour.
2. IF either the per-account or per-IP rate limit ceiling is reached THEN the system SHALL reject the initiation request with HTTP 429 and `Retry-After` without triggering email delivery.
3. WHEN a verification event occurs (initiation, confirmation, expiration, disconnect, or rate limit denial) THEN the system SHALL record an audit event with event type, outcome, timestamp, correlationId, and pseudonymous subject/IP hashes.
4. The system SHALL exclude plaintext institutional emails, verification tokens, passwords, and secret keys from all log records.
5. The system SHALL validate that institutional email local-parts do not contain control characters, newline characters, or header injection attempts.

---

## Edge Cases

- IF a user clicks an expired verification link THEN the system SHALL reject state changes and provide a clear link to request a new verification.
- IF two concurrent verification initiation requests arrive for the same account THEN the system SHALL serialize them and issue at most one active token.
- IF an institutional email domain uses mixed-case (e.g. `User@TU-Braunschweig.DE`) THEN the system SHALL lowercase the domain before checking against the allowlist.
- IF an account is marked deletion-pending while a verification email is in-flight THEN the system SHALL reject confirmation if the link is clicked.
- IF a user initiates reverification while their current verification is still active THEN the system SHALL keep the current badge visible until the new verification is confirmed.
- IF a verification record's expiration is reached mid-session THEN queries for the public profile SHALL immediately evaluate the badge as expired.
- IF an attacker submits an email with multiple `@` symbols or encoded delimiters THEN the system SHALL reject the input as invalid before domain evaluation.
- IF SMTP delivery times out or encounters network failure THEN the system SHALL return HTTP 503 without storing a confirmed verification state.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation and bounds | Strict email syntax, length <= 254 chars, institutional domain matching (`tu-braunschweig.de`, `tu-bs.de`), no control/header injection characters. |
| Failure and partial-failure states | SMTP failures return HTTP 503 without partial state; expired/invalid tokens return HTTP 400 with actionable retry guidance. |
| Idempotency, retry, and duplicates | Uniqueness enforced via unique database constraint on active institutional email hashes; duplicate callbacks converge safely. |
| Auth boundaries and rate limits | Only confirmed authenticated users can initiate verification; rate limits capped at 3/hr per account and 30/hr per IP. |
| Concurrency and ordering | Concurrent confirmations converge on one winner; reverification preserves active badge until successful confirmation. |
| Data lifecycle and expiry | Tokens expire in 24 hours; verifications expire in 12 calendar months; account deletion cascades verification purge. |
| Observability | Security events record event type, outcome, correlation ID, and pseudonymous hashes; no plaintext emails or tokens logged. |
| External-dependency failure | SMTP outage handled gracefully with bounded 503; database failures roll back atomically. |
| State-transition integrity | Strict lifecycle: `unverified` -> `pending` -> `verified` -> `expired` / `revoked`; transitions guarded by server RPC. |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| UNIV-01 | P1: Initiate university verification | Pending | pending |
| UNIV-02 | P1: Confirm university verification and issue badge | Pending | pending |
| UNIV-03 | P1: Display verified badge with strict privacy | Pending | pending |
| UNIV-04 | P1: Expire and reverify university affiliation | Pending | pending |
| UNIV-05 | P1: Disconnect badge and account deletion lifecycle | Pending | pending |
| UNIV-06 | P1: Enforce abuse boundaries and security logging | Pending | pending |

**Coverage:** 6 total requirements mapped to P1 user stories; 0 orphan requirements.

---

## Success Criteria

- [x] A confirmed user can submit a `@tu-braunschweig.de` or `@tu-bs.de` email address, receive a verification link, and confirm it within 24 hours.
- [x] Confirmed verification immediately displays the TU Braunschweig badge on the user's public profile and account dashboard.
- [x] Public profile endpoints and DOM never leak the student's institutional email address or raw hash.
- [x] An institutional email cannot be linked to more than one active CampusMarkt account simultaneously.
- [x] Verification automatically expires after 12 calendar months, removing the badge unless reverified.
- [x] Users can voluntarily disconnect their badge, and account deletion purges verification records.
- [x] Rate limits (3/hour per account) and audit logging are enforced without credential exposure.
