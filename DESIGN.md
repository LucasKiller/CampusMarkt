# CampusMarkt — Product Design

**Status:** approved design direction. Implementation follows `.specs/features/015-marketplace-visual-system/plan.md`.

## Intent

CampusMarkt should feel like a local, trustworthy, welcoming marketplace — neither a corporate storefront nor an Airbnb clone. The previously approved reference is structural: photography first, prominent search, easy-to-scan categories, lightweight cards, and clear actions on listing details. CampusMarkt owns its visual identity, copy, and interactions.

The product serves all of Braunschweig. University verification is optional and signals trust; it never determines whether someone may browse or negotiate. V1 covers only physical goods with listing types `SELL`, `GIVE_AWAY`, and `WANTED`, in-person pickup, and no platform-held funds.

## Composition principles

1. **Item first:** image, title, price, and pickup area should be understood before secondary metadata.
2. **Honest action:** every CTA must reflect the listing's actual type and state. `WANTED` must not offer purchase; reserved or closed listings must not imply an unavailable action.
3. **Trust without exclusion:** public name, optional university badge, and approximate location help people decide; email addresses and exact addresses stay private.
4. **Local lightness:** near-white canvas, few borders, and subtle elevation. Teal marks decisions rather than decorating the whole screen.
5. **One language across devices:** hierarchy and content remain recognizable as layout changes. Mobile must not be a cut-down interface with essential links hidden.

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

Typography: `Inter` with system fallbacks. Avoid blocking font downloads and proprietary fonts. Type scale: body `16px/1.5`, metadata `14px/1.4`, cards `16px/1.35`, section headings `24–32px/1.15`, main heading `clamp(32px, 4vw, 52px)/1.05`. Use 400 for body text, 600 for labels/actions, and 700 for headings. Do not use all caps as the default hierarchy device.

Spacing follows a 4px base: `4, 8, 12, 16, 24, 32, 48, 64px`. Radii: `8px` on fields/buttons, `16px` on cards/panels, `20px` on primary photography; pills only for filters and compact indicators. Cards have no shadow at rest; a subtle lift is allowed on pointer hover. Content width is at most `1280px`, with side gutters of `16px` on mobile, `24px` on tablet, and `32px` on desktop.

## Visual architecture

### Navigation

- Desktop: CampusMarkt text wordmark, visible search, a prominent create-listing action, links to favorites/messages/account, and language switcher. Use existing destinations. Authentication-dependent destinations must use current sign-in behavior rather than promising anonymous access.
- Mobile: compact header with wordmark and search; bottom navigation for `Explore`, `Search`, `Favorites`, `Messages`, and `Account`. Creating a listing remains discoverable without displacing an essential destination. Bottom navigation must not obscure a CTA, form, keyboard, or the final content.
- `en` is the initial language without a valid cookie; an explicit `de` choice persists, per AD-020. Visible labels and accessible names follow the active locale.

### Discovery (`/` and `/search`)

- Home uses a short promise and functional search in the first viewport. The listing showcase begins early; the hero must not consume nearly the entire screen.
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
- Informative images have useful `alt` text; decorative icons are hidden from screen readers. Price, type, status, and action outcomes are expressed in text.
- Check 320px, 390px, tablet, and desktop with long German and English copy. No page-level horizontal overflow, fixed-element overlap, or CTA hidden behind the keyboard.

## Boundaries and adoption

This design system does not authorize new capabilities. Do not create inert navigation or CTAs for `SWAP`, services, housing, jobs, protected payments, shipping, meetup spots, or native apps. “Buy Now” in the reference means the implemented purchase-intent/negotiation flow, not a new checkout or payment system.

Recommended sequence after approval: (1) tokens and responsive shell, (2) home/search/cards/filters, (3) detail and type/state-aware actions, (4) progressive convergence of supporting screens. Reuse current services and contracts. Implementation should visually inspect states, both languages, keyboard, and mobile, alongside existing functional tests.

## Internal sources

- Planning conversation “Planejar marketplace estudantil,” design decisions from 2026-09-27: Airbnb as structural reference, original teal identity, Inter/Geist, photo-led cards, search/categories, action-oriented detail, mobile, DE/EN, and states.
- [`docs/product/00-product-vision.md`](docs/product/00-product-vision.md), [`docs/product/02-mvp-scope.md`](docs/product/02-mvp-scope.md), and [`docs/product/03-marketplace-policy.md`](docs/product/03-marketplace-policy.md): V1 product boundary.
- [`.specs/STATE.md`](.specs/STATE.md): active engineering and experience decisions.
