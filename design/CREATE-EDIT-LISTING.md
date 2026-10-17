# Create and edit listing — direction A

Status: static visual proposal pending review. Source: `CampusMarkt-Redesign.figcraft`, page **06 · Create & edit listing — direction A**. No application code or live data changed.

## Screens and composition

- Create Sell, Give away and Wanted: 1440 px desktop, 390 px full mobile and 390 × 844 mobile viewport examples.
- Edit Sell: desktop, full mobile and mobile viewport; the listing type is fixed.
- Review before publication: desktop and full mobile. Review is a client-side composition of entered values; the explicit Publish listing action performs the existing direct-to-active publication. No persisted draft or new lifecycle state is implied.
- Mobile publication success: links to the new listing and owner management.
- Requested refinement: every mobile creation/edit variant exposes separate 44 px Take photo and Choose from gallery actions, including optional Wanted references. They feed the same upload rules. The intended browser flow requests the rear camera through HTML media capture where supported, accepts/cancels through the device UI, and keeps the gallery fallback and entered values available. Camera capture does not imply a native app or an embedded custom camera. Browser behavior needs device testing before implementation sign-off; see [MDN capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture).
- Wanted's decorative visual is generic, with no assumed object/category. Its actual preview title and description come from form inputs. Bookshelf and book references in entered sample text are fictional user content, not inferred information. The public Wanted detail illustration on page 05 also uses neutral search copy/iconography.
- Publication success uses the invariant heading Your listing is live and a context card populated from the successfully created listing's title, cover and type/price. The chair in the example is the submitted sample listing, not object recognition. A Wanted without a photo uses a neutral fallback instead of an invented object picture. Long titles wrap/truncate in the summary while the listing page retains the full title; there is no item-specific generated congratulation.
- Recovery board: upload pending/error/size rejection, title/price/photo validation, visible focus example, pending/failed publication and discard-unsaved-changes confirmation.
- Mobile flow overview: create, review and published states aligned for comparison. The first two panels show scrollable-page viewports with fixed contextual actions, not their complete page contents.

Desktop retains the accepted navigation spacing with an Account entry. A single reading column holds the form, with a live summary beside it. Mobile uses the compact rounded back control and one contextual footer; no global dock is stacked with the form action. Full-page examples contain the fields below the first viewport.

The compact mobile form/review/success header now exposes the same EN/DE preference as the main page through a globe/code/chevron control. The intended switch relabels the interface while preserving entered values, photo uploads and order; it leaves user-written text in its original language. Page 07 shows the open selector, a German photo-section variant and drag-to-reorder with quieter overflow alternatives. These are visual/interaction contracts, not newly implemented browser behavior.

## Existing contracts respected

Sources: feature 004 `spec.md`, `context.md`, `design.md`, `tasks.md`; feature 021 photo-upload spec/context/design; product MVP scope; `DESIGN.md` and `.specs/STATE.md`.

- Only Sell, Give away and Wanted physical goods in Braunschweig; confirmed account required by existing rules, optional university verification does not block publishing.
- Sell and Give away require 1–8 photos. Wanted permits 0–8 optional reference photos. JPG/PNG/WebP, 5 MB per file; count a file only after upload succeeds.
- Show the first photo as cover and a 44 px remove control. Choosing files and desktop drag/drop share the same upload constraints. Ordering follows the existing first-photo cover rule and must expose keyboard-accessible Move left / Move right controls when multiple photos exist.
- Title 5–100 characters, description 10–2000; category and pickup area use the existing seven-category/ten-zone allowlists. Good is the sample condition, not a new condition value.
- Sell asks for €0.50–€10,000. Give away shows a static Free value. Wanted has an optional maximum-budget field, explicitly approved in feature 004; leaving it blank means no budget specified.
- Only coarse pickup areas appear publicly; exact meeting details stay in private chat. Payment happens directly at pickup.
- Edit changes mutable fields and saves explicitly. The listing type cannot be changed. Archival and reservation management belong to the owner-management unit, not this form.
- Physical-goods/prohibited-content guidance appears before the form action. No checkout, shipping, AI tagging or unsupported listing types are introduced.

## Visual QA and remaining handoff

The multiple-photo/order/max-eight compositions are now drawn on page 07, together with Wanted photo references in form previews and listing details. See `PHOTOS-WANTED.md`; interaction validation remains pending even though these visual states are now represented.

Rendered and inspected Sell desktop/mobile, Give away desktop, Wanted mobile/full viewport, Edit mobile, Review desktop/mobile, success, recovery board and combined mobile flow. Removed a photo-helper/section-heading collision, corrected the giveaway description, kept authenticated navigation wording, and added cover/remove controls after placing reference photographs. These are static mockups: routing, upload, live preview, saving and confirmation behavior are not implemented by this artifact.

Pending before implementation sign-off: German/320 px/tablet layouts, expanded category/area selectors, multiple-photo reorder composition, max-eight-photo state, keyboard and screen-reader interaction, focus restoration and safe-area/keyboard behavior, signed-out/unconfirmed-account gates, additional review/success type variants and independent final design validation. No software test suite was run for this design-only unit.

All item names, descriptions, photos and prices are fictional prototype material. The existing chair/books reference photographs are reused; replace them with actual uploaded photographs in the product. Logo remains deferred.
