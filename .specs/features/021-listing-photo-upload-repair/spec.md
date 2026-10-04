# Listing Photo Upload Repair

**Status:** Approved by the operator's 2026-10-04 bug report; local implementation in progress.

## Problem Statement

The listing form returns a signed Storage URL based on the Docker-only `api-gw` address, so the browser cannot upload. The form has no file drop target and can show a failed upload as a completed photo.

## Goals

- [x] Make signed photo uploads reachable from the public listing page.
- [x] Support choosing and dropping photos on listing creation.
- [x] Show a photo as uploaded only after Storage accepts it.

## Out of Scope

| Item | Reason |
| --- | --- |
| New image formats, size limits, or image processing | Existing listing policy remains authoritative. |
| Production deployment or storage schema changes | The project guide authorizes local work and commits only. |

## Assumptions & Open Questions

| Assumption | Decision | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Public Storage path | The site origin routes `/storage/v1/*` to the gateway. | Both Caddy configurations already do this. | repository configuration |
| Upload transport | Use Supabase Storage's signed-upload `PUT` with multipart form data. | Matches the installed Storage SDK. | installed SDK and official docs |

**Open questions:** none for the local fix.

## User Stories

### PHOTO-01: Reachable signed upload

**User Story:** As a seller, I want my browser to send the chosen image to Storage so that the listing can include a real photo.

**Acceptance Criteria:**

1. WHEN an authenticated user requests a valid photo upload intent THEN the API SHALL return a signed Storage upload URL on the site origin while retaining the signed path and token.
2. IF the provider returns a malformed or non-upload signed URL THEN the API SHALL fail without returning a usable upload URL.
3. WHEN Storage accepts a signed `PUT` upload THEN the form SHALL add the returned storage path to the photo list; IF Storage rejects it THEN the form SHALL show an error and SHALL not count that photo as uploaded.

**Independent Test:** Assert internal-to-public URL rewriting, malformed URL rejection, signed upload transport, and success/failure behavior in the browser.

### PHOTO-02: Drop photos on creation

**User Story:** As a seller, I want to drop photo files onto the creation form so that I can upload them without opening the file picker.

**Acceptance Criteria:**

1. WHEN the user drops JPEG, PNG, or WebP files onto the upload area THEN the form SHALL use the same 5 MB and eight-photo limits and upload path as the file picker.
2. WHILE files are being uploaded THEN the form SHALL show a pending state and prevent duplicate upload actions.
3. IF an uploaded file is unsupported or exceeds a limit THEN the form SHALL show an actionable error and SHALL not add it to the photo list.

**Independent Test:** Exercise picker and drag/drop input, pending state, valid upload, and rejection in a browser test.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PHOTO-01 | Reachable signed upload | Execute | Implemented; awaiting independent validation |
| PHOTO-02 | Drop photos on creation | Execute | Implemented; awaiting independent validation |

## Success Criteria

- [x] Focused route, component, and browser tests pass.
- [x] Typecheck, lint, format, and production web build pass.
- [ ] Independent validation records PASS in `validation.md`.
