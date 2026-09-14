# CampusMarkt V1 Scope

## Scope Statement

CampusMarkt V1 is a responsive German-and-English web marketplace for physical goods in Braunschweig. Visitors can discover public listings. Registered users can publish, save, negotiate, message, report, and complete local pickup. University verification is optional.

V1 proves one thing: people in the Braunschweig student community will use a focused product to transfer useful physical goods locally.

## Included Capabilities

### Identity and profiles

- Email-based registration, sign-in, sign-out, session handling, and account recovery.
- Public display identity without exposing private account email.
- A profile view with the user's active listings and current verification badge, when present.
- Ownership and authorization enforced at the server and data boundary.

Exact sign-in methods, profile fields, account deletion, retention, abuse controls, and session rules belong to the identity feature spec.

### Optional university verification

- Separate institutional email used only for verification.
- TU Braunschweig as the first supported university.
- Verification message and confirmation flow.
- Visible current verification badge without exposing the institutional address.
- Uniqueness protection so one institutional email cannot verify multiple active accounts.
- Expiry and reverification, with a 12-month period as the current product direction.
- No loss of ordinary marketplace access when verification is missing, revoked, or expired.

### Goods listings

- `SELL`, `GIVE_AWAY`, and `WANTED` listing types.
- Draft, publish, edit, archive, and permitted status transitions.
- Title, description, category, pickup area, and ordered images.
- Exact euro price for `SELL`; no price for `GIVE_AWAY`.
- A budget field for `WANTED` only if the listing spec explicitly approves its semantics.
- Mobile-browser creation and management flows.

### Discovery

- Feed of active public listings, initially ordered by recency.
- Listing detail page.
- Text search.
- Category, listing-type, pickup-area, and availability filters where approved.
- Clear free, wanted, available, and reserved labels.
- No opaque personalized ranking in V1.

### Structured negotiation and reservations

- Purchase intent at the asking price for `SELL` listings.
- Structured monetary offers and counteroffers for `SELL` listings.
- Interest or availability response appropriate to `GIVE_AWAY` and `WANTED` listings.
- Seller or listing-owner acceptance and decline actions.
- One active reservation per listing, created atomically from an accepted interaction.
- Visible reserved status instead of silently removing the listing.
- Authorized cancellation and completion actions.

Offer expiry, reservation timeout, no-show handling, and exact transition guards must be specified before those features are implemented.

### Messaging

- Private conversation between authorized marketplace participants.
- Text messages used for questions and pickup coordination.
- Clear separation between chat and structured offer, reservation, and completion state.
- Realtime delivery where it materially improves the experience.
- Blocking integration where its own feature defines the behavior.

### Favorites

- Registered users can privately save and remove active listings.
- Favorites do not reserve an item or notify the owner unless a later approved feature says so.

### Local pickup and completion

- Participants arrange pickup through private messaging.
- Product guidance recommends busy public locations and inspection before payment.
- V1 can record that participants completed or cancelled the handover according to the reservation spec.
- Payment occurs outside CampusMarkt. V1 does not process, secure, hold, release, or refund funds.

### Trust and safety

- Report a listing or user with a structured reason.
- Prevent prohibited and unsupported content from being treated as valid marketplace categories.
- Basic moderator review and documented actions.
- Blocking where explicitly specified.
- Safe-meeting, privacy, and fraud-avoidance guidance.
- Auditability for privileged moderation actions.

### Platform quality

- Responsive behavior for current mobile and desktop browsers chosen by the web-foundation spec.
- German and English user-facing content.
- Accessible core journeys, including keyboard use, labels, focus, contrast, and alternative text requirements defined per feature.
- Requirement-linked automated tests for domain, authorization, data access, and user-critical routes.
- Privacy-aware logging without private message bodies, raw institutional emails, secrets, or precise pickup addresses in ordinary telemetry.

## Deferred Beyond V1

These capabilities are wanted, but require later specifications and evidence:

- `SWAP` listings.
- Moving-out multi-listing and bundles.
- CampusMarkt Meetup Spots.
- Protected online payment, KYC, payouts, refunds, chargebacks, and disputes.
- QR and numeric handover confirmation.
- Shipping and delivery.
- Services, housing, and jobs verticals.
- PWA installation and offline-specific behavior beyond baseline responsive web.
- Native Expo/React Native applications.
- Additional universities and cities beyond an evidence-led expansion.
- Reputation, ratings, or reviews.

Deferred capabilities do not appear as dead navigation, disabled categories, placeholder endpoints, unused database objects, or future enum values in V1.

## Explicitly Excluded from the Current Product Direction

- Platform-operated custody or unlicensed escrow.
- Auctions.
- Advertising.
- Paid subscriptions.
- Algorithmic or AI recommendations.
- Social feeds and unrelated community features.
- Continuous location tracking.
- National marketplace expansion before local liquidity is proven.
- Digital goods, software keys, accounts, tickets, and rentals under the V1 goods model.

An excluded idea needs a new product decision before it can enter the roadmap.

## V1 Feature Sequence

Each line is a separate TLC feature. Numbers communicate intended order, not permission to pre-create empty feature folders.

| Order | Feature | Independently demonstrable outcome |
| --- | --- | --- |
| 001 | Web and Supabase foundation | Local web, database, auth, storage, quality gates, and environment contract run reproducibly. |
| 002 | Identity and accounts | A user can register, sign in, recover access, sign out, and maintain a private-safe profile. |
| 003 | University verification | A user can verify a TU Braunschweig address and display a current badge without exposing that address. |
| 004 | Listing creation and management | A user can create and manage a valid `SELL`, `GIVE_AWAY`, or `WANTED` listing with images. |
| 005 | Marketplace feed and listing details | Visitors can browse current listings and understand type, status, owner, and pickup area. |
| 006 | Search and filters | Visitors can find relevant goods through text and approved filters. |
| 007 | Favorites | A registered user can privately save and unsave listings. |
| 008 | Purchase intent, offers, and reservations | Users can negotiate through explicit states and reserve one listing atomically. |
| 009 | Messaging | Participants can coordinate privately without replacing structured marketplace actions. |
| 010 | Pickup completion | Authorized participants can complete or cancel the local exchange. |
| 011 | Reporting and blocking | Users can report unsafe content or accounts and apply approved blocking behavior. |
| 012 | Moderation | Authorized moderators can review cases and apply auditable policy actions. |
| 013 | Localization and launch hardening | German and English journeys, accessibility, security, and beta-readiness gates pass. |

The exact boundary can be refined before each feature starts. A change that alters observable behavior must be reflected in the product docs and approved feature spec.

## V1 Completion Conditions

V1 is ready for private beta only when:

- All P1 feature acceptance criteria are independently verified.
- Visitors and registered users can complete their permitted end-to-end journeys on mobile and desktop browsers.
- Authorization and ownership tests cover every mutation route.
- RLS and grants are tested for anonymous, authenticated owner, authenticated non-owner, and moderator access where applicable.
- Listing, offer, and reservation transitions reject invalid or concurrent outcomes.
- Private emails, private messages, and precise pickup details do not leak through public APIs or pages.
- Reporting and basic moderation work before public acquisition begins.
- Marketplace policy and safe-meeting guidance are visible at the point they matter.
- German and English core journeys are complete.
- No deferred capability is reachable or represented by unused production code.
- Numeric beta targets for supply, demand, liquidity, completion, safety, and retention are approved.

## Scope Change Rule

New ideas are recorded in the relevant product document. They enter V1 only after the product owner explicitly changes this scope and the affected feature specifications, design, tasks, and tests are reconciled.
