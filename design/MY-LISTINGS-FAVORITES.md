# My listings and favorites — direction A

Status: static proposal for visual review. Source: FigCraft page **08 · My listings & favorites — direction A**, in `CampusMarkt-Redesign.figcraft`. No application code, real favorites or stored listings changed.

The user liked this unit and requested continuing to messages/conversations. The visual direction is accepted; remaining interaction, localization and independent final validation requirements still apply before coding.

## Included screens

- My listings: desktop, full mobile and 390 × 844 viewport, plus German viewport and an open owner-actions menu.
- Favorites: desktop, full mobile, viewport and German viewport.
- My listings and Favorites empty states: desktop and mobile.
- Owner status board: reserved listing, completed sale, closed Wanted and archived listing.
- Feedback board: owner actions, archive confirmation, favorite removal/undo, failed removal rollback, loading and recoverable fetch failure.
- Mobile review overview: My listings, Favorites and German Favorites.

## Composition and behavior

My listings uses management rows with title, cover, type, price/budget state, approximate pickup area, current status and a prominent Manage listing action. The public-view icon and overflow menu remain separate controls. Desktop retains the accepted member navigation and spacing. The compact mobile header includes back, wordmark and the EN/DE control; the five-destination dock highlights Account. Status tabs scroll horizontally inside their own clipped row. The sample Active tab contains three records; the owner-state board accounts for the remaining one reserved, two completed and one archived records in the seven-record fixture.

Wanted uses Active rather than Available in the owner list to describe the request's lifecycle. Its absent photo gets the neutral search placeholder. No amount is fabricated when the optional maximum budget is missing. Completed is a display grouping for the existing sold lifecycle, with Closed for a completed request, not a new domain status.

Favorites keeps a photo-led four-column desktop grid and two-column mobile grid. It is sorted by save time, with explicit privacy copy and the Favorites dock destination selected. The examples preserve reserved and sold items with their corresponding amber/gray labels. A sold card's former asking price is secondary; its status remains visible. Removing uses the heart control and an Undo notification; a failed mutation restores the previous saved state with a clear error. Archived/deleted listings are excluded according to the existing feature contract. Saving does not reserve an item, reveal a public count or notify its owner.

The owner fixture and favorites fixture represent different listing IDs and owners. Existing reference photographs are reused for this fictional study; favorites do not contain the current user's own records even where the same reference asset is reused.

Owner actions depend on type and lifecycle. The active Sell menu shows Edit listing, View offers and Archive. Wanted does not get monetary offers. The reservation state links to existing reservation management rather than silently bypassing the accepted transaction flow. The archival confirmation illustrates an active listing without an active reservation; existing server guards and any reservation restrictions remain authoritative. No restore/relist shortcut, drafts tab, price alerts, folders, listing boosts, view counters or public favorite metrics are added.

## Existing sources

- Feature 004 spec/context/design/tasks and the current MyListingsView: owner-only listing management, lifecycle filters, immutable intent and archival.
- Feature 007 spec/context/design/tasks and FavoritesView: private favorites, active/reserved saves, retained reserved/sold cards, excluded archived records, authenticated access, undo and failure recovery. Its spec has a legacy Draft heading despite verified requirement rows; this artifact does not change implementation authorization.
- Features 008/010 and current detail handoff: reservation and completed-state boundaries.
- Feature 013 and AD-020: shared EN/DE preference, English default without a saved choice. German examples translate interface labels and currency formatting while leaving author-written titles untouched.
- `DESIGN.md`, `.specs/STATE.md`, `NAVIGATION.md` and the preceding accepted page-07 refinements.

## Visual QA and remaining handoff

Rendered and inspected the desktop/mobile populated lists, both mobile empty states, status and feedback boards, German examples, owner menu and combined mobile overview. Corrected photo/background ordering, grouped the mobile dock above scrolling content, restored every dock icon and clipped the status-tab overflow to its own scroll region. Native file and PNG exports were saved.

These are editable static designs; navigation, filtering, status transitions, translation, Undo and data loading are not implemented by the design artifact. No software tests were needed or run for this design-only work.

Pending for final handoff: German full-page/desktop and 320 px/tablet checks, long-title fixtures, selected-tab empty results, sign-in/session-expiry routing, pagination/loading-more, actual keyboard/focus/scroll/Undo timing, failure-state accessibility and independent final design validation. The empty and failure examples remain different states; failed loads must not show invented zero counts.

Next screen unit: inbox and conversation, followed by structured offers, reservations and pickup coordination, then account/identity/verification, safety/moderation and legal/support coverage.
