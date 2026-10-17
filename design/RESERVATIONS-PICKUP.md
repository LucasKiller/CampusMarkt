# Reservations and pickup

Status: static visual proposal for review. Page **11 · Reservations & pickup — direction A** in `CampusMarkt-Redesign.figcraft`. Continues the accepted counteroffer example: Maya's chair, asking price €25, agreed price €22, recipient Alex. Photographs, profiles, dates and exchange data are fictional fixtures.

Subsequent user request: page 12 explores payment preferences and integrated checkout at pickup. See `PAYMENTS-PROPOSAL.md`. Its online-paid cancellation/refund and payment status are a proposed scope extension, not behavior implicitly added to this direct-payment page.

## Screens

- Mobile active reservation for buyer and seller, with public partner entry, agreed price, coarse pickup area, chat and cancellation.
- Mobile cancellation with four approved reasons: scheduling conflict, changed mind, no-show and other. Scheduling conflict is selected only as a prototype fixture; implementation must require deliberate reason selection.
- Seller-only completion confirmation, optional 500-character note, terminality explanation and preserved reservation alternative.
- Seller completion outcome with private exchange record, actual listing context and generic success heading.
- Mobile and desktop completed history, with active/completed entry points.
- Desktop reservation and seller cancellation/completion dialogs.
- Recovery board: confirmed cancellation, unknown network outcome, completion/cancellation race, empty history and unavailable access.

## Behavior and boundaries

Feature 008 governs reservations and cancellation; feature 010 and AD-015 govern seller-led pickup completion. Both participants can cancel an active reservation with an approved reason; successful cancellation restores the listing to active. Only the seller/listing owner confirms completion, which atomically completes the reservation and marks the listing sold. A buyer has no completion action. Completed exchanges cannot be cancelled or reopened.

The mobile and desktop seller dialogs refer to Alex as the other participant. The buyer reservation refers to Maya. The account avatar reflects the current viewer, not the other participant. University badges must be shown only when currently valid; these fixtures do not claim verification.

The meeting time and exact place are agreed in private chat. No scheduler, stored appointment, map, official Meetup Spot, location tracking or suggested guaranteed-safe site is introduced. Coarse area appears on reservation records. Guidance recommends busy public places, daylight, inspection before payment and no prepayment. Payments remain direct between participants. No checkout, escrow, handover token, review or reputation UI.

The private exchange record is a marketplace status record, not proof that CampusMarkt processed or verified payment. Public sold listings do not expose buyer identity or the negotiated amount. Reuse the sold detail treatment from page 05 with those privacy constraints.

Sending or refreshing is not success. An uncertain completion/cancellation response must reconcile the current state before retrying. Preserve selected reason and note if submission fails. A completion-first race opens the completed record; a cancellation-first race disallows completion. An unavailable reservation reveals no partner or listing data. Only show confirmed cancellation copy when the result is acknowledged, and refresh listing availability when returning to it.

`GIVE_AWAY` uses Free rather than €0, and owner/recipient language without payment instructions; no monetary negotiation. `WANTED` does not acquire a financial reservation or completion journey. Those full variants remain in the handoff backlog rather than using this SELL example unchanged.

## Review

Rendered and inspected buyer/seller mobile views, cancellation, completion confirmation and outcome, history, desktop reservation/history/dialogs and recovery board. Corrected account navigation context and made the success heading item-independent. Native file and `11-` PNG exports saved. No application code, database mutation, commits or running services; software tests were not needed for static design artifacts.

Remaining: full German translations and preservation of user text during locale changes; 320 px/tablet and keyboard layouts; complete active-history and purchase/Free examples; desktop completed record; validation/sending/expired-session variants; accessible dialog focus trapping/restoration, live announcements and 44 px link targets; independent final design validation. The inherited desktop navigation supports EN/DE; mobile headers include the same selector. These controls are static here.

The older feature 010 spec still labels itself Draft while its requirement table records verified outcomes. This redesign does not resolve that documentation inconsistency or authorize new implementation tasks. Implementation must reconcile current approved sources first.
