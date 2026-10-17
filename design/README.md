# CampusMarkt visual exploration

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

## Current approved product document

The user approved the design-system proposals and chose integrated checkout as the main design journey. Use **`CampusMarkt-Approved.figcraft`**, titled **CampusMarkt — Produto aprovado**, as the curated reference. Start at **00 · Comece aqui**; the 24-page document includes the selected screens, system and buyer/seller/admin journeys. See `APPROVED-PRODUCT.md` for decisions, derived additions and remaining contracts. The earlier file and notes below are preserved exploration history; outdated deferral/review labels there are superseded by this record.

## Design system v1.0 - current review

Page **21 · CampusMarkt Design System — v1.0** contains fifteen boards for brand/logo, voice, color, type, layout, icons/photos, controls, cards, navigation, patterns, motion, accessibility, brand applications and smaller controls/feedback. Page **22 · Motion playground — CampusMarkt** has standard/reduced native favorite and dialog demonstrations. See `DESIGN-SYSTEM.md`, `design-system/` for PNG/SVG/token assets and `../output/pdf/CampusMarkt-Design-System.pdf` for the selectable-text book. Approved choices are preserved; the CM logo and newly detailed system rules await review. Native source saved; no application implementation.

The editable source is `CampusMarkt-Redesign.figcraft`.

## Selected direction: A / Local discovery

On 2026-10-16, the user selected **A**, the Karrot-inspired direction, over B. Continue subsequent screens with teal actions, Inter, neighborhood context, category icons, rounded real photographs and the two-column mobile discovery grid shown in A. Keep B as an archived comparison. The logo remains deferred; implementation comes after screen design review.

## Direction comparison

Page **02 · Karrot × Hazaar — visual comparison** contains:

- **A / Local discovery**: a search-led home, teal actions, neighborhood context, category icons and rounded listing photos.
- **B / Campus editorial**: larger display typography, an editorial photo, lime accents and squarer listing photos.
- Desktop frames at 1440 px; full mobile pages at 390 px; additional 390 × 844 viewport frames demonstrate the bottom navigation.

Both proposals use the same four fictional listings. All photos, names, prices and badges are presentation material; they do not describe real CampusMarkt inventory. Subsequent screen proposals follow A. These are editable static design proposals, not interactive or implementation-ready prototypes. The logo is deferred.

The two-column mobile grid is part of the selected redesign direction. The editorial palette/type scale from B was not selected. The product implementation and feature contracts remain unchanged.

## Exports

- `02-A-karrot-desktop-mobile.png`
- `02-B-hazaar-desktop-mobile.png`
- `02-mobile-comparison.png`
- `03-search-desktop-mobile-filters.png`

## Current screen review: Search and filters

Page **03 · Search & filters — direction A** contains a desktop results view, a mobile results view and the mobile filter sheet. The example is an empty text query filtered to For sale, with three fictional listings sorted newest first; the free books from the home example are correctly excluded. Reserved items remain visible with a label.

Filters cover listing type, category, neighborhood, price bounds, condition and optional TU verification. Active-filter removal, clearing, ordering and the mobile apply action are shown. This is a static visual proposal pending screen review; loading, zero-results, failure and expanded dropdown variants, translations, keyboard/focus and narrow-screen checks remain for the handoff. The next screen is listing detail with type/state-aware actions.

The desktop/mobile results and filter sheet were rendered and visually inspected for spacing, text wrapping and clipping before export.

## Current refinement: navigation

The user liked the search screens and asked to improve desktop and mobile navigation. Page **04 · Navigation refinement — direction A** preserves the preceding proposals and shows revised navigation in home/search context, visitor/member desktop states, mobile active-tab states, a 320 px composition, an account menu and a visible focus example. The user accepted this direction with one correction: publishing and language needed more space. That correction is complete: a 48 px desktop gap and a 12 px vertical gap between the mobile publishing button and language surface. Existing exports were regenerated.

Exports: `04-navigation-home.png`, `04-navigation-search.png`, `04-navigation-anatomy.png`, `04-navigation-320.png`. See `NAVIGATION.md` for source references, destination mapping and intended behavior. These are static, editable designs; they do not implement scrolling, routing, authentication or menus.

## Current screen review: listing detail

Page **05 · Listing detail — direction A** contains full desktop and mobile designs for Sell, Give away and Wanted. Each mobile variant also has a 390 × 844 viewport with the fixed contextual action bar. An additional board covers owner management, reserved-for-another, reserved-for-you and sold/archived states.

Exports: `05-listing-sell.png`, `05-listing-give-away.png`, `05-listing-wanted.png`, `05-listing-states.png`, `05-listing-sell-mobile-full.png`. See `LISTING-DETAIL.md` for the acceptance boundaries. These screens are pending visual review.

The user accepted the latest availability refinement and asked to continue. Creation and editing are now on page 06. Subsequent units: My listings, favorites, inbox/conversation, offers/reservations/pickup, identity/account/verification, safety/moderation and legal/support pages. Remaining state coverage and German/narrow-width checks remain part of the final design handoff.

Detail refinement: applied the requested lighter availability, rose report action, condition-specific tints and rounded mobile back chevron across the current detail variants. The additional editable reference board is exported as `05-status-condition-back-controls.png`; existing detail exports were refreshed. See `LISTING-DETAIL.md` for source and measured text contrast.

## Current screen review: create and edit

Page **06 · Create & edit listing — direction A** contains Sell, Give away and Wanted creation forms and owner editing at desktop/mobile sizes, plus 390 × 844 mobile viewport examples. It also includes review before publication, mobile publication success, a recovery/validation board and a mobile flow overview. See `CREATE-EDIT-LISTING.md` for constraints, references and remaining checks. This unit is a static proposal for visual review.

Following feedback, mobile photo entry now separates camera and gallery. Wanted uses generic decorative copy, and publication success shows the submitted listing's actual title/cover under a generic confirmation heading. No image recognition or item-specific hardcoded messages are intended.

Main exports: `06-create-sell-desktop.png`, `06-create-mobile-flow.png`, `06-create-sell-mobile-full.png`, `06-create-give-away-desktop.png`, `06-create-give-away-mobile-full.png`, `06-create-wanted-desktop.png`, `06-create-wanted-mobile-full.png`, `06-edit-desktop.png`, `06-edit-mobile-full.png`, `06-review-desktop.png`, `06-review-mobile-full.png`, `06-publish-success-mobile.png`, `06-create-edit-states.png`.

Availability refinement: `05-availability-alternative.png` compares the user-approved outlined Available badge with Reserved and Unavailable. The approved Available is adopted in the detail examples on page 05.

## Current screen review: photo states

Page **07 · Photos & Wanted references — direction A** shows multi-photo upload grids, ordering/removal, the eight-photo boundary, Wanted reference photos in both the form and listing detail, single/multiple-photo galleries and expanded desktop/mobile viewers. See `PHOTOS-WANTED.md`. Main comparison: `07-photos-mobile-overview.png`; desktop examples: `07-wanted-form-desktop.png` and `07-wanted-detail-desktop.png`. These are static visual proposals.

Requested refinement: `07-drag-and-language.png` adds drag handles and a drag-in-progress state, a quieter photo-options menu (`07-photo-options.png`), an open EN/DE selector and German photo-section labels. Compact form/review/success headers now consistently show the language control. Changes remain in the design artifact only.

## Current screen review: My listings and favorites

The user accepted page 07's drag and EN/DE refinement and requested continuing. Page **08 · My listings & favorites — direction A** now contains desktop/full-mobile/viewport examples, German mobile variants, both empty journeys, the owner menu, lifecycle cards and recovery/undo/archive states. See `MY-LISTINGS-FAVORITES.md` for the visual contract and remaining validation. This unit is pending visual review.

Main exports: `08-account-mobile-overview.png`, `08-my-listings-desktop.png`, `08-my-listings-mobile-full.png`, `08-favorites-desktop.png`, `08-favorites-mobile-full.png`, `08-my-listings-empty-mobile.png`, `08-favorites-empty-mobile.png`, `08-owner-statuses.png`, `08-account-feedback.png`, `08-owner-menu-mobile.png`, `08-my-listings-de-mobile.png`, `08-favorites-de-mobile.png`. Next unit: inbox and conversation.

## Current screen review: inbox and conversations

The user accepted page 08 and requested continuing. Page **09 · Inbox & conversations — direction A** contains inbox/desktop split-view, mobile Sell/Reserved/Wanted chats, new/empty/error states, a German thread and sending/history/privacy recovery examples. See `INBOX-CONVERSATIONS.md`. Main exports: `09-messaging-mobile-overview.png`, `09-conversation-desktop.png`, `09-inbox-desktop.png`, `09-inbox-mobile.png`, `09-chat-sell-mobile.png`, `09-chat-reserved-mobile.png`, `09-chat-wanted-mobile.png`, `09-chat-de-mobile.png`, `09-chat-new-mobile.png`, `09-inbox-empty-mobile.png`, `09-inbox-error-mobile.png`, `09-messaging-states.png`. This unit is pending visual review. Next: structured offers, reservations and pickup.

## Current discussion: counteroffers and chat guidance

Page **10 · Counteroffers & chat guidance — direction A** includes seller-received €20, €22 counteroffer composition on mobile/desktop, buyer response, reservation outcome and validation/conflict states. Following feedback, quick replies and Send anyway were removed from the current concept. The replacement board shows blocked external contact sharing, legitimate numeric text and a proposed private account warning after reviewed recurrence. Enforcement details require an approved feature spec; these are static designs. See `COUNTEROFFERS-CHAT-GUIDANCE.md`.

Exports: `10-counteroffer-mobile-flow.png`, `10-counteroffer-desktop.png`, `10-offer-received-mobile.png`, `10-counteroffer-compose-mobile.png`, `10-counteroffer-received-mobile.png`, `10-counteroffer-reserved-mobile.png`, `10-chat-guidance-proposal.png`, `10-contact-blocking-warning.png`, `10-chat-contact-blocked-mobile.png`, `10-account-warning-proposal-mobile.png`, `10-counteroffer-states.png`.

## Current screen review: reservations and pickup

The user accepted the revised contact-sharing direction and asked to continue and identify missing screens. Page **11 · Reservations & pickup — direction A** now shows buyer/seller reservation, cancellation, seller completion, private history and recovery states, with mobile screens and desktop reservation/history/dialogs. See `RESERVATIONS-PICKUP.md`. Main export: `11-pickup-mobile-overview.png`; desktop: `11-reservation-desktop.png`, `11-complete-pickup-desktop.png`, `11-cancel-reservation-desktop.png`, `11-exchange-history-desktop.png`; states: `11-pickup-states.png`. Static proposal pending visual review.

See `SCREEN-COVERAGE.md` for the remaining units: access/recovery, account/public profile, university verification, safety/reporting/blocking, moderation, help/policies/legal layouts and final responsive/localization/accessibility validation. Next full unit: access and recovery.

## Requested scope exploration: payments

The user requested accepted payment methods and integrated card/PayPal checkout. Page **12 · Payment choices & checkout — proposal** explores seller defaults/listing methods, buyer choice at reservation, payment at pickup, setup, checkout, confirmation, seller fees/payout, refund and recovery. See `PAYMENTS-PROPOSAL.md` for recommendation, official references, unresolved provider eligibility/cost/liability decisions and implementation boundaries. This is a separate proposed scope extension; the existing direct-payment V1 spec is not silently changed.

Main exports: `12-payment-methods-overview.png`, `12-payment-handover-overview.png`, `12-payment-entry-points.png`, `12-checkout-desktop.png`, `12-payment-settings-desktop.png`, `12-payment-states.png`. Individual `12-` mobile exports cover setup, methods, card/PayPal, cash, payment details and cancellation/refund.

Payment refinement: following clarification about the platform processor account, `12-wallets-checkout-overview.png` and `12-wallets-checkout-desktop.png` add conditional Apple Pay / Google Pay with card fallback. Seller and reservation labels group Card & wallets. Provider account ownership, seller onboarding and charge routing remain separate concerns; see `PAYMENTS-PROPOSAL.md`.

Latest payment refinement: `12-wallets-stacked-mobile.png`, `12-wallets-stacked-desktop.png` and `12-wallets-stacked-overview.png` replace the separate examples as the current proposal: Apple Pay above Google Pay, official artwork, equal widths and card fallback. Both show only in an eligible checkout. The earlier separate availability board is hidden in the native file.

## Current screen review: access and recovery

The user accepted the smaller wallet buttons and asked to continue and identify remaining screens. Page **13 · Access & account recovery — direction A** now contains sign-in, registration, email instructions/confirmation, recovery request/instructions, new password and reset success on desktop/mobile, plus state guidance, German sign-in and a 320 px sign-in composition. See `ACCESS-RECOVERY.md`. Main exports: `13-access-mobile-overview.png`, `13-recovery-mobile-overview.png`, `13-signin-desktop.png`, `13-register-desktop.png`, `13-access-states.png`. This is a static proposal pending review. Next full unit: account and public profile. See `SCREEN-COVERAGE.md` for the remaining designs and final validation backlog.

Access refinement: desktop access panels now use actual public Candle and plant vse listings with their original photos, title, price and area, captured from the public feed on 2026-10-16. Registration/reset include password confirmation, advisory strength feedback and optional variety hints. See `13-password-strength-confirmation.png` and `13-auth-listing-states.png`; current `13-` form/desktop/overview exports were refreshed. The strength states and feed snapshot are static illustrations, not newly implemented production behavior.

## Current screen review: account and public profile

The user accepted the access refinements and asked to continue. Page **14 · Account & public profile — direction A** now contains account hub, public/owner profile, edit/photo/crop, preferences, security/sign-out, deletion/recent-authentication/pending and recovery-state compositions. See `ACCOUNT-PROFILE.md`. Fictional Maya profile/listing examples are separate from page 13's actual public-feed snapshot. Main exports: `14-account-profile-mobile-overview.png`, `14-account-security-mobile-overview.png`, `14-account-desktop.png`, `14-public-profile-desktop.png`, `14-edit-profile-desktop.png`, `14-account-states.png`. Static proposal pending review; next full unit: optional university verification.

## Reference photography

Downloaded from Unsplash for this local concept study only. Replace with the actual item's photographs in the product.

- Chair, insung yoon: https://unsplash.com/photos/a-wooden-chair-sitting-on-top-of-a-wooden-floor-RCWIK0fsETc
- Bicycle, Patricia Tsernoshova: https://unsplash.com/photos/green-commuter-bike-kxuAteLDmfk
- Headphones: https://unsplash.com/photos/black-level-wireless-headphones-on-yellow-surface-PvIz8BmuwDw (asset photo-1641420661737-fb9c392c542e; downloaded image is dark)
- Books: https://unsplash.com/s/photos/book-pile (asset photo-1585521549926-ca6526bda09e)

## Review performed

Inspected both desktop/mobile pairs and both 390 × 844 viewport renders. Corrected seller-text clipping, the location label wrap, the editorial mobile callout spacing, and the stacking order of fixed bottom navigation in viewport frames. German, 320 px, interaction, accessibility and other journey validation remain part of the later design handoff.

## Latest review: account alternative B, photo sources and university badge

Page 14 keeps the original account hub and adds alternative B, with identity, marketplace shortcuts and icon-led settings. Camera/gallery chooser, camera preview and unavailable-camera fallback lead to the existing crop/save flow. See `ACCOUNT-PROFILE.md`. Main preview: `14-account-alternative-overview.png`; desktop: `14-account-alternative-desktop.png`.

Page 15 adds optional university verification: entry, pending, active, expired/renew, disconnect/removal, desktop entry/status, public badge examples and recovery cards. See `UNIVERSITY-VERIFICATION.md`. Main previews: `15-verification-mobile-overview.png`, `15-badge-contexts.png`. Static proposals pending user review, with no live verification or camera action. Next full unit: reporting/blocking. Locale, responsive, interaction and independent-validation backlog remains in `SCREEN-COVERAGE.md`.

Account review update 2026-10-16: the user selected account alternative B as the main account layout. The university badge concept was also accepted; its requested emphasis refinement now uses a compact solid-teal pill, white bold 13 px text and a stronger cap icon. Updated page-14/15 overviews and badge exports show the proposed refinement. See DESIGN.md and UNIVERSITY-VERIFICATION.md.

Latest badge proposal: `15-social-university-seal.png` and `15-public-profile-verified-mobile.png` show an original scalloped teal seal with white university cap beside the name. This supersedes the earlier text pill; account B remains selected. LinkedIn, Airbnb, X and Meta references informed placement and visual recognition, while CampusMarkt continues to confirm only institutional email access. See UNIVERSITY-VERIFICATION.md for semantics, sizing and interaction requirements.

## Current review: reporting and blocking

The social-style university-cap seal is now user accepted. Page **16 · Reporting & blocking — direction A** adds listing/account reports, confidential receipt, independent block choice, block/unblock confirmations, account block management and empty state, disabled conversation composer, desktop forms/modals and recovery examples. See `REPORTING-BLOCKING.md`; main previews: `16-report-mobile-overview.png`, `16-block-mobile-overview.png`, `16-report-desktop.png`. Static proposal pending review. Next unit: moderation, then help/policy/legal. Existing locale/accessibility/width and independent-validation backlog remains.

## Current review: moderation

Page 16's reporting/blocking direction is accepted, with sending disabled for both parties and a generic notice for the other participant. Page **17 · Moderation workspace — direction A** now adds restricted queue, listing/account review, justified removal/dismissal/suspension, audit history, owner removed-listing and restricted-account views, plus empty/recovery/access states on desktop/mobile. See `MODERATION.md`. Main previews: `17-queue-desktop.png`, `17-review-mobile-overview.png`, `17-account-mobile-overview.png`, `17-audit-desktop.png`. Fictional cases only; no real moderation action. Static proposal pending review. Next unit: help/policies/legal, followed by the remaining responsive/locale/accessibility/interaction and independent-validation review.

## Current review: help, policies and legal layouts

Page **18 · Help, policies & legal — direction A** contains the help hub, email-contact path, pickup and reporting/blocking guides, marketplace-rules overview, university FAQ, existing Impressum/privacy/terms reading layouts, mobile contents sheet and a full 320 px privacy example. See `HELP-POLICIES-LEGAL.md`. Main previews: `18-hub-desktop.png`, `18-help-mobile-overview.png`, `18-legal-mobile-overview.png`. Existing statutory text and previously confirmed operator details are preserved; configured contact addresses and final legal/content review remain integration requirements. No new legal verification or support backend was performed. Next: Administration entry and workspace as agreed, then final backlog/validation.

## Current review: Administration scope proposal

Page **19 · Administration — scope proposal** adds conditional account B and profile-menu entry, desktop/mobile directories and controlled listing/profile corrections, before/after review, platform settings, category/area labels, help drafts, legal previews, staff grants/revocation/reauthentication and read-only activity. The accepted page-17 moderation queue is shown within the admin shell. Private conversations remain excluded. See `ADMINISTRATION.md` for proposed permission boundaries and remaining specification work. Main previews: `19-overview-desktop.png`, `19-entry-mobile-overview.png`, `19-correction-mobile-overview.png`, `19-access-mobile-overview.png`. Forty exports saved; static design only, no real content or role changes. After visual review, consolidate state/locale/width/interaction gaps before coding.

## Current review: common loading and recovery states

Administration on page 19 is visually accepted. Page **20 · Loading, empty & recovery states — direction A** adds desktop/mobile loading, genuinely empty and zero results, failed load/offline hint, unavailable listing, pagination recovery, photo failure versus intentional Wanted placeholder, failed-file upload retry/removal, unsaved/invalid form states and save feedback. Includes a German 320 px zero-results layout. Main previews: `20-discovery-mobile-overview.png`, `20-forms-mobile-overview.png`, `20-pagination-desktop.png`, `20-search-zero-de-320.png`. See `LOADING-RECOVERY.md`; `REVIEW-HANDOFF.md` consolidates the remaining work before coding. Twenty-three exports; static design only, no new offline caching, uploads or live mutations.
