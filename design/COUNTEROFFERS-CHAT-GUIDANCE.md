# Counteroffers and contact-sharing guidance

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Status: static visual proposals, not new production behavior. Latest user direction: omit quick replies, warn about external contact sharing and block that message. Account warnings are proposed below; thresholds, review and restrictions still need an approved feature specification. Source: page **10 · Counteroffers & chat guidance — direction A** in `CampusMarkt-Redesign.figcraft`.

## Counteroffer screens

- Seller receives Alex's €20 offer on Maya's €25 chair, with Accept, Counteroffer and Decline actions.
- Seller composes a €22 counteroffer with an optional 41-character note and a 500-character limit. Mobile uses the focused page and desktop uses a dialog over the conversation.
- Buyer sees Maya's €22 counteroffer, the prior €20 proposal marked countered, the seller's note and explicit Accept €22 / Decline actions.
- Accepted outcome shows the €22 reservation, public partner name, coarse pickup area and links to chat/reservation. No charge is taken; payment remains direct at pickup.
- State board: amount above the asking price, changed/stale proposal, unconfirmed submission and concurrent reservation conflict.

These are SELL-only financial negotiations. GIVE_AWAY interest and WANTED contact retain their existing non-monetary semantics. Only the current proposal is actionable; the former €20 offer is history. Sending a counteroffer does not reserve the item; acceptance creates the exclusive reservation and supersedes competing proposals. A normal chat message does not perform any structured acceptance.

The current feature 008 bounds require integer cents greater than zero and no greater than the asking price. The €0.01–€25.00 helper follows those offer bounds, distinct from the minimum asking price for creating a listing. The amount and note are kept when local validation fails. If a network result is uncertain, reconcile the latest proposal before retrying rather than promising that nothing was committed. A concurrent reservation error must not claim success for the viewer.

Before implementation, validate the counterproposal's author/recipient identity, allowed acceptance/decline/withdrawal actor and active-proposal lineage end to end. The current SQL read during design checks participant membership and parent links, while the existing buyer UI is mainly a pending-offer display. Do not infer a safe completed counteroffer journey merely from the existence of counter/accept RPCs. Reconcile these actor rules and their tests in an approved implementation task; the author must never accept their own still-pending proposal. No API or database change is made by this artifact.

## Recommendation about free chat

Retain free-form text without quick replies, following the user's feedback. Users still need to discuss dimensions, wear and pickup details. Structured offers/reservations keep the agreement in CampusMarkt without forcing conversation into fixed phrases.

The new contact-sharing board supersedes the archived quick-reply / Send anyway concept. For a high-confidence attempt to move communication outside CampusMarkt using phone, email or external profiles/links, block submission, preserve the editable draft and explain the correction privately to the sender. There is no Send anyway action. Do not automatically treat every number, @ symbol or URL as a violation. Normal dimensions, prices, pickup times, addresses and postal codes must remain usable; the valid example contains 16:00 and 45 × 45 cm.

Recommendation: the first blocked attempt prompts correction without an automatic account strike. Repeated confirmed attempts may produce a private account warning with a review request; the proposed account screen explicitly follows review and leaves messaging access unchanged. Any restrictions require clear approved rules and review, rather than an arbitrary automatic strike count. Detection scope, false-positive correction, appeal, warning retention and localization/accessibility need specification before coding. Failed drafts must not reach the other participant, and raw message/contact contents must not enter ordinary telemetry. Existing spam/phishing/reporting/blocking policy remains separate.

No contact filter, automated moderation model, warning ledger, new retention policy, outbound messaging or live blocking was implemented. These screens record the requested design direction and the proposed distinction between correction feedback and a reviewed account warning.

Sources consulted:

- [Vinted personal data guidance](https://www.vinted.com/help/81-is-my-personal-information-safe): recommends avoiding sharing contact/account information and reporting suspicious messages. It does not establish that CampusMarkt should block all numbers.
- [Kleinanzeigen safety guidance](https://themen.kleinanzeigen.de/sicherheitshinweise/): identifies personal-data requests as a warning signal and recommends safe local pickup. Its protected-payment product is not part of CampusMarkt V1.
- Existing features 008 and 009/025, marketplace policy, `DESIGN.md`, active decisions and the current negotiation UI/RPC sources.

## Review and next work

Rendered and inspected the mobile offer/counteroffer/recipient flow, desktop dialog and chat-guidance board. Corrected the actor wording so the seller's counteroffer replaces the buyer's current proposal rather than claiming the seller already made it. Values, notes, identities and photographs are fictional prototype material. Native file and `10-` exports saved. No software test suite was run for these design-only proposals.

Latest refinement: rendered and inspected the contact-blocked draft, valid numeric message and reviewed account warning. Export: `10-contact-blocking-warning.png`; `10-chat-guidance-proposal.png` now contains this replacement board. The old concept remains hidden in the native file for history.

Pending: user review of account-warning details and an approved enforcement spec before coding; actor/authorization reconciliation; German and narrow-width examples; focus/dialog/keyboard/currency input behavior; sending/decline/withdrawal states and independent final validation. Reservation cancellation, pickup coordination and seller-led completion remain the next full design unit.
