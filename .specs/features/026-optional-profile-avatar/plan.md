# Optional profile avatar at first access

## Problem

Today, a new CampusMarkt member reaches an account with no photo and sees different letter or icon placeholders across profile, listing, and messaging screens. The existing photo upload is available in account settings, but the confirmation journey never invites the member to use it. The user wants a clear choice to add a photo while setting up the profile or leave it for later, with a recognizable generic avatar in either case. No conversion or support metric was provided.

A member who skips the photo will still appear with a complete, consistent visual identity and can replace it at any time.

## Flow

This feature reuses the existing confirmed-account session, avatar processor, private Storage bucket, and owner-authorized avatar endpoint.

1. Successful email confirmation in `ConfirmView` (exists) links to `SignInForm` (exists) with a safe return path to the account setup view.
2. `SignInForm` (exists) creates the normal session and opens `GET /account?setup=avatar`; `AccountPage` (exists) offers a photo choice and a way to continue without one.
3. Photo selection uses `AvatarManager` (exists), which sends the image to the existing owner-authorized avatar endpoint; the service processes and stores the derivative as it does today.
4. Skipping returns to the normal account view. Every avatar display uses the same local abstract illustration when `avatarUrl` is null, and the existing photo URL when present.
5. Removing a photo through the existing account control returns the same abstract illustration without creating or storing an image file.

## Impact

| Front | What changes |
| --- | --- |
| domain | Existing `avatar fallback` changes from inconsistent initials/neutral icons to one shared abstract illustration in the web interface; consumers that render a missing avatar must use the same rule. |
| stored data | No backfill or schema change. Existing profiles with no avatar immediately receive the visual fallback at render time; uploaded photos and their lifecycle remain unchanged. |
| navigation | The confirmation success link introduces an account setup return path, while the normal sign-in and account routes keep working. |

## Relations

None - no stored-data shape change.

## Surface

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `GET /account?setup=avatar` | optional `setup=avatar` query and existing session cookie | photo choice, generated avatar preview, and skip action | `200` active member; redirect to sign-in without an active confirmed session |

## Landing

None - this changes reversible web navigation and rendering. It adds no persistent schema, external contract, dependency, or new image storage path.

## Criteria

### S1: Offer a photo at first profile access (P1)

A confirmed member can choose a photo immediately after signing in or continue without one.

**Acceptance Criteria**

1. WHEN email confirmation succeeds and the member follows the sign-in action THEN the system SHALL return them to the account avatar setup view after successful sign-in.
2. WHEN a confirmed member opens the avatar setup view THEN the system SHALL show the current avatar preview, a photo selection action, and a "do this later" action without requiring a file.
3. WHEN the member chooses "do this later" THEN the system SHALL open the normal account view without an avatar upload request.
4. WHEN the member submits a valid JPEG, PNG, or WebP image of at most 5 MB from setup THEN the system SHALL use the existing owner-authorized processing path and show the resulting profile photo.
5. IF the upload is invalid or fails THEN the system SHALL retain the current avatar or generic fallback, show an actionable error, and keep the account usable.
6. WHILE no active confirmed session exists, opening the account avatar setup route SHALL redirect to sign-in without exposing owner profile controls.

**Independent test:** Confirm an account, follow its sign-in link, enter the setup view, upload a valid image, and repeat with skip and invalid-image paths.

### S2: Consistent generic avatar (P1)

Every member without a photo gets the same recognizable illustration across the marketplace.

**Acceptance Criteria**

7. WHILE a profile has no uploaded photo, the account, public profile, listing detail, messages, conversation, and blocked-user views SHALL render the same abstract avatar instead of initials or a broken image.
8. WHEN a member reloads a profile with no uploaded photo or changes its display name THEN the system SHALL render the same generic avatar.
9. WHEN a member removes an uploaded photo THEN the system SHALL render that member's generic avatar on subsequent account and public profile views.
10. The system SHALL generate generic avatars locally without storing per-user image objects, calling an external image service, or deriving the artwork from email addresses.
11. WHEN an uploaded avatar URL is present and loads successfully THEN the system SHALL show the uploaded photo rather than the generic avatar.

**Independent test:** Render the same photo-less public ID on each named surface, reload and rename it, then upload and remove a photo.

## Out of scope

| Excluded | Why |
| --- | --- |
| Anonymous photo upload before email confirmation | The existing avatar endpoint requires an active confirmed session; staging anonymous images adds storage and abuse-control behavior beyond this profile setup change. |
| AI-generated portraits or externally hosted avatar services | The user delegated the style choice; local geometric artwork fits the approved identity without cost, network dependency, or implied real identity. |
| Avatar galleries, randomize controls, and new profile fields | The requested choice is upload now or later with an automatic default. |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Point of photo choice | Immediately after email confirmation and sign-in, as the first profile setup view | The existing authenticated upload endpoint can be reused safely; the pre-confirmation form has no owner session; user approved. | y |
| Generic art direction | Calm abstract shapes using CampusMarkt teal, warm neutral, and a small sunny accent | Matches the approved 70/30 identity; the user delegated the visual choice. | y |
| Variant rule | One shared illustration for every profile without a photo | Consistent across all current surfaces without extending messaging or blocking identity contracts. | n |

**Open questions:** none blocking - the shared illustration is the recorded default for the delegated visual choice.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| confirmation success view | next action | AC 1 |
| confirmation success view | empty, loading, error, unauthorised | existing - confirmation flow already handles these states |
| sign-in return path | success destination | AC 1 |
| sign-in return path | loading, error, unauthorised | existing - sign-in flow already handles these states |
| account avatar setup view | no uploaded photo | AC 2, AC 7 |
| account avatar setup view | upload loading and success | AC 4, AC 11 |
| account avatar setup view | upload error | AC 5 |
| account avatar setup view | unauthorised | AC 6 |
| account avatar setup view | density, ordering | AC 2 |
| account avatar setup view | destructive action confirmation | existing - photo removal remains in `AvatarManager` and uses its current action |
| account avatar setup view | skip action | AC 3 |
| public profile, listing detail, messages, conversation, blocked-user views | no photo, photo, and visual consistency | AC 7, AC 8, AC 9, AC 11 |
| public profile, listing detail, messages, conversation, blocked-user views | loading, error, unauthorised | existing - each route retains its current state handling |
| existing avatar API | response shape, error codes, authorization, rate limit | existing - no endpoint signature or policy change |

## Sources

- User request in this task - optional photo during profile setup, later replacement, and automatic generic avatar.
- `DESIGN.md` - approved 70% local and welcoming, 30% young and expressive web direction.
- `.specs/features/002-identity-accounts/spec.md` and `.specs/STATE.md` AD-007 - current owner-authorized avatar and private identity boundaries.
