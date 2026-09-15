# Identity and Accounts Specification

**Status:** Approved on 2026-09-15

## Problem Statement

CampusMarkt has a verified technical foundation but no user identity journey. The marketplace needs privacy-safe accounts that let people authenticate and recover access without exposing primary email addresses, while establishing a small public identity that future listings, verification, and messaging can reference safely.

## Goals

- [ ] Let an adult user register with a primary email and password, confirm the email, and sign in safely.
- [ ] Provide bounded, revocable browser sessions, current-device and all-device sign-out, and secure account recovery.
- [ ] Give each account one owner-managed public profile with a display name and optional processed avatar.
- [ ] Enforce privacy, ownership, rate limits, idempotency, lifecycle, and audit contracts at server and data boundaries.
- [ ] Let a user delete the account and ensure identity-owned public and private data follows the approved lifecycle.

## Out of Scope

| Feature | Reason |
| --- | --- |
| University email verification and badge | Delivered by feature 003. |
| Listings, profile listing collections, favorites, offers, chat, reports, blocking, and moderation | Delivered by their V1 feature specifications. |
| Magic links, social login, phone login, passkeys, and MFA | Email and password is the approved V1 access method. |
| Public usernames, biographies, and extended profile customization | The approved initial public identity is deliberately minimal. |
| Changing the primary account email | Requires a separate dual-confirmation and recovery-risk contract. |
| Automated avatar moderation | Account reporting arrives in feature 011 before public launch. |
| Future marketplace-data retention after account deletion | Each data-owning feature must define its legal and integrity lifecycle before creating that data. |
| VPS deployment or production SMTP provisioning | This feature produces and tests a deployable contract; remote changes require separate authorization. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Primary authentication | Email and password only | Keeps the first identity surface understandable and avoids provider-specific account linking. | yes |
| Participation gate | Confirm primary email before authenticated marketplace actions | Prevents unusable identities while leaving public browsing open. | yes |
| Primary email normalization | Trim surrounding whitespace, accept syntactically valid addresses up to 254 characters, and compare the complete address case-insensitively | Gives duplicate and rate-limit behavior one measurable identity key. | no, interoperability default |
| Password bound | 10-128 characters; no composition rule | Supports strong passphrases and password managers while bounding input. | yes |
| Confirmation lifetime | One-time link valid for 24 hours | Provides a bounded resend path without forcing immediate inbox access. | no, safe default |
| Recovery lifetime | One-time link valid for 30 minutes | Limits takeover exposure while remaining usable. | yes |
| Session lifetime | Persist across browser restarts for at most 30 days | Balances marketplace convenience with bounded credential lifetime. | yes |
| Public profile fields | Opaque ID, display name, join month/year, and optional processed avatar | Provides recognition without exposing account or contact data. | yes |
| Avatar contract | Optional 5 MB JPEG/PNG/WebP input, square crop, 512x512 WebP derivative, no public original | Bounds cost and attack surface while providing a useful public identity. | yes |
| Account age | 18+ self-declaration without date of birth | Reduces minor-contract risk and avoids collecting unnecessary identity data; legal review remains required. | yes |
| Deletion timing | Immediate depublication/session revocation and purge within 30 days | Protects the user quickly while allowing reliable asynchronous cleanup. | yes |
| Email reuse after purge | A purged email may create a new unrelated account | Avoids indefinite retention solely to block reuse. | no, privacy default |
| Display-name concurrency | Last successful authorized write wins | One non-unique text field has no cross-resource invariant in this feature. | no, minimal default |
| Initial language | English-first copy with localization-ready structure | Complete German/English coverage is owned by feature 013. | no, roadmap default |
| Exact error wording | Generic, actionable messages without account enumeration | Security outcome matters; final microcopy can follow the UI system. | no, security default |
| IP abuse ceilings | 100 sign-in attempts per 15 minutes and 30 registration, recovery, or resend requests per hour | Adds shared-endpoint protection above the stricter normalized-identity limits. | no, abuse-control default |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Register and confirm an account ⭐ MVP

**User Story**: As an adult visitor, I want to create and confirm an account so that I can participate in CampusMarkt without exposing my primary email.

**Why P1**: Every owner-only marketplace action depends on a trustworthy private account identity.

**Acceptance Criteria**:

1. WHEN a visitor submits a normalized valid email no longer than 254 characters, a password of 10-128 characters, a display name of 2-50 characters, the 18+ declaration, and the current Terms and Privacy versions THEN the system SHALL create exactly one unconfirmed account and one private-owned profile.
2. WHEN an unconfirmed account is created THEN the system SHALL send a one-time confirmation link that expires after 24 hours.
3. WHILE the primary email remains unconfirmed, the system SHALL allow public browsing and SHALL deny authenticated marketplace actions.
4. WHEN a user follows a valid unused confirmation link before expiry THEN the system SHALL mark the primary email confirmed exactly once and permit sign-in.
5. IF registration input is invalid or required consent is absent THEN the system SHALL create no account and SHALL identify each invalid field without echoing the password.
6. IF registration is repeated for an existing normalized email THEN the system SHALL create no duplicate account and SHALL return the same public response shape used for a non-identifying registration outcome.
7. IF confirmation delivery fails THEN the system SHALL leave the account unconfirmed and SHALL permit a bounded resend attempt without reporting confirmation success.
8. IF a confirmation link is expired, malformed, or already used THEN the system SHALL reject state changes and SHALL offer the safe confirmation-resend path.
9. WHEN registration or confirmation resend reaches 3 requests for the normalized identity within one hour THEN the system SHALL reject the next request with HTTP 429 and a bounded retry time.

**Independent Test**: Register with valid and invalid data, prove one profile exists, confirm through captured email, verify public browsing before confirmation, and verify participation only after confirmation.

---

### P1: Sign in and control sessions ⭐ MVP

**User Story**: As a confirmed user, I want secure persistent sessions and explicit sign-out controls so that I can use CampusMarkt across browser restarts and end access when needed.

**Why P1**: Authentication is incomplete if sessions cannot be bounded, protected, and revoked.

**Acceptance Criteria**:

1. WHEN a confirmed user supplies valid credentials below the active rate limit THEN the system SHALL create an authenticated browser session and return the user to an approved same-origin destination requested before sign-in.
2. WHILE an authenticated session is valid, the system SHALL persist it across browser restarts for no more than 30 days from issuance.
3. The web system SHALL store browser authentication material only in HttpOnly cookies that are SameSite=Lax and Secure in production.
4. IF an unauthenticated user requests a private route THEN the system SHALL redirect to sign-in with only a validated same-origin local return destination.
5. IF credentials are invalid, the email is unconfirmed, or the account cannot authenticate THEN the system SHALL deny access with a generic response that does not disclose account existence.
6. WHEN a user signs out of the current device THEN the system SHALL revoke the current session and SHALL leave other sessions usable.
7. WHEN a user chooses sign-out from all devices THEN the system SHALL revoke every session and SHALL reject each of them on its next server-authorized request.
8. IF a session is expired, revoked, malformed, or belongs to a deleted account THEN the system SHALL deny private data and require authentication without exposing token details.
9. WHEN failed sign-in reaches 10 attempts for the normalized identity within 15 minutes THEN the system SHALL reject the next attempt with HTTP 429 and a bounded retry time.
10. IF a return destination is external, protocol-relative, or malformed THEN the system SHALL discard it and SHALL use the authenticated home route.

**Independent Test**: Exercise valid, invalid, unconfirmed, expired, current-device logout, all-device logout, restart persistence, and redirect-safety journeys in separate browser contexts.

---

### P1: Recover account access ⭐ MVP

**User Story**: As a user who forgot the password, I want a private recovery flow so that I can regain access without revealing whether an email is registered.

**Why P1**: Password access is unsafe and operationally incomplete without bounded recovery.

**Acceptance Criteria**:

1. WHEN any syntactically valid email requests recovery below the active limit THEN the system SHALL return one generic accepted response regardless of account existence.
2. WHEN the normalized email belongs to a recoverable account THEN the system SHALL send a one-time password-recovery link that expires after 30 minutes.
3. WHEN a user submits a valid unused recovery link and a password of 10-128 characters THEN the system SHALL replace the password exactly once and SHALL revoke every pre-existing session.
4. IF a recovery link is expired, malformed, or already used THEN the system SHALL change no password and SHALL offer a new generic recovery request.
5. IF recovery email delivery fails THEN the system SHALL record a bounded internal failure and SHALL not create a valid completed recovery state.
6. WHEN recovery reaches 3 requests for the normalized identity within one hour THEN the system SHALL reject the next request with HTTP 429 and a bounded retry time.
7. The system SHALL never expose a password, recovery token, complete primary email, or account-existence result in recovery logs or public responses.

**Independent Test**: Request recovery for existing and absent emails, compare public responses, use and reuse captured links around expiry, and prove every old session is denied after reset.

---

### P1: Maintain a public-safe profile and avatar ⭐ MVP

**User Story**: As a registered user, I want a recognizable public profile that I control so that future marketplace interactions can identify me without revealing private account data.

**Why P1**: Listings and conversations need a stable public owner identity before they can be introduced safely.

**Acceptance Criteria**:

1. WHEN any visitor reads an existing public profile THEN the system SHALL return only its opaque public ID, display name, join month/year, and optional processed-avatar URL.
2. The system SHALL omit primary email, consent records, authentication identifiers, session data, authorization metadata, and avatar originals from every public profile response.
3. WHEN the owner submits a display name containing 2-50 Unicode characters after trimming THEN the system SHALL store the normalized display name and make it public.
4. IF a display name is outside 2-50 characters or contains control characters or markup THEN the system SHALL reject the update without changing the existing profile.
5. IF an authenticated non-owner attempts to change a profile THEN the system SHALL deny the mutation without changing the profile.
6. WHEN an owner uploads a valid JPEG, PNG, or WebP image no larger than 5 MB and selects a square crop THEN the system SHALL publish one metadata-free 512x512 WebP derivative and SHALL never make the source upload public.
7. IF an avatar input is SVG, GIF, malformed, larger than 5 MB, or its detected content differs from its declared type THEN the system SHALL reject the upload and SHALL publish no new object.
8. IF avatar processing, storage, or profile update fails during replacement THEN the system SHALL preserve the previously published avatar and SHALL report replacement failure.
9. WHEN avatar processing or replacement succeeds THEN the system SHALL remove the private source upload and every superseded derivative within 24 hours.
10. WHEN an owner removes an avatar THEN the system SHALL stop returning its URL immediately and SHALL remove the stored derivative within 24 hours.
11. WHILE a profile has no avatar, the web interface SHALL render a deterministic initials or neutral-icon fallback without a broken image.
12. The Storage system SHALL permit public reads only for processed public derivatives and SHALL permit avatar writes only through an owner-authorized path.

**Independent Test**: Read the same profile as visitor, owner, and non-owner; mutate display names; upload, replace, fail, and remove avatars; and inspect both API fields and Storage authorization.

---

### P1: Delete an account safely ⭐ MVP

**User Story**: As a user leaving CampusMarkt, I want to delete my account so that my identity-owned data stops being public and is removed within a defined period.

**Why P1**: A privacy-first account system must define deletion before later features attach more user-owned data.

**Acceptance Criteria**:

1. WHEN an authenticated user with authentication no older than 10 minutes explicitly confirms deletion THEN the system SHALL mark the account deletion-pending exactly once.
2. WHEN deletion becomes pending THEN the system SHALL revoke every session and SHALL make the public profile and avatar URL unavailable immediately.
3. WHILE deletion is pending, the system SHALL deny sign-in, recovery completion, profile mutation, and registration reuse for that normalized email.
4. WHEN the deletion worker completes within 30 days THEN the system SHALL remove the Auth identity, profile, consent records, user-linked security events, and all avatar objects owned by this feature.
5. IF the deletion worker is retried THEN the system SHALL treat already removed resources as success and SHALL not recreate or republish identity data.
6. IF deletion cleanup partially fails THEN the system SHALL keep the account non-public and non-authenticating, record a redacted failure, and retry without declaring completion.
7. WHEN the deletion purge has completed THEN the system SHALL allow the same normalized email to create a new unrelated account without restoring the deleted account's profile or identifier.
8. IF authentication is older than 10 minutes THEN the system SHALL reject deletion and SHALL require reauthentication before confirmation.

**Independent Test**: Delete an account with multiple sessions and an avatar, prove immediate depublication and denial, rerun cleanup idempotently, and verify complete purge and unrelated re-registration.

---

### P1: Enforce identity abuse and audit boundaries ⭐ MVP

**User Story**: As the CampusMarkt operator, I want bounded identity endpoints and privacy-safe audit evidence so that automated abuse can be investigated without collecting secrets.

**Why P1**: Public registration and recovery endpoints are abuse surfaces from their first release.

**Acceptance Criteria**:

1. The system SHALL apply the normalized-identity limits defined by registration, sign-in, resend, and recovery requirements before invoking email delivery or an account-state mutation.
2. The system SHALL apply a separate configurable IP ceiling of 100 sign-in attempts per 15 minutes and 30 registration, recovery, or resend requests per hour.
3. IF either the normalized-identity limit or IP ceiling is exceeded THEN the system SHALL return HTTP 429 with `Retry-After` and SHALL perform no credential validation, email delivery, or account mutation.
4. WHEN a security-relevant identity event occurs THEN the system SHALL record event type, outcome, time, request correlation ID, and an internal pseudonymous subject or IP fingerprint.
5. The system SHALL exclude passwords, session tokens, confirmation tokens, recovery tokens, complete email addresses, raw avatar contents, and secret keys from identity logs and diagnostics.
6. The system SHALL derive owner authorization from the authenticated server identity and SHALL never derive privileges from user-editable profile fields or user metadata.
7. IF two retries or concurrent callbacks target the same account/profile transition THEN the system SHALL preserve one Auth identity, one profile, and one valid transition outcome.
8. IF SMTP or Storage is unavailable THEN the system SHALL return a bounded non-success result for the affected operation without exposing dependency credentials or marking the operation complete.

**Independent Test**: Cross identity and IP thresholds, compare present/absent-account responses, replay concurrent callbacks, inspect redacted audit records, and inject SMTP and Storage failures.

---

## Edge Cases

- IF two confirmation callbacks race for the same account THEN the system SHALL confirm the account once and SHALL create no additional profile or session.
- IF Auth creates an identity but profile creation is interrupted THEN the system SHALL keep participation unavailable until an idempotent repair creates exactly one valid profile.
- IF a stale display-name update completes after a newer authorized update THEN the system SHALL use last-successful-write ordering without changing ownership or private fields.
- IF two avatar replacements race THEN the system SHALL expose only the winning profile version and SHALL schedule every losing or superseded object for deletion.
- IF the browser supplies a crafted public-profile field not present in the approved schema THEN the system SHALL ignore or reject it and SHALL persist no authorization or private field.
- IF a public-profile identifier does not exist or belongs to a deletion-pending account THEN the system SHALL return the same not-found response.
- IF cookies are presented over an untrusted cross-site mutation request THEN the system SHALL reject the mutation through SameSite and server-side origin validation.
- IF the system clock crosses a token or session expiry boundary during a request THEN the system SHALL evaluate the credential as expired and SHALL perform no protected mutation.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation and bounds | Exact email, password, display-name, redirect, avatar type/size/content, and recent-authentication bounds are acceptance criteria. |
| Failure and partial-failure states | SMTP, Storage, avatar replacement, profile provisioning, and deletion cleanup have explicit non-success outcomes. |
| Idempotency, retry, and duplicates | Registration, confirmation, recovery, profile provisioning, avatar cleanup, and deletion retry contracts are explicit. |
| Auth boundaries and rate limits | Visitor/confirmed/owner/non-owner/deleting states and identity/IP limits are explicit. |
| Concurrency and ordering | Confirmation, profile writes, avatar replacement, and duplicate callbacks have defined ordering outcomes. |
| Data lifecycle and expiry | Confirmation, recovery, sessions, avatar cleanup, and account purge have exact bounds. |
| Observability | Security events and prohibited log contents are explicit. |
| External-dependency failure | SMTP and Storage failure behavior is explicit; other external dependencies are N/A because this feature has none. |
| State-transition integrity | Unconfirmed, confirmed, session-revoked, deletion-pending, and deleted transitions have guards and terminal outcomes. |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IDAC-01 | P1: Register and confirm an account | Tasks | In progress: T1-T2, T4-T6, T8-T10, T14-T15 complete; planned T16-T26, T31-T36 |
| IDAC-02 | P1: Sign in and control sessions | Tasks | In progress: T1, T3-T6, T10-T11, T15 complete; planned T16-T17, T19-T20, T22-T23, T25, T30, T32-T36 |
| IDAC-03 | P1: Recover account access | Tasks | In progress: T1-T6, T9-T11, T15 complete; planned T16-T19, T22-T23, T26, T31-T36 |
| IDAC-04 | P1: Maintain a public-safe profile and avatar | Tasks | In progress: T1-T8, T12-T13 complete; planned T16, T23, T27-T29, T31, T34-T36 |
| IDAC-05 | P1: Delete an account safely | Tasks | In progress: T1, T4-T5, T8-T9, T11-T15 complete; planned T16-T17, T20, T22-T23, T27-T36 |
| IDAC-06 | P1: Enforce identity abuse and audit boundaries | Tasks | In progress: T2-T15 complete; planned T16-T36 |

**Coverage:** 6 total, 6 mapped to the approved design and implementation tasks; execution evidence pending.

---

## Success Criteria

- [ ] A new user can register, confirm, sign in, retain a bounded session, sign out, and recover access through independently tested browser journeys.
- [ ] Visitor, owner, non-owner, unconfirmed, expired-session, and deletion-pending access tests enforce the exact public/private boundary.
- [ ] Public profile and Storage responses expose only the approved display name, join month/year, and processed avatar derivative.
- [ ] Every identity endpoint rejects its specified invalid, duplicate, replayed, concurrent, rate-limited, and dependency-failure cases without leaking account existence or secrets.
- [ ] Account deletion immediately removes public visibility and authentication, completes identity-owned purge within 30 days, and is safe to retry.
