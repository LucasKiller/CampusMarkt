# Account and public profile

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Status: static visual proposal for review. Page **14 · Account & public profile — direction A** in `CampusMarkt-Redesign.figcraft`. Follows feature 002 identity/profile/session/deletion contracts, approved visual direction and shared EN/DE preference. No live account, profile, image, session or deletion was changed.

## Screens

- Mobile account hub with listing/exchange shortcuts and profile, optional verification, payment settings, preferences, security, blocked-account and help entry points. Full scrollable composition plus 390 × 844 browser viewport with the accepted fixed Account dock.
- Public profile with initials fallback, display name, join month/year and two active listing fixtures; owner preview swaps Report profile for Edit profile. No general profile-message button: contact remains scoped to a listing.
- Profile editing without/with a processed-avatar fixture, photo selection limits, name editing, removal, square crop and zoom, save/cancel.
- Private security page: read-only account email, reset-password entry, current-browser sign-out, all-browser sign-out and deletion entry. All-browser confirmation is available in mobile and desktop compositions.
- Language preference in English and a German mobile example with Deutsch selected.
- Deletion review, recent-authentication step and acknowledged deletion-pending outcome. Desktop/mobiles include the relevant page/dialog forms.
- Nine-state board: profile saved/failure, rejected upload, failed replacement, avatar removed, all-device sign-out confirmation/failure, no active listings and unavailable public profile.

Desktop account pages reuse member navigation with Account active and an account sidebar. Public profile is shown from another member's perspective, without owner settings; the sample viewer initial is A and the public subject is Maya. Deletion-pending outcome uses a guest header because sessions have ended. Focused mobile subpages use contextual back/language controls rather than placing a dock over forms or dialogs.

## Fixtures and scope

Maya, the October 2026 join month, `maya@example.com`, chair/books and avatar illustrations are fictional prototype data. The private example email is confined to owner security screens. These are different from the actual Candle/plant vse feed snapshot used in page 13's access discovery panel; no real seller's listings are reassigned to Maya. On implementation, the public profile must query the selected public ID's authorized public listings, never reuse arbitrary feed items or stock photo replacements. Actual listing status/type/price/cover and current badge determine presentation.

Payments & payouts links to the user-requested page-12 scope proposal. Its presence in this design does not silently authorize production payment routes, deletion rules or future financial services. Reconcile payment eligibility, outstanding financial records and deletion/retention before implementing that expanded scope. Other destinations refer to existing V1 journeys or their next design units; there are no disabled Coming soon categories.

The public profile's active-listing collection is within general product scope, but the current profile route read during design is mainly an identity card. An approved implementation task must reconcile the listing collection/projection and tests before coding it. Native drawings do not implement that query or authorization.

## Identity and privacy contract

- Public view shows only public name, processed avatar/initials, join month/year, actual public listing information and an optional currently valid university badge. The main fixture has no badge. Verification pending/expired/revoked states never produce a badge. No biography, public username, private email, exact address, follower count, ratings, transaction count or inferred student status is added.
- Visitor profile browsing stays public. Report profile requires the reporting feature's authenticated flow; do not offer self-report on an owner's preview. Open a listing for 1:1 conversation; no unsolicited profile-scoped chat is created.
- Names are trimmed 2–50 Unicode characters, with the existing markup/control-character rejection. Save reports success only after acknowledgement. Preserve editable name on recoverable failure while keeping the last confirmed public profile.
- Avatar selection accepts JPEG/PNG/WebP up to 5 MB, never SVG/GIF or MIME-only trust. The square crop produces the existing metadata-free 512 × 512 WebP derivative; originals remain private and follow cleanup rules. The crop preview's abstract head/shoulders is only a stand-in for a selected image, not an actual upload, supported SVG input or a real person.
- The initial edit fixture has no avatar and offers Add photo. The alternate fixture has a processed-avatar stand-in and Change/Remove controls. Removing the avatar restores deterministic initials. A failed replacement retains the previous published avatar. Crop/zoom require keyboard alternatives and live preview; do not persist an unsaved preview or overwrite an avatar when Cancel is used.
- The primary account email is read-only in owner security; changing it is outside the current identity scope. Password reset uses the page-13 email flow, with its confirmation and strength design refinement. There is no newly invented device/IP/location inventory or per-device revoke list: existing controls cover this browser and all sessions.
- Sign out this device leaves other sessions intact; sign out everywhere includes this browser and requires the explicit confirmation shown. Neither path claims success before server acknowledgement. An unknown/failed sign-out result must remain actionable rather than pretending the account is signed out.
- Language is the site's existing shared EN/DE preference; English defaults without a valid saved choice. Preserve authored names/listings/messages, drafts and selected photos when switching. The German preference example selects Deutsch and updates the header. The language screen does not invent separate notification preferences.

## Deletion contract

Deletion requires an authenticated owner, recent authentication no older than 10 minutes and explicit final confirmation. The form retains the existing implementation's literal `DELETE` entry and starts blank (the visible DELETE is a placeholder); final destructive action is disabled until valid. Reauthentication asks email/password through the existing owner endpoint and returns to review; it does not auto-delete.

On an acknowledged deletion-pending result, all sessions end and the public profile/avatar become unavailable immediately. Identity-owned data is removed within 30 days under the approved feature. The outcome says removal started, not that every record has already been erased. Listing, messaging, safety and financial record lifecycles require their own policy/spec; UI must not promise that all transaction evidence disappears. The deletion policy link is a content requirement, not a fabricated already-approved policy document. Reconcile its actual content/destination before launch.

Retry and uncertain-result handling must refresh actual account state. A failed request does not show the deletion-pending outcome; a partial purge remains nonpublic/non-authenticating and is not reported as complete. Existing marketplace policies govern reservation/listing consequences. Proposed integrated payments require additional approved reconciliation before applying account deletion to paid/refund/dispute states.

## Visual review and handoff

Rendered and inspected account/full viewport, public profile, edit/photo/crop, security, sign-out confirmation, language, deletion/reauthentication/pending and recovery-state compositions. Checked text wrapping and form/button bounds. Corrected crop placeholder overflow and German radio stacking. Main native overview compares account, edit and public profile; another covers security/deletion. Saved native file and `14-` PNG exports. No application source/tests/commits, service process, outbound messages or live mutations.

Remaining: full German journeys and 320 px/tablet checks; actual populated long names and missing/broken photos; current university-badge variant (next unit), public guest/owner and unavailable profile layouts; complete form-level invalid/unsaved/loading/offline/language-save/deletion-failure states; avatar keyboard crop/zoom and remove/replacement races; dialog focus/return and screen-reader announcements; actual link and authorization integration; independent final design validation. Static state cards are not complete end-to-end failure handling.

## Account alternative B and photo selection — 2026-10-16

The user accepted account alternative B on 2026-10-16 as the main desktop/mobile account layout: public identity first, three marketplace shortcuts and flat icon-led settings on mobile, with a spacious two-column desktop layout. Page 14 preserves the original hub only for historical comparison. This B is a layout variant within direction A, not the rejected Hazaar direction. The accepted navigation remains. Payments still refers to the separately proposed page-12 expansion.

Research: [Airbnb account settings](https://www.airbnb.com/help/article/280), [Airbnb profiles](https://www.airbnb.com/help/article/3386), [eBay My eBay](https://www.ebay.com/help/selling/selling/ebay-profile-page?id=5185), [Vinted profile editing](https://www.vinted.com/help/392/402-changing-your-profile-page-details?access_channel=hc_topics). These support separating identity, marketplace activity and private settings. The layout is an original interpretation, not an authenticated audit of their current account screens.

The mobile photo chooser offers Take photo, Choose from gallery or files and Cancel. Camera preview includes capture, cancel and file fallback. Permission/unavailable recovery preserves the current avatar. Chosen/captured photos continue to the existing square crop, then profile save; capture does not publish automatically. Change opens this chooser; Remove remains in editing. Desktop retains upload. These are browser designs, not an actual camera session or native app. Request camera permission only following user action, subject to browser capability and a secure context. Keep file fallback, JPEG/PNG/WebP and the existing 5 MB limit. Unsupported camera formats require a recoverable error, not a promise of conversion.

Exports: `14-account-alternative-mobile.png`, `14-account-alternative-desktop.png`, `14-account-alternative-overview.png`, `14-avatar-choose.png`, `14-avatar-camera.png`, `14-avatar-fallback.png`. Visually inspected hubs, chooser/camera and verification states. Original account exports remain intact. See `UNIVERSITY-VERIFICATION.md` for the completed next design unit. Full DE/narrow-width, accessibility, interaction and independent validation remain outstanding.
