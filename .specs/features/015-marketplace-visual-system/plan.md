# 015 — Marketplace visual system

## Problem

CampusMarkt already provides discovery, search, listings, and interaction, but its screens use different visual foundations: home combines a cream/green canvas with a tall hero, while search, cards, and filters use white/slate and inline styles. This weakens a recognizable identity and makes actions and states harder to understand on mobile. The reference conversation settled on a search- and photo-led experience with an original teal identity; it provided no conversion or usability metrics.

When this improvement ships, a visitor should recognize the same language on home, search, listing cards, and detail, and identify the action available for each listing type and state without lengthy instructions.

## Flow

Reuse the existing feed, search, detail, favorites, negotiation, and localization; this feature changes presentation, not business rules.

1. Entry at `/` or `/search` → `apps/web/src/app/page.tsx` and `apps/web/src/app/search/page.tsx` (exists) display the shell, search, categories, and filters → existing discovery components receive the same data.
2. `apps/web/src/components/marketplace/feed.tsx` and `apps/web/src/components/marketplace/marketplace-feed.tsx` (exists) display consistent cards while preserving navigation, filters, favorites, and pagination.
3. Listing selection → `apps/web/src/app/listings/[id]/page.tsx` (exists) displays media, information, and existing actions according to type, state, and permission → current negotiation/messaging flows still own mutations.
4. `apps/web/src/app/globals.css` (exists) provides tokens and responsive patterns across surfaces; existing dictionaries provide `en`/`de` copy.

## Impact

| Front | What changes |
| --- | --- |
| UI | Home, search, cards/filters, and detail adopt one hierarchy, token set, and mobile behavior. |
| domain | No business term or rule changes; `SELL`, `GIVE_AWAY`, `WANTED`, `reserved`, and badge retain their current meanings. |
| stored data | Nothing to migrate. |
| consumers | URLs, query parameters, services, APIs, and data contracts remain stable. |

## Relations

None - no stored-data shape change.

## Surface

None - no route or externally consumed signature changes.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Visual identity future screens will copy | `DESIGN.md`: teal `#0B665E`, canvas `#F7F8F5`, Inter/fallback, `1:1` photography, semantic tokens, and state rules | Copy Airbnb's coral, font, and component terminology; they would not represent CampusMarkt's local identity and would depend visually on another brand. |

This decision reaches future screens and will be recorded as active in `.specs/STATE.md` during implementation.

## Criteria

### S1: Recognizable identity and responsive navigation (P1)

Visitors find search and primary destinations without losing context across viewports.

**Acceptance Criteria**

1. WHEN a visitor opens `/` or `/search` THEN the system SHALL show CampusMarkt identity using the semantic color, type, spacing, and focus tokens in `DESIGN.md`.
2. WHEN a visitor opens home at a 390px viewport THEN the system SHALL show access to search in the first viewport and make the start of the listing showcase reachable without a full-screen hero.
3. WHILE the viewport is at most 639px wide THEN the system SHALL provide navigation to explore, search, favorites, messages, and account without horizontal page overflow or covering the final content.
4. WHILE no valid locale cookie exists THEN the system SHALL show new navigation labels in English; with a `de` cookie, the system SHALL show them in German.

**Independent test:** navigate home and search at 390px and 1440px, switch `en`/`de`, and use a keyboard.

### S2: Coherent discovery (P1)

Cards, filters, and results should be read the same way on home and search.

**Acceptance Criteria**

5. WHEN feed or search returns listings THEN the system SHALL render undistorted `1:1` images and cards with title, price/intent, pickup area, type, and textual status where applicable.
6. IF a listing has no photo THEN the system SHALL show a type-appropriate textual placeholder without a fictional image or broken card proportion.
7. WHEN a visitor activates or clears a category, type, or area THEN the system SHALL preserve existing filter and pagination behavior and visually reflect active filters.
8. IF search or feed returns no listings THEN the system SHALL show an empty state with an explanation and a valid explore or clear-filters action.
9. IF loading results fails THEN the system SHALL present an error distinguishable from the empty state, with a recovery action.

**Independent test:** use results with and without photos, change filters, and force empty and failure responses.

### S3: Listing detail and safe decisions (P1)

Visitors understand a listing and see only actions allowed by the existing flow.

**Acceptance Criteria**

10. WHEN a visitor opens an active listing THEN the system SHALL display gallery, title, price or intent, description, approximate area, seller, and optional badge without showing an email or private address.
11. WHILE a listing is `WANTED` THEN the system SHALL omit purchase CTAs and show only contact actions allowed by its current state and permission.
12. WHILE a listing is reserved, closed, or owned by the signed-in visitor THEN the system SHALL not present a buyer CTA as available.
13. WHILE negotiation or messaging CTAs exist on a mobile viewport THEN the system SHALL keep them reachable without covering content or bottom navigation.
14. IF listing detail cannot load THEN the system SHALL show an error or unavailable state with a safe return route, not an empty purchase panel.

**Independent test:** open `SELL`, `GIVE_AWAY`, `WANTED`, reserved, and owned listings on desktop/mobile; test keyboard and long copy.

## Out of scope

| Excluded | Why |
| --- | --- |
| `SWAP`, services, housing, jobs, shipping, and meetup spots | Future capabilities without approved V1 specs. |
| Checkout, protected payment, and custody | V1 uses in-person pickup and out-of-platform payment. |
| PWA and native app | Later roadmap; this mobile navigation is responsive web. |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| First adoption scope | Home, search, cards/filters, and detail; supporting screens follow the guide and migrate in later slices | These are the main user journey and the largest current inconsistency; this avoids a sweeping visual change that might break sensitive flows | y |
| Wordmark | Keep “CampusMarkt” as text rather than creating a graphic logo in this feature | The code has a text wordmark and no approved graphic mark | y |
| Private destinations on mobile | Reuse current sign-in handling for favorites, messages, and account | Access policy and flow remain unchanged | y |

**Open questions:** none - defaults above were approved with this plan.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `/` | empty, loading, error | AC 8, AC 9; loading uses existing feed behavior |
| screen `/` | density and ordering | AC 2, AC 5 |
| screen `/` | unauthorized and destructive action | n/a - browsing is public and no destructive action is added |
| screen `/search` | empty, loading, error | AC 8, AC 9; loading uses existing search behavior |
| screen `/search` | density and ordering | AC 5, AC 7 |
| screen `/search` | unauthorized and destructive action | n/a - searching is public and no destructive action is added |
| screen `/listings/[id]` | empty/unavailable, loading, error | AC 14; loading uses existing route behavior |
| screen `/listings/[id]` | density and ordering | AC 10, AC 13 |
| screen `/listings/[id]` | unauthorized and destructive action | AC 11, AC 12; n/a - no destructive action is added |
| document `DESIGN.md` | structure, tone, depth, and next action | design tokens, page anatomy, states, and implementation order in `DESIGN.md` |
| design token collection | grouping, naming, ordering, duplicates, and exceptions | semantic token table in `DESIGN.md`; exceptions require a functional reason |

## Sources

- “Planejar marketplace estudantil” conversation, design decisions from 2026-09-27 — structural Airbnb reference, original teal brand, photos/search/categories/detail/mobile/DE-EN.
- `docs/product/00-product-vision.md`, `docs/product/02-mvp-scope.md`, `docs/product/03-marketplace-policy.md` — V1 product boundary.
- `.specs/STATE.md` — AD-005 (no speculative UI) and AD-020 (English initial locale).
