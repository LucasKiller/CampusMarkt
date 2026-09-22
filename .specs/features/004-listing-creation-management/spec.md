# Listing Creation and Management Specification

**Status:** Draft

## Problem Statement

CampusMarkt users need a trustworthy, structured way to publish and manage physical goods for local exchange in Braunschweig. Without a dedicated listing capability, users cannot advertise items for sale, offer free goods for reuse, or request needed items. The platform must provide an accessible, responsive creation and management experience for `SELL`, `GIVE_AWAY`, and `WANTED` listings with ordered photos, clear categories, and coarse neighborhood pickup zones, while enforcing marketplace policy, item integrity, and seller privacy.

## Goals

- [ ] Allow authenticated registered users to create physical goods listings for `SELL`, `GIVE_AWAY`, and `WANTED` intents.
- [ ] Require at least 1 image (up to 8) for `SELL` and `GIVE_AWAY` listings, while allowing optional images (0 to 8) for `WANTED` listings.
- [ ] Support 7 canonical physical goods categories tailored to student and household goods.
- [ ] Support 10 coarse neighborhood and campus pickup zones in Braunschweig without exposing private home addresses.
- [ ] Enforce price rules: explicit euro cents for `SELL`, strictly zero/null for `GIVE_AWAY`, and optional max budget for `WANTED`.
- [ ] Enable listing owners to edit mutable listing details while keeping `listing_type` immutable after creation.
- [ ] Provide lifecycle state transitions for owners between `ACTIVE`, `RESERVED`, `SOLD`, and soft-delete `ARCHIVED`.
- [ ] Integrate image storage via Supabase Storage (`listing-media`) with owner RLS, cover photo ordering, and orphan cleanup.
- [ ] Display inline guidance for prohibited and unsupported content at creation time.

## Out of Scope

| Feature | Reason |
| --- | --- |
| `SWAP` (barter) listing intent | Deferred capability requiring two-sided matching and withdrawal logic not in V1 scope. |
| Services, housing, and jobs verticals | Unsupported verticals excluded from the physical goods marketplace. |
| Public marketplace feed and search filters | Owned by downstream features `005-marketplace-feed-listing-details` and `006-search-filters`. |
| Structured buyer offers, purchase intents, and chat reservations | Owned by downstream Horizon 4 features (Negotiation and Messaging). |
| Platform-managed online payments, escrow, or shipping | Excluded from V1 in-person local-pickup model. |
| Automatic image background removal or AI auto-tagging | Non-essential complexity; standard image processing suffices for V1. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Publishing state flow | Direct publish to `ACTIVE` upon valid submission | Lean MVP workflow; owners can immediately view, edit, or archive. | yes |
| Image requirements | Conditional: 1–8 images for `SELL`/`GIVE_AWAY`; 0–8 images for `WANTED` | Physical goods offered require visual proof of condition; requests often lack existing photos. | yes |
| Category taxonomy | 7 canonical categories: `furniture`, `electronics`, `books_studies`, `bicycles_mobility`, `clothing`, `home_kitchen`, `other` | Focused on student life and households; strictly physical goods. | yes |
| Pickup zones | 10 coarse Braunschweig zones (e.g. `Innenstadt`, `Campus / TU-Altgebäude`, `Campus Nord`, etc.) | Balances local neighborhood relevance with user privacy (no exact street addresses). | yes |
| Intent mutability | `listing_type` is immutable after creation | Prevents bait-and-switch shifts (e.g., converting a free giveaway into a sale). | yes |
| Owner lifecycle actions | Support `RESERVED`, `SOLD`, and `ARCHIVED` transitions | Enables pickup coordination and completion tracking before automated negotiation is built. | yes |
| Price bounds | Stored as integer cents; min 50 cents (€0.50), max 1,000,000 cents (€10,000.00) for `SELL` | Avoids floating-point errors and protects against absurd inputs. | yes |
| Media technical constraints | Max 8 images, max 5MB per file, JPEG/PNG/WebP, stored in `listing-media` bucket | Balances visual fidelity with mobile bandwidth and storage costs. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Title 5–100 chars, description 10–2000 chars, price in integer cents (€0.50–€10,000.00 for `SELL`, 0 for `GIVE_AWAY`), condition enum (`NEW`, `LIKE_NEW`, `GOOD`, `FAIR`), category enum, pickup area enum. |
| Failure / partial-failure states | Failed image upload aborts listing creation; atomic DB operations prevent orphaned listing records without required images. |
| Idempotency / retry / duplicate handling | Listing creation handles client retry safely with client-provided unique identifiers or idempotent submission guards. |
| Auth boundaries & rate limits | Only authenticated users with active accounts can create/edit listings; non-owners get HTTP 403 on mutation; rate limit creation to max 20 listings/hour per user. |
| Concurrency / ordering | Images maintain deterministic `position` integer (0 = primary cover); state transitions use optimistic concurrency or version checks. |
| Data lifecycle / expiry | Archiving soft-deletes the listing (`status = 'archived'`); cascade deletion purges listings and storage objects when parent account is deleted. |
| Observability | Structured audit events for `listing.created`, `listing.updated`, `listing.status_changed`, and `listing.archived` with listing ID and owner ID (no PII in logs). |
| External-dependency failure | Storage bucket outage returns HTTP 503 with user-friendly retry message; database connection errors return HTTP 500 without leaking stack traces. |
| State-transition integrity | Allowed: `ACTIVE` ↔ `RESERVED`, `ACTIVE` → `SOLD`, `RESERVED` → `SOLD`, any state → `ARCHIVED`. Terminal: `SOLD` and `ARCHIVED` cannot revert to `ACTIVE` without explicit relist rules. |

---

## User Stories

### P1: Create a valid marketplace listing ⭐ MVP

**User Story**: As an authenticated user, I want to create a new `SELL`, `GIVE_AWAY`, or `WANTED` listing with details and photos so that other community members can see what I am offering or seeking.

**Why P1**: Core entrypoint for all marketplace inventory; without creation, the marketplace has no goods.

**Acceptance Criteria**:

1. WHEN an authenticated user submits a valid listing payload with intent `SELL`, valid category, valid pickup area, valid condition, asking price between 50 and 1,000,000 cents, and between 1 and 8 images THEN the system SHALL persist the listing with status `active` and assign the owner's user ID.
2. WHEN an authenticated user submits a valid listing payload with intent `GIVE_AWAY`, valid category, valid pickup area, valid condition, price set to 0 or null, and between 1 and 8 images THEN the system SHALL persist the listing with status `active`.
3. WHEN an authenticated user submits a valid listing payload with intent `WANTED`, valid category, valid pickup area, valid condition, optional max budget, and between 0 and 8 images THEN the system SHALL persist the listing with status `active`.
4. IF a user submits a `SELL` listing with missing, zero, or negative price THEN the system SHALL reject the request with HTTP 400 and an actionable price error message.
5. IF a user submits a `GIVE_AWAY` listing with a non-zero price THEN the system SHALL reject the request with HTTP 400 and an error indicating free goods cannot carry a price.
6. IF a user submits a `SELL` or `GIVE_AWAY` listing without at least 1 image THEN the system SHALL reject the request with HTTP 400 and an error requiring at least one photo.
7. IF an unauthenticated visitor attempts to create a listing THEN the system SHALL reject the request with HTTP 401.
8. The system SHALL display inline guidance on the creation interface highlighting prohibited items (e.g. alcohol, tobacco, weapons, digital goods, services).

---

### P1: Manage and edit an existing listing ⭐ MVP

**User Story**: As a listing owner, I want to view my listing in a management interface and edit its details so that I can keep the information accurate.

**Why P1**: Sellers frequently need to correct typos, adjust prices, add additional photos, or update descriptions.

**Acceptance Criteria**:

1. WHEN the listing owner requests their listing management view THEN the system SHALL return the complete listing details including status, images, category, pickup area, and creation timestamp.
2. WHEN the listing owner submits updated mutable fields (title, description, price, condition, category, pickup area, or images) THEN the system SHALL validate the updates and update the listing record.
3. IF a user attempts to modify the `listing_type` of an existing listing THEN the system SHALL reject the modification with HTTP 400 and an error stating listing intent cannot be changed.
4. IF an authenticated user attempts to edit a listing owned by another user THEN the system SHALL reject the request with HTTP 403 Forbidden.
5. IF the owner submits updates that violate field bounds (e.g. title < 5 chars, description < 10 chars, or price <= 0 for `SELL`) THEN the system SHALL reject the update with HTTP 400 and validation errors.

---

### P1: Transition listing lifecycle states ⭐ MVP

**User Story**: As a listing owner, I want to update my listing status to reserved, sold, or archived so that prospective buyers know its current availability.

**Why P1**: Essential coordination mechanism to mark items on hold during meetup arrangements or close completed transactions.

**Acceptance Criteria**:

1. WHILE a listing is in `active` status, WHEN the owner triggers a reserve action THEN the system SHALL transition the listing status to `reserved`.
2. WHILE a listing is in `reserved` status, WHEN the owner triggers an unreserve action THEN the system SHALL transition the listing status back to `active`.
3. WHILE a listing is in `active` or `reserved` status, WHEN the owner marks the item as sold/completed THEN the system SHALL transition the listing status to `sold`.
4. WHEN the listing owner triggers an archive action on their listing in any active, reserved, or sold state THEN the system SHALL transition the listing status to `archived`.
5. IF a user attempts an invalid status transition (such as transitioning directly from `sold` to `reserved`) THEN the system SHALL reject the transition with HTTP 409 Conflict.
6. IF a non-owner attempts to transition the status of a listing THEN the system SHALL reject the request with HTTP 403 Forbidden.

---

### P2: Upload and organize listing media

**User Story**: As a seller, I want to upload up to 8 photos, set a primary cover photo, and remove photos so that my item is showcased clearly.

**Why P2**: High-quality visual presentation directly impacts buyer trust and local transaction speed.

**Acceptance Criteria**:

1. WHEN an authenticated user uploads an image file within 5MB in JPEG, PNG, or WebP format THEN the system SHALL store the file in the `listing-media` bucket and return a permanent reference path.
2. IF an uploaded image exceeds 5MB or has an unsupported MIME type THEN the system SHALL reject the upload with HTTP 400 and an informative error message.
3. The system SHALL store images with an explicit `position` index (0 to 7) where index 0 designates the primary cover image.
4. WHEN an owner removes an image from an active listing THEN the system SHALL remove the image reference and delete the corresponding storage object.
5. WHERE a parent account is deleted, the system SHALL cascade delete all owned listings and associated listing media records.

---

## Edge Cases

1. **Concurrent edit and status transition**: When an owner edits a listing while transitioning status, optimistic locking prevents dirty overwrites.
2. **Account deletion cascade**: Deleting an account removes all owned listings and unlinks storage references immediately.
3. **Max image boundary**: Uploading an 8th image succeeds; attempting to add a 9th image is rejected with HTTP 400.
4. **Boundary price inputs**: Minimum allowed price is €0.50 (50 cents); maximum allowed price is €10,000.00 (1,000,000 cents); inputs outside this range fail validation.
5. **Whitespace-only titles or descriptions**: Titles and descriptions with only whitespace or below character minimums after trimming are rejected.
6. **XSS and script injection**: All text inputs (title, description) are sanitized and stripped of HTML/script execution tags before storage and rendering.
7. **Storage upload failure mid-creation**: If media upload fails, no partial listing row is created in the database.
8. **Unverified user listing creation**: A registered user without university verification can create listings with standard functionality; their listings do not display a university badge.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| LIST-01 | Create listing with validated intent, pricing, and images | P1: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8 | Domain / API / UI | pending |
| LIST-02 | Manage and edit listing details with intent immutability | P1: AC1, AC2, AC3, AC4, AC5 | Application / API / UI | pending |
| LIST-03 | Transition listing lifecycle states (active, reserved, sold, archived) | P1: AC1, AC2, AC3, AC4, AC5, AC6 | Domain / DB RPC / UI | pending |
| LIST-04 | Media upload, positioning, cover selection, and cascade cleanup | P2: AC1, AC2, AC3, AC4, AC5 | Storage / API / UI | pending |
| LIST-05 | Prohibited content guidance and boundary sanitization | P1: AC8, Edge cases 5, 6 | Validation / UI | pending |
