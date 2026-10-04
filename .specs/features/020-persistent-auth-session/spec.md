# Persistent Authentication Session Specification

**Status:** Verified locally by an independent reviewer.

## Problem Statement

The current sign-in route writes only the access JWT to a persistent cookie. It discards the Supabase refresh token, so the browser becomes unauthenticated when the short-lived JWT expires even though the identity specification promises persistence across browser restarts for up to 30 days. Reauthentication also writes a placeholder access cookie.

## Goals

- [x] Persist a bounded refresh token alongside the access token in server-managed HttpOnly cookies.
- [x] Renew the access token before expiry and carry the rotated refresh token forward without exposing either token to browser JavaScript.
- [x] Keep logout, password reset, deletion, and reauthentication consistent with the active session cookies.

## Out of Scope

| Item | Reason |
| --- | --- |
| Changes to Supabase database or Auth timebox configuration | The approved identity design already sets an absolute 30-day Auth timebox. |
| New "remember me" toggle | The existing specification requires a bounded persistent session for every sign-in. |
| Production deployment | The project guide authorizes local work and commits only. |

## Assumptions & Open Questions

| Assumption | Decision | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Absolute duration | Cap browser refresh credentials at 30 days from sign-in, including after rotation. | Matches IDAC-02 and the Auth timebox. | existing approved spec |
| Legacy access-only cookie | Accept it until the JWT expires; require sign-in afterward. | A refresh token cannot be reconstructed. | inferred from current implementation |
| Refresh failure | Keep credentials on transient dependency failure but deny expired access; clear them on an explicit invalid/revoked refresh result. | Preserves recovery without exposing private data. | inferred from identity error policy |

**Open questions:** none for local implementation.

## User Stories

### SESS-01: Persist and renew sign-in

**User Story:** As a confirmed user, I want to remain signed in through browser restarts and access-JWT expiry while my 30-day session remains valid.

**Acceptance Criteria:**

1. WHEN password sign-in succeeds THEN the server SHALL set access and refresh credentials in HttpOnly, SameSite=Lax cookies, with Secure in production and an absolute maximum age of 30 days from sign-in.
2. WHEN a request presents a refresh credential and an access JWT expiring within 60 seconds THEN the server SHALL exchange the refresh token for a new access/refresh pair and send both rotated cookies to the browser and the new access token to the server request.
3. WHILE a session is refreshed, the server SHALL retain its original 30-day browser expiry rather than extending it.
4. IF the refresh credential is absent or older than 30 days THEN the server SHALL not refresh the access JWT, and expired credentials SHALL grant no private access.
5. IF refresh fails because the token is invalid or revoked THEN the server SHALL clear both authentication cookies; IF the Auth service is unavailable THEN the server SHALL keep the cookies for retry while denying expired access.

**Independent Test:** Exercise login cookie attributes and refresh rotation with a simulated expiring JWT, restart-like cookie reuse, age boundaries, invalid refresh, and transient dependency failure.

### SESS-02: End and replace sessions consistently

**User Story:** As a user, I want logout and sensitive account actions to remove or replace all browser session credentials correctly.

**Acceptance Criteria:**

1. WHEN the user signs out of the current device or all devices THEN the server SHALL clear both access and refresh cookies and attempt the corresponding provider revocation.
2. WHEN password recovery or account deletion ends the current session THEN the server SHALL clear both access and refresh cookies.
3. WHEN password reauthentication succeeds THEN the server SHALL replace placeholder cookie behavior with the newly authenticated access and refresh credentials.
4. IF authentication fails or returns no real token pair THEN the sign-in route SHALL set no authentication cookie and SHALL not report an authenticated session.

**Independent Test:** Assert route responses and provider calls for sign-in, current/global logout, reauthentication, recovery, and deletion.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SESS-01 | Persist and renew sign-in | Execute | Verified |
| SESS-02 | End and replace sessions | Execute | Verified |

## Success Criteria

- [x] Focused identity application, route, middleware, and refresh tests pass with no skipped cases.
- [x] Typecheck, lint, formatting, and build pass.
- [x] Independent validation records PASS in `validation.md`.
