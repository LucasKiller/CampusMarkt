# Private Favorites Specification

**Status:** Draft

## Problem Statement

CampusMarkt visitors and registered users need a convenient, reliable, and private way to save listings they are considering, compare options over time, and revisit saved items without losing them in a dynamic marketplace feed. Without favorites, users must rely on external browser bookmarks or repetitive searches. At the same time, marketplace trust and user privacy require that saved items remain completely private—without public like counts, follower feeds, or artificial seller hype—and that users cannot favorite their own listings to manipulate interest.

## Goals

- [ ] Allow authenticated registered users to privately save (favorite) and remove (unfavorite) active and reserved listings.
- [ ] Prevent users from favoriting their own listings (Marketplace Invariant 2).
- [ ] Provide an authenticated micro-endpoint (`GET /api/marketplace/favorites/ids`) to hydrate user favorite states across edge-cached public feed and search listings without cache invalidation storms (AD-012).
- [ ] Provide an accessible, optimistic heart toggle button on listing cards and details views with appropriate `aria-pressed` state and login redirection for visitors.
- [ ] Provide a dedicated, responsive favorites dashboard ("Merkliste" `/favorites`) displaying saved listings sorted by save date, including visual status badges for `reserved` and `sold` items.
- [ ] Enforce database-level data minimization: favorites table stores only `(user_id, listing_id, created_at)` with owner-only RLS policies.
- [ ] Automatically prune favorite associations when listings or user accounts are deleted via PostgreSQL cascading foreign keys (`ON DELETE CASCADE`).
- [ ] Rate-limit favorite toggling at the application service boundary (max 30 toggles per minute per user) to prevent automation abuse.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Public favorite counts or like tallies | Explicitly prohibited by V1 privacy policy and domain model to prevent artificial hype and social pressure. |
| Seller notifications when a listing is favorited | V1 favorites are passive and private; notifications are deferred to future notification infrastructure. |
| Auto-reserving items upon favoriting | Invariant: favorites have zero effect on listing availability or reservation state. |
| Custom favorite folders or tags | Deferred capability for future advanced buyer features. |
| Price drop alert emails | Out of scope for V1; requires background notification worker queue. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| State hydration architecture | Decoupled client hydration via `GET /api/marketplace/favorites/ids` | The Jury verdict (AD-012): preserves 100% public edge-caching (`s-maxage=30`) for discovery feed and search RPCs on the single budget VPS. | yes |
| Storage data model | `marketplace.favorites` with composite primary key `(user_id, listing_id)` | Enforces natural 1:1 uniqueness per user-listing pair; zero duplicate entries. | yes |
| Self-favorite policy | Rejects toggling favorite on own listing with HTTP 400 (`CANNOT_FAVORITE_OWN_LISTING`) | Enforces Marketplace Invariant 2: prevents self-directed manipulation. | yes |
| Visibility of non-active favorited items | `reserved` and `sold` items remain in `/favorites` with status chips; `archived` items are excluded | Allows buyers to track items they were watching while clearly communicating unavailability. | yes |
| Guest user behavior | Clicking favorite redirects to `/login?next=...` | Clear signpost into account registration/authentication without broken actions. | yes |
| Toggle rate limiting | Max 30 toggles per minute per user | Protects database RPC from rapid script abuse while permitting normal manual browsing. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Target `listingId` must be a valid UUID; pagination cursor must be an ISO 8601 timestamp string; limit capped between 1 and 50. |
| Failure / partial-failure states | If a target listing does not exist, return HTTP 404 (`LISTING_NOT_FOUND`); if user attempts to favorite their own listing, return HTTP 400 (`INVALID_OPERATION`). |
| Idempotency / retry handling | Favorite toggle is idempotent: toggling returns the updated state (`isFavorited: boolean`); concurrent identical toggle calls safely resolve without primary key collisions. |
| Auth boundaries & rate limits | All favorite mutations and dashboard queries require valid session cookies; public requests are rejected with HTTP 401; toggling rate-limited to 30 req/min per user. |
| Concurrency / ordering | B-tree index on `(user_id, created_at DESC)` ensures deterministic, fast retrieval of a user's favorites in chronological order. |
| Data lifecycle & cascades | Foreign keys reference `auth.users(id) ON DELETE CASCADE` and `marketplace.listings(id) ON DELETE CASCADE`; deleting a user or listing cleanly cascades without orphan records. |
| Observability | Structured telemetry logs for favorite operations (`favorite.toggled`, `favorite.removed`, `action`, `listingId`) without logging visitor IP or PII. |
| Security & privacy boundary | RLS policy strictly restricts `SELECT`, `INSERT`, and `DELETE` on `marketplace.favorites` to `auth.uid() = user_id`; no user can inspect another user's favorites. |

---

## User Stories

### P1: Privately save and unsave listings ⭐ MVP

**User Story**: As an authenticated registered user, I want to click a heart button on any listing card or details page so that I can privately bookmark items of interest without altering their availability.

**Why P1**: Core buyer retention and discovery feature enabling comparison and delayed decision-making.

**Acceptance Criteria**:

1. WHEN an authenticated user clicks the favorite button on an active listing they do not own THEN the system SHALL save the listing to the user's favorites and set `isFavorited` to `true`.
2. WHEN an authenticated user clicks the favorite button on an already favorited listing THEN the system SHALL remove the listing from the user's favorites and set `isFavorited` to `false`.
3. IF an authenticated user attempts to favorite a listing they own THEN the system SHALL reject the operation with HTTP 400 and code `CANNOT_FAVORITE_OWN_LISTING`.
4. IF an unauthenticated visitor clicks the favorite button THEN the system SHALL redirect the visitor to the login page with the current URL as the `next` parameter.
5. WHEN an authenticated user toggles a favorite THEN the system SHALL update the UI optimistically within 50ms and synchronize the client's favorite ID cache.
6. The system SHALL exclude all primary account emails, institutional emails, and internal identity hashes from favorite API responses.

---

### P1: Client hydration across feed and search ⭐ MVP

**User Story**: As an authenticated user browsing the marketplace feed or search results, I want listings I previously favorited to display an active heart icon immediately so that I know which items are already saved.

**Why P1**: Consistency across browsing surfaces without breaking edge caching (AD-012).

**Acceptance Criteria**:

1. WHEN an authenticated user loads any marketplace page THEN the client application SHALL fetch the user's active favorited listing IDs via `GET /api/marketplace/favorites/ids`.
2. WHILE the favorite ID set is hydrating, the system SHALL render a neutral accessible favorite button placeholder without layout shift.
3. WHEN the favorite ID set completes loading THEN the system SHALL mark all visible listing cards matching the IDs as favorited with `aria-pressed="true"`.
4. WHEN a user toggles a favorite in any view THEN the system SHALL broadcast the updated state to all open tabs and components displaying that listing.

---

### P1: Dedicated favorites dashboard ("Merkliste") ⭐ MVP

**User Story**: As an authenticated user, I want to visit `/favorites` so that I can review all listings I have saved in one place, see their current status, and jump directly to their details.

**Why P1**: Central hub for users to inspect their shortlisted items and initiate pickup negotiations.

**Acceptance Criteria**:

1. WHEN an authenticated user visits `/favorites` THEN the system SHALL display a responsive grid of their saved listings ordered by `created_at DESC`.
2. IF a favorited listing has status `reserved` THEN the system SHALL display the listing card with an amber "RESERVIERT" badge.
3. IF a favorited listing has status `sold` THEN the system SHALL display the listing card with a neutral "VERKAUFT" badge.
4. WHEN a user clicks the remove action on an item in `/favorites` THEN the system SHALL remove the item from the list and show an undo notification.
5. IF a user has no saved listings THEN the system SHALL render an accessible empty state with a call-to-action button linking to the discovery feed (`/feed`).
6. IF an unauthenticated visitor attempts to access `/favorites` THEN the system SHALL redirect them to `/login?next=/favorites`.

---

### P1: Database integrity and cascading lifecycle ⭐ MVP

**User Story**: As a platform operator, I want favorites data to be strictly bound to user and listing lifecycles so that no orphan records or privacy leaks occur.

**Why P1**: Prevents database bloat, dead references, and GDPR non-compliance upon account deletion.

**Acceptance Criteria**:

1. The system SHALL enforce Row-Level Security on `marketplace.favorites` so that users can only select, insert, or delete rows where `user_id = auth.uid()`.
2. WHEN a listing is deleted THEN the system SHALL automatically delete all associated favorite records via foreign key cascade (`ON DELETE CASCADE`).
3. WHEN a user account is deleted THEN the system SHALL automatically delete all associated favorite records via foreign key cascade (`ON DELETE CASCADE`).
4. IF a seller archives or soft-deletes a listing THEN the system SHALL exclude that listing from `GET /api/marketplace/favorites` query results.

---

## Edge Cases

1. **Rapid double-clicking**: Rapidly clicking the favorite button debounces network calls or safely resolves idempotently in PostgreSQL without throwing duplicate key errors.
2. **Favorited item deleted by owner while user is browsing**: If a user navigates to `/favorites` or clicks into an item that was deleted, the system gracefully handles the missing record and prunes the stale ID.
3. **Session expiration during toggle**: If an authenticated session expires while the user is browsing, a favorite toggle attempt returns HTTP 401 and prompts the user to re-authenticate.
4. **Offline toggle attempt**: If the device loses internet connectivity, the optimistic UI reverts to the previous state with an error toast ("Keine Internetverbindung").
5. **Listing marked sold then un-favorited**: A user can freely un-favorite a sold or reserved listing to clean up their Merkliste.
6. **Large favorite volume**: Keyset pagination with cursor `(created_at, id)` guarantees O(1) performance even if a user saves hundreds of items over time.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| FAV-01 | Private listing favorite toggle (save & remove) with self-favorite prohibition | P1 Story 1: AC1, AC2, AC3, AC4, AC5, AC6 | Database RPC / API | verified |
| FAV-02 | Client-side favorite IDs retrieval and state hydration (AD-012) | P1 Story 2: AC1, AC2, AC3, AC4 | API / Web Client | verified |
| FAV-03 | Dedicated favorites dashboard ("Merkliste" `/favorites`) with status chips | P1 Story 3: AC1, AC2, AC3, AC4, AC5, AC6 | UI Pages / Components | verified |
| FAV-04 | Database integrity, RLS policies, and cascading lifecycle | P1 Story 4: AC1, AC2, AC3, AC4 | PostgreSQL / Migrations | verified |
| FAV-05 | Public boundary security, data minimization, and rate limiting | P1 Story 1: AC6, Edge cases 1, 3 | Application / Security | verified |
