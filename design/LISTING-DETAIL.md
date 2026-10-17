# Listing detail — direction A

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Status: visual proposal pending review. Editable source: FigCraft page **05 · Listing detail — direction A**. No application code, data or API behavior changed.

## Requested color and back-control refinement

The user liked the detail designs and requested distinct colors for availability, reporting and condition, plus a better mobile back arrow. Applied across all three detail types and their full-page/viewport copies:

- Available: the first pale-green proposal was superseded by the user-approved white capsule with green outline `#BBDCC7`, text `#23734A` and green dot/halo. Applied to Sell and Give away desktop/full-mobile/viewport examples.
- Reporting: a quiet 44 px rose action `#FFF1F2`, flag and text `#B42332` (5.92:1).
- Good condition: blue `#EAF2FF`, text `#24569C` (6.46:1).
- Condition reference variants: New `#F3EDFF` / `#6D42A1` (6.24:1), Like new `#E5F6FA` / `#086A7B` (5.63:1), Fair condition `#FFF3DA` / `#855516` (5.77:1). Labels remain visible; colors do not imply seller ratings.
- Mobile back: [Lucide chevron-left](https://lucide.dev/icons/chevron-left), 2 px round caps/joins, centered in the existing 44 × 44 px target. Geometry checked against the [official SVG](https://github.com/lucide-icons/lucide/blob/main/icons/chevron-left.svg), ISC license.

The editable refinement board and `05-status-condition-back-controls.png` document these choices. Contrast values are calculated for these text/background pairs; they are not a full accessibility audit. Visually checked the updated full mobile Sell and desktop/mobile Wanted compositions and the refinement board.

## Included designs

Approved availability refinement: `05-availability-alternative.png`, editable board **Availability / new visual proposal** on page 05. Available uses a white capsule, subtle green outline and green dot with a soft halo. Unavailable uses a neutral gray capsule and circled minus. Reserved remains a distinct amber clock state. The comparison illustrates an ended listing with its real reason and an exploration action, without purchase/contact controls. Unavailable is presentation copy, not a new domain status. The user accepted this direction and asked to continue to the next screens; the new Available is now adopted in the current detail examples.

- Sell: desktop, full mobile page and 390 × 844 mobile viewport.
- Give away: desktop, full mobile page and mobile viewport.
- Wanted: desktop, full mobile page and mobile viewport; intentionally no invented item photo or budget.
- Action-state board: owner, reserved for another participant, reserved for the viewer and inactive sold/archived listing.

## Product boundaries

The designs follow features 005, 008 and 025 and the marketplace policy:

- Sell offers a purchase-intent request at asking price, a separate monetary-offer action and private messaging. A request does not immediately reserve the item or charge money.
- Give away offers interest and messaging, with no monetary negotiation. The owner must accept before a reservation exists.
- Wanted offers contact with the poster rather than purchase/reservation controls.
- The owner sees management and offers, with no self-purchase or self-message entry point.
- A reservation for another person has no enabled purchase or offer action. Messaging remains available according to existing permissions. A participant has access to their existing conversation/reservation.
- Sold/archived direct links show their inactive state and a route to explore other listings. New purchase, offer and message actions are hidden, matching the existing detail route.
- Authentication remains required for favorites, contact, purchase intent, offers, reporting and other mutations.
- Only public profile identity, current optional university-email verification and approximate pickup areas appear. The badge is not an identity or transaction guarantee.
- Payment and local pickup happen directly between participants. There is no platform checkout, shipping or platform-held money.

## Responsive composition

Desktop uses the accepted global navbar, a photo-led reading column and a clearly associated action/seller panel. Mobile detail uses a compact back/wordmark/favorite header and one fixed contextual action bar. The global five-tab dock is replaced in this context to avoid stacking it with the item action bar. Preserve sufficient bottom scroll padding, safe-area handling and keyboard behavior during implementation.

The gallery examples contain exactly one reference photograph, labeled truthfully. All listing copy, prices, names, photos and badges are fictional prototype content. The Wanted surface is an intentional text/intent treatment. The logo remains deferred.

## Visual review and remaining work

Page 07 adds explicit image-present Wanted variants (one, three and eight photos on mobile, three on desktop), three-photo Sell galleries and enlarged viewers. Wanted without images keeps the generic placeholder shown here. See `PHOTOS-WANTED.md` for reference labeling, order, counters and thumbnail overflow.

Rendered and inspected all three type variants at desktop and mobile sizes plus the four action states. Corrected the desktop gallery framing/shape and description weight. Inspected the mobile contextual action bars in viewport exports and regenerated the navigation exports after the requested spacing fix.

Pending later handoff: gallery viewer, expanded offer/request dialogs and submission feedback, loading/failure/not-found variants, German and 320px content, keyboard and screen-reader interaction, contrast/hit-area checks, and final independent validation before coding.
