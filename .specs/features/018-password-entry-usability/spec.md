# Password Entry Usability Specification

**Status:** Locally implemented on 2026-10-03; independent validation pending.

## Problem Statement

People cannot reveal their password while signing in or registering. Registration has no confirmation field or progressive guidance for the existing password rule.

## Goals

- [x] Reveal or hide passwords on sign-in and registration.
- [x] Require a matching confirmation in registration before sending the request.
- [x] Show progressive password guidance without changing the server policy.

## Out of Scope

| Item | Reason |
| --- | --- |
| New password composition requirements | The approved identity policy accepts 10-128 Unicode characters without character-class rules. |
| Server API, Auth configuration, or database changes | Confirmation and guidance are browser concerns. |
| Production deployment | This request authorizes local implementation only. |

## Assumptions & Open Questions

| Assumption | Decision | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Visual direction | Reuse the current auth form and approved `DESIGN.md` tokens. | This is a focused enhancement to existing forms. | yes |
| Password guidance | Show 10-character required minimum and optional 14/20-character milestones. | Length is one useful factor but not a security score. | inferred from request and existing policy |
| Error handling | Clear both password fields on registration errors. | Matches the current form's no-retention behavior. | existing behavior |

**Open questions:** none for local implementation.

## User Stories

### PWDUI-01: Reveal password

**User Story:** As a user entering a password, I want to inspect what I typed on sign-in and registration so that I can correct mistakes.

**Acceptance Criteria:**

1. WHEN a user activates the password visibility control on sign-in or registration THEN that field SHALL alternate between masked and visible text without changing its value, focusability, autocomplete, or submission behavior.
2. The control SHALL have a discernible name and pressed state, and registration's two fields SHALL toggle independently.

**Independent Test:** In a browser, fill each field, toggle it twice, and assert type, value, name, and state.

### PWDUI-02: Confirm registration password

**User Story:** As a new user, I want to confirm my password so that a typing mistake cannot become my account password.

**Acceptance Criteria:**

1. WHEN registration confirmation is absent or differs from the password THEN the form SHALL show a field error, focus the error summary, and send no registration request.
2. WHEN the confirmation matches THEN the form SHALL send only the primary password in the existing registration request body.
3. IF registration fails locally or remotely THEN both password fields SHALL be cleared.

**Independent Test:** Exercise empty, mismatched, matching, and server-error submissions with request interception.

### PWDUI-03: Explain password guidance

**User Story:** As a new user, I want to see progress while entering a password so that I understand the minimum and how a longer passphrase helps.

**Acceptance Criteria:**

1. WHILE a user enters a registration password THEN the form SHALL progressively mark the existing 10-character minimum and optional 14/20-character milestones using text and color.
2. The guidance SHALL state that length alone is not a security score and SHALL allow paste, password managers, and any 10-128-character password accepted by the existing server rule.

**Independent Test:** Fill passwords across the milestones, inspect text and completed states, and retain the existing registration and paste coverage.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PWDUI-01 | Reveal password | Execute | Implemented, verification pending |
| PWDUI-02 | Confirm registration password | Execute | Implemented, verification pending |
| PWDUI-03 | Explain password guidance | Execute | Implemented, verification pending |

## Success Criteria

- [x] Registration and sign-in browser tests pass, including 360px layouts.
- [x] Typecheck, lint, and formatting pass.
- [ ] An independent verifier records PASS in `validation.md`.
