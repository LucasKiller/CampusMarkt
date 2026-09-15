# Identity and Accounts Context

**Gathered:** 2026-09-15
**Spec:** `.specs/features/002-identity-accounts/spec.md`
**Status:** Approved and ready for design

---

## Feature Boundary

This feature delivers primary-email registration, confirmation, password sign-in, recovery, sessions, sign-out, account deletion, and a privacy-safe public profile with an optional avatar. It does not implement university verification, listings, social login, moderation, or deployment.

---

## Implementation Decisions

### Registration and access

- V1 uses a primary email and password; magic links, phone auth, and social providers are deferred.
- Primary-email confirmation is required before authenticated marketplace participation. Unauthenticated browsing remains available.
- Passwords require 10-128 characters and must support paste and password managers.
- Confirmation and recovery links are one-time and expire; recovery expires after 30 minutes.
- Registration, sign-in, recovery, and resend responses must not reveal whether an email already has an account.

### Public identity

- Every account owns exactly one public profile.
- The only initial text identity is a required, non-unique display name of 2-50 characters.
- Public profile URLs use an opaque identifier; usernames are deferred.
- Public profile data is limited to the opaque ID, display name, join month/year, optional processed avatar, and later feature-owned additions.
- Primary email and authentication data are never public.

### Avatar

- Avatar is optional; the fallback is initials or a neutral icon.
- Accept JPEG, PNG, or WebP input up to 5 MB and reject SVG, GIF, mismatched content, and malformed images.
- Apply a user-selected square crop, generate one 512x512 WebP public derivative, and remove metadata.
- Only the owner may upload, replace, or remove an avatar. The original upload is not public.
- A failed replacement preserves the previous avatar; successful replacement cleans up the prior object and its private source upload.
- Account deletion includes avatar cleanup. Avatar reporting belongs to feature 011 before public launch.

### Sessions and recovery

- Browser sessions persist across restarts for no more than 30 days.
- Browser authentication material uses secure server-managed cookies and never `localStorage`.
- Normal sign-out ends the current session; account settings also provide sign-out from all devices.
- Password reset and account deletion revoke all sessions.
- Private routes preserve the intended safe local destination through sign-in.

### Abuse controls and privacy

- Login allows 10 failed attempts per normalized identity in 15 minutes.
- Registration, recovery, and confirmation resend allow 3 requests per normalized identity per hour.
- IP-level ceilings also protect shared endpoints without exposing the account's existence.
- Rate-limited responses identify when retry is allowed.
- Security events contain an internal subject identifier, event type, outcome, and time, never passwords, tokens, or full emails.
- Authorization data is server-controlled and never derived from editable profile metadata.

### Account lifecycle

- Registration requires current Terms and Privacy Policy acceptance with server-recorded versions and timestamp.
- V1 is limited to users who declare that they are at least 18; date of birth is not collected.
- Account deletion requires recent authentication and explicit confirmation.
- Deletion immediately revokes sessions and removes the public profile from view.
- Identity-owned data and avatar objects are purged within 30 days.
- Retention for future listings, conversations, transactions, reports, or legal duties is owned by those later feature specifications.
- The age rule and legal copy require legal review before public launch.

### Agent's Discretion

- Exact visual layout, wording, focus behavior, and loading presentation may follow the existing responsive shell while meeting accessibility and privacy requirements.
- Exact IP fingerprinting, storage object naming, cache versioning, and retry scheduling may be selected during design, provided the observable limits and cleanup guarantees remain intact.

### Declined / Undiscussed Gray Areas → Assumptions

- Confirmation links expire after 24 hours; the user approved expiry but did not choose the duration.
- After the deletion purge completes, the same email may create a new unrelated account; identity continuity is not restored.
- Display-name edits use last-successful-write ordering; avatar replacements require version-aware cleanup because they affect stored objects.
- Initial copy is English-first; complete German/English localization remains feature 013.

---

## Specific References

No external product reference was requested. The experience should remain simple, responsive, privacy-first, and consistent with the existing CampusMarkt shell.

---

## Deferred Ideas

- Magic-link, Google, Apple, passkey, MFA, and phone authentication.
- Public username, bio, and profile customization beyond display name and avatar.
- Changing the primary account email.
- University verification and badge behavior (feature 003).
- Profile listings (feature 004/005), account reporting and blocking (feature 011), and moderator actions (feature 012).
