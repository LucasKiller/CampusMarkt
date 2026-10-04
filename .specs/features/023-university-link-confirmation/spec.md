# University Verification Link Confirmation

**Status:** Verified locally on 2026-10-04; production deployment pending.

## Problem Statement

The university email links to `/auth/action/university_verification`, but the action route accepts only account confirmation and password recovery. It redirects the student to the homepage without confirming verification or displaying an error.

## Goals

- Make a valid university email link lead to confirmation and a clear verified result.
- Keep the raw one-time token out of the destination URL and browser-rendered page.
- Explain invalid or expired links and provide a path to request another link.

## Out of Scope

| Item | Reason |
| --- | --- |
| University policy, token lifetime, and badge schema | Feature 003 and the annual policy amendment remain authoritative. |
| Production deployment | Local implementation and commits are authorized; remote release needs separate approval. |

## Assumptions & Open Questions

| Assumption | Decision | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Link destination | The existing email URL is authoritative. | The user's homepage redirect matches the action route's rejection of this purpose. | repository and user report |
| Confirmation transport | Stage the token in a short-lived HttpOnly cookie, then POST to the existing confirmation API. | Reuses the project's private action-token pattern without exposing the token to client code. | repository pattern |

**Open questions:** none for the local correction.

## User Stories

### UNILINK-01: Confirm a university email link

**User Story:** As a student, I want the link in my university inbox to complete verification and show the result.

**Acceptance Criteria:**

1. WHEN a student opens a well-formed university verification link THEN the system SHALL redirect to a tokenless confirmation page and stage the token in an HttpOnly, SameSite=Strict, short-lived cookie.
2. WHEN the confirmation page receives a staged valid token THEN it SHALL submit it to the existing confirmation endpoint and show the verified university result without another manual action.
3. IF the token is missing, malformed, expired, or consumed THEN the page SHALL show an invalid-link message and a route to request a new verification from account settings.
4. IF confirmation fails due to a temporary server problem THEN the page SHALL show a retryable error without claiming verification succeeded.
5. WHEN the confirmation succeeds THEN the existing confirmation endpoint SHALL consume the token and clear the staged cookie; the student's badge remains governed by Feature 003's persisted verification state.

**Independent Test:** Follow an email-shaped link through staging and client confirmation, verify the tokenless URL and secure cookie, and exercise valid, invalid, and dependency-failure outcomes.

## Requirement Traceability

| Requirement ID | Story | Status |
| --- | --- | --- |
| UNILINK-01 | Confirm a university email link | Verified T1-T2; 5/5 criteria passed |

## Success Criteria

- [x] The link no longer sends the student to the homepage without a result.
- [x] A valid link confirms verification; invalid links and temporary failures have explicit outcomes.
