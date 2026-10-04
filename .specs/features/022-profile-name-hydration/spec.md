# Saved Profile Name in Account Settings

**Status:** Implemented locally on 2026-10-04; independent validation pending.

## Problem Statement

Registration and profile updates store the public display name, but the account editor initializes its field and current-name text to the hard-coded value `User` on every visit. A successful update therefore appears lost after a refresh.

## Goals

- Show the persisted public display name when the account page opens or refreshes.
- Keep the name returned by a successful update visible after a refresh.

## Out of Scope

| Item | Reason |
| --- | --- |
| Unique public usernames | Feature 002 explicitly defers usernames; this request concerns the existing display name. |
| Production deployment | Local implementation and commits are authorized; remote release requires separate approval. |

## Assumptions & Open Questions

| Assumption | Decision | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Meaning of “user” | The existing public display name | Registration and account settings expose this field. | repository evidence |
| Source of saved value | Authenticated `GET /api/identity/me/profile` | The endpoint returns the persisted owner profile. | repository evidence |

**Open questions:** none for the local correction.

## User Stories

### NAME-01: Read the saved display name

**User Story:** As an account owner, I want my saved display name in settings so that I can see and edit the value other people see.

**Acceptance Criteria:**

1. WHEN an account owner opens or refreshes account settings THEN the editor SHALL show the display name returned by the authenticated owner-profile endpoint in its input and current-name text.
2. WHEN the owner successfully updates the display name and refreshes account settings THEN the editor SHALL show the updated persisted name, without reverting to `User`.
3. IF the owner starts editing before the initial profile read finishes THEN the late response SHALL not replace the text being edited.
4. IF the owner successfully saves before the initial profile read finishes THEN the late response SHALL not replace the newly saved name.
5. IF the initial profile read fails THEN the editor SHALL not claim that `User` is the saved name.

**Independent Test:** Mock the authenticated owner-profile read and update, open and refresh the account page, and verify the rendered field and current-name text. Delay the initial read to verify editing and save ordering.

## Requirement Traceability

| Requirement ID | Story | Status |
| --- | --- | --- |
| NAME-01 | Read the saved display name | Implemented T1; validation pending |

## Success Criteria

- [x] The account editor renders the saved registration name and the updated name after refresh.
- [x] A delayed profile read cannot overwrite in-progress edits or a completed save.
