# CampusMarkt — Product Design

> Documentation images and PDFs were archived outside the repository on 2026-10-17 at the user's request. Historical export names below resolve through the [external artifact inventory](design/EXTERNAL-ARTIFACTS.md); native design sources remain in `design/`.

**Status:** approved design direction. Implementation follows `.specs/features/015-marketplace-visual-system/plan.md`.

## Current curated reference - 2026-10-16

The user approved the design-system proposals and requested a separate approved-only FigCraft reference, then explicitly selected integrated checkout as the main **design** journey. Current source: `design/CampusMarkt-Approved.figcraft`, titled **CampusMarkt — Produto aprovado**, starting at **00 · Comece aqui**. It consolidates A, account B, CM, the university seal, screen flows, system and motion across 24 pages. See `design/APPROVED-PRODUCT.md`. Earlier review/deferral labels below describe exploration history and are superseded by this approval record. Checkout and expanded admin still require approved behavioral implementation specifications; the current V1 runtime boundary has not been changed by design work.

## Redesign direction selected on 2026-10-16

The user selected **A / Local discovery**, the Karrot-inspired proposal in `design/CampusMarkt-Redesign.figcraft`, page `02 · Karrot × Hazaar — visual comparison`. This is the reference for the screen-by-screen redesign: original teal, Inter, rounded item photography, visible search, neighborhood context, category icons and two-column discovery cards at 390px. The Hazaar-inspired editorial proposal B was not selected. Logo exploration was reopened by the design-system request; the new CM proposal awaits review and existing screen logos remain preserved.

Page **21 · CampusMarkt Design System — v1.0** documents preserved decisions and proposes branding, detailed typography, geometry, components and motion. Page 22 contains standard/reduced motion demonstrations. See `design/DESIGN-SYSTEM.md` and `output/pdf/CampusMarkt-Design-System.pdf`. New definitions await review before adoption; feature specifications still govern behavior.

Design the responsive browser screens before implementation. Existing specifications continue to govern product behavior. The two-column mobile arrangement supersedes the older single-column guidance below for redesign proposals; validate narrow widths, long translations and accessibility before implementation. The existing application is not changed by this visual choice.

The navigation refinement on FigCraft page `04 · Navigation refinement — direction A` was also accepted, with extra separation requested between publishing and language. The corrected proposal uses a 48px desktop gap and a 12px mobile vertical gap. Continue subsequent screen designs with this navigation hierarchy; contextual listing actions are under review on page 05.

## Intent

The user visually accepted page 19 Administration and asked to continue. Page 20 now proposes common loading, empty, zero-result, unavailable, offline/retry, photo/upload and unsaved/invalid form states. Keep the accepted Administration direction and private-conversation boundary. `design/REVIEW-HANDOFF.md` consolidates the remaining locale/width/interaction/specification work before coding and final independent validation.

Page 18's help/policies/legal visual unit was accepted. Page 19 now presents the user-requested Administration expansion: conditional account/menu entry, public-record corrections with reason/before-after review, controlled platform settings, staff permissions and activity history, reusing moderation. Private conversations stay excluded. This is a design/scope proposal; existing specs still govern implementation and no broad administrator privileges are implicitly granted.

The user has explicitly accepted the social-style teal university-cap seal on page 15. Keep it as the selected badge, superseding the earlier text pill; account layout B remains selected. Page 16's reporting/blocking direction was accepted, including disabled sending for both sides of a block and a generic notice for the blocked participant. Page 17's moderation workspace is the next proposal for review.

Latest university-badge proposal: the user requested the familiar visual language of social verification with a university cap. Page 15 now replaces the text pill with an original teal scalloped seal and white graduation cap, immediately after the display name. Supporting university text and the badge explanation preserve the limited institutional-email meaning. See `design/UNIVERSITY-VERIFICATION.md` and `design/15-social-university-seal.png`. Account layout B remains selected.

On 2026-10-16 the user selected **account layout alternative B** on FigCraft page 14 as the main desktop/mobile account layout. This is an account-layout refinement within direction A, unrelated to the rejected Hazaar direction B. Preserve the previous account hub only as historical comparison. Page 15's selected university seal supersedes the historical text-pill iterations.

CampusMarkt should feel like a local, trustworthy, welcoming marketplace — neither a corporate storefront nor an Airbnb clone. The previously approved reference is structural: photography first, prominent search, easy-to-scan categories, lightweight cards, and clear actions on listing details. CampusMarkt owns its visual identity, copy, and interactions.

The approved expression is **70% local and welcoming, 30% young and expressive**. Real objects and approximate pickup areas give the interface its local character. Stronger headline typography and brief action feedback add energy. Airbnb remains a reference for information structure, not a source of brand colors, travel controls, or copy.

The product serves all of Braunschweig. University verification is optional and signals trust; it never determines whether someone may browse or negotiate. V1 covers only physical goods with listing types `SELL`, `GIVE_AWAY`, and `WANTED`, in-person pickup, and no platform-held funds.

## Composition principles

1. **Item first:** image, title, price, and pickup area should be understood before secondary metadata.
2. **Honest action:** every CTA must reflect the listing's actual type and state. `WANTED` must not offer purchase; reserved or closed listings must not imply an unavailable action.
3. **Trust without exclusion:** public name, optional university badge, and approximate location help people decide; email addresses and exact addresses stay private.
4. **Local lightness:** near-white canvas, few borders, and subtle elevation. Teal marks decisions rather than decorating the whole screen.
5. **One language across devices:** hierarchy and content remain recognizable as layout changes. Mobile must not be a cut-down interface with essential links hidden.
6. **Real things, real places:** home may feature current listing imagery, but never substitute generated or stock photos for a live listing. Missing photos use explicit text; an empty feed can link to real marketplace filters.

## Proposed identity and tokens

These are semantic colors, not page-specific colors. Implementation should expose them as CSS custom properties; component values should not diverge without a functional reason.

| Token                 | Value     | Use                                  |
| --------------------- | --------- | ------------------------------------ |
| `--color-brand`       | `#0B665E` | Primary CTA, action links, selection |
| `--color-brand-hover` | `#084D47` | CTA hover/pressed                    |
| `--color-brand-soft`  | `#E7F4F0` | Soft selection, trust signal         |
| `--color-ink`         | `#182522` | Headings and primary copy            |
| `--color-muted`       | `#53645F` | Metadata and supporting copy         |
| `--color-canvas`      | `#F7F8F5` | Overall background                   |
| `--color-surface`     | `#FFFFFF` | Cards, forms, panels                 |
| `--color-border`      | `#DDE5DF` | Quiet dividers and outlines          |
| `--color-focus`       | `#9B5A18` | Focus ring, distinct from teal       |
| `--color-danger`      | `#A83232` | Error and destructive actions        |
| `--color-warning`     | `#80520B` | Reserved/caution state               |
| `--color-sun`         | `#E8BB64` | Small local accent, not body text    |

Typography: `Inter` with system fallbacks. Avoid blocking font downloads and proprietary fonts. Type scale: body `16px/1.5`, metadata `14px/1.4`, cards `16px/1.35`, section headings `24–32px/1.15`, main heading `clamp(32px, 4vw, 52px)/1.05`. Use 400 for body text, 600 for labels/actions, and 700 for headings. Do not use all caps as the default hierarchy device.

Spacing follows a 4px base: `4, 8, 12, 16, 24, 32, 48, 64px`. Radii: `8px` on fields/buttons, `16px` on cards/panels, `20px` on primary photography; pills only for filters and compact indicators. Cards have no shadow at rest; a subtle lift is allowed on pointer hover. Content width is at most `1280px`, with side gutters of `16px` on mobile, `24px` on tablet, and `32px` on desktop.

## Visual architecture

### Navigation

- Desktop: CampusMarkt text wordmark, visible search, a prominent create-listing action, links to favorites/messages/account, and language switcher. Use existing destinations. Authentication-dependent destinations must use current sign-in behavior rather than promising anonymous access.
- Mobile: compact header with wordmark and search; bottom navigation for `Explore`, `Search`, `Favorites`, `Messages`, and `Account`. Creating a listing remains discoverable without displacing an essential destination. Bottom navigation must not obscure a CTA, form, keyboard, or the final content.
- `en` is the initial language without a valid cookie; an explicit `de` choice persists, per AD-020. Visible labels and accessible names follow the active locale.

### Discovery (`/` and `/search`)

- Home uses a short promise and functional search in the first viewport. The listing showcase begins early; the hero must not consume nearly the entire screen.
- Home may pair the headline and search with a compact collage of current feed items. The collage links to those listings and names each item's type, title, price or intent, and approximate area. If imagery is missing or fails to load, the tile keeps its text and proportion. If the feed is empty, use type-based browse links without inventing listings.
- Categories are a horizontally navigable strip connected to real filters. `SELL`, `GIVE_AWAY`, and `WANTED` are filters, not separate capabilities invented by the visuals.
- Grid: one column below `640px`, two from `640–1023px`, three from `1024–1279px`, four from `1280px`. Validate these guide values visually with realistic content.
- Search and feed share the same card and filter language. Show active filters and offer a way to clear them. Preserve current URL behavior, ordering, and pagination; the redesign does not change the query.

### Listing card

- Square image (`1:1`), `object-fit: cover`, no distortion. Reserve the aspect ratio before loading. If an image is absent, use a clear local placeholder; photo-less `WANTED` listings receive intentional treatment rather than fake stock photography.
- Favorite is an independent button, separate from the card link, with a touch target of at least `44×44px`. Avoid nesting an interactive button inside a clickable link.
- Visual order: image → title (up to two lines) → price or “Free”/`WANTED` intent → pickup area → seller and optional badge. Type and reserved status are labels, not the dominant information.
- Color must never be the only signifier. Price, type, status, and badge have explicit labels in the active language.

### Listing detail (`/listings/[id]`)

- Desktop: generous gallery above or beside content; title, type, condition, description, approximate pickup area, and seller in a reading column; action panel clearly tied to the listing.
- Mobile: full useful gallery width, information in decision order, and a fixed action bar only where an action is available. Reserve space below content for that bar.
- `SELL`: display price and the purchase-intent, offer, and message actions actually allowed by current state and permissions. `GIVE_AWAY`: show that the item is free and the appropriate interest/message actions. `WANTED`: express the poster's intent and contact path without “Buy.” The owner sees management rather than buyer CTAs. Reserved/closed listings have explicit states; unavailable actions must not appear enabled.
- A university badge indicates only currently valid optional verification; it is not an identity or transaction guarantee. Show the approximate pickup area, never a private address.

### Supporting flows

| Screen                   | Expected structure                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create/edit listing      | Short visual steps or clear sections; fields, help, errors, and media preview use the same scale. Do not change validation or publishing contracts. |
| Favorites                | Reuse the discovery card; empty state explains the situation and links to explore.                                                                  |
| Messages                 | Conversation list and thread clarify sender, time, and state; negotiation events remain distinct from free-form messages.                           |
| Account/profile          | Consistent navigation and forms; avatar and badge never reveal primary or institutional email.                                                      |
| Reservations/my listings | Clear textual state, next action, and history; destructive actions retain existing confirmation.                                                    |
| Moderation               | Favor density, readability, and decision auditability; do not force the consumer photo grid onto an operations queue.                               |

## Components and states

Listing detail uses distinct semantic accents: the approved Available has a white surface, green outline (`#BBDCC7`), green dot with a pale halo and text `#23734A`; Unavailable is gray with a circled minus, while Reserved stays amber. Reporting has a pale rose surface (`#FFF1F2`, text/icon `#B42332`); item condition has its own labeled tint (New violet, Like new cyan, Good blue, Fair amber). Exact pairs and contrast calculations live in `design/LISTING-DETAIL.md`. Mobile detail uses a round-capped Lucide chevron-left inside a 44 px back target. These refinements follow the user's detail-screen feedback and remain static FigCraft designs until implementation is approved.

| Component | Required variants                                                              |
| --------- | ------------------------------------------------------------------------------ |
| Button    | primary, secondary, text, destructive; normal, hover, focus, disabled, pending |
| Field     | persistent label, help, value, focus, error; placeholder is not the only label |
| Filter    | inactive, active, focus, count/removal where applicable                        |
| Card      | photo, no photo, `WANTED`, `GIVE_AWAY`, reserved, optional badge               |
| Feedback  | loading/skeleton, empty, recoverable error, unauthorized where applicable      |

Loading states preserve content geometry. Empty states explain what happened and offer a real next action. Recoverable errors offer retry or safe navigation; a data failure must not masquerade as “no listings.” Action components provide pending feedback and guard against double submission according to existing rules.

## Accessibility and quality

- Meet WCAG 2.1 AA contrast: `4.5:1` for normal text and `3:1` for large text and functional boundaries. Validate actual color combinations, not just palette entries.
- Keep focus visible, tab order logical, touch targets at least `44×44px`, keyboard interaction complete, and no hover-only functionality.
- Respect `prefers-reduced-motion`. Short transitions (`150–200ms`) may clarify state without delaying a task.
- Keep non-user-triggered motion rare. Card hover may scale only the clipped image, never move the whole card; favorite feedback may briefly change scale. Specify transform and opacity transitions, not `transition: all`. Suppress these transforms under `prefers-reduced-motion`.
- Informative images have useful `alt` text; decorative icons are hidden from screen readers. Price, type, status, and action outcomes are expressed in text.
- Check 320px, 390px, tablet, and desktop with long German and English copy. No page-level horizontal overflow, fixed-element overlap, or CTA hidden behind the keyboard.

## Boundaries and adoption

This design system does not authorize new capabilities. Do not create inert navigation or CTAs for `SWAP`, services, housing, jobs, protected payments, shipping, meetup spots, or native apps. “Buy Now” in the reference means the implemented purchase-intent/negotiation flow, not a new checkout or payment system.

Recommended sequence after approval: (1) tokens and responsive shell, (2) home/search/cards/filters, (3) detail and type/state-aware actions, (4) progressive convergence of supporting screens. Reuse current services and contracts. Implementation should visually inspect states, both languages, keyboard, and mobile, alongside existing functional tests.

## Internal sources

- Planning conversation “Planejar marketplace estudantil,” design decisions from 2026-09-27: Airbnb as structural reference, original teal identity, Inter/Geist, photo-led cards, search/categories, action-oriented detail, mobile, DE/EN, and states.
- [`docs/product/00-product-vision.md`](docs/product/00-product-vision.md), [`docs/product/02-mvp-scope.md`](docs/product/02-mvp-scope.md), and [`docs/product/03-marketplace-policy.md`](docs/product/03-marketplace-policy.md): V1 product boundary.
- [`.specs/STATE.md`](.specs/STATE.md): active engineering and experience decisions.
