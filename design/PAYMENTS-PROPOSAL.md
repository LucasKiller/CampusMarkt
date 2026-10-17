# Payment preferences and checkout proposal

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Status: requested scope exploration, pending visual and product review. The user asked to include accepted payment methods and actual card/PayPal payment screens. Page **12 · Payment choices & checkout — proposal** is separate from the existing V1 pickup screens. No production payment behavior, provider account, API credentials or money movement was created. The V1 product/spec boundary remains direct payment until an approved payment feature reconciles it.

## Recommended experience

1. Seller account settings hold reusable accepted-method defaults and online payment setup. A cash-only seller does not need payment-provider onboarding.
2. SELL creation/editing includes accepted methods for that listing. Listing details expose them before the buyer sends an offer/request. At least one currently usable method is required.
3. Accepted negotiation creates the exclusive reservation under the current marketplace model. Buyer chooses one of that listing's methods. Saving a choice never charges the buyer. The account may remember a preferred method type, but cannot override seller availability; this is not permission to store card details.
4. Participants arrange pickup in chat. The recommended initial integrated flow charges at the meeting after physical inspection. No prepayment, authorization hold, internal wallet or escrow is proposed here.
5. Card checkout runs on the buyer's browser/device using provider-owned payment fields. PayPal redirects to provider authentication/approval. Cash remains direct. The card form here is an illustrative layout, not a hand-built PAN/CVC form for CampusMarkt to implement. Hosted Checkout or an embedded provider component will determine actual rendering, validation, wallets and authentication.
6. Confirmed online payment appears for both participants. Only the provider/server-confirmed outcome counts, not browser return, a buyer declaration, a screenshot or the seller's completion button. Seller-led handover completion remains a separate marketplace action.
7. Seller payment details distinguish gross payment, actual fees/net amount and bank payout. No promise of immediate payout or payout triggered by pickup completion. Buyer gets a corresponding private payment record, without the seller's bank details or payout breakdown.

The buyer screen can offer Card, Cash and PayPal. Stripe is a processor candidate, not a fourth competing payment method. Additional wallets may appear when supported by the final provider/device; do not add unavailable methods as production placeholders. No installments/credit or NFC card-reader flow is introduced.

## Apple Pay / Google Pay refinement

The user clarified that CampusMarkt will have the platform processor account and requested Apple Pay and Google Pay when practical. Recommend evaluating Stripe Connect with provider-hosted Checkout first to minimize checkout maintenance. Platform account ownership does not remove connected-seller onboarding or determine whose balance receives/refunds a charge; validate that money-routing model separately.

Accepted card payments include supported digital wallets rather than requiring separate seller checkboxes for each wallet. Buyer reservation choice now groups Card & wallets. At checkout, the provider displays Apple Pay and/or Google Pay only when the payment, account and customer's environment are eligible; card entry remains an alternative. The three mobile variants illustrate Apple Pay, Google Pay and no eligible wallet. They do not assert a fixed device/OS-to-wallet mapping or guarantee that both show on every visit. Final button branding and wallet authorization sheets come from provider components.

Stripe documents Apple Pay and Google Pay support with Connect and Checkout. Hosted Checkout avoids a separate custom wallet UI/integration; embedded checkout requires the applicable domain setup and eligibility checks. This reduces incremental wallet work, not the complexity of marketplace onboarding/routing/refunds. Buyer does not need a Stripe account; wallet payment needs their own compatible configured wallet. No native app or NFC reader is needed for this proposed browser checkout. No processor selected/activated and no change to the earlier timing proposal.

Rendered and inspected the conditional-wallet board and desktop checkout refinement. Exports: `12-wallets-checkout-overview.png`, `12-wallets-checkout-desktop.png`, and individual Apple/Google/card-only mobile variants. Refreshed earlier method-label exports. The previous card-only checkout remains a valid fallback composition. Official references: [Apple Pay web](https://docs.stripe.com/apple-pay?platform=web), [Google Pay web](https://docs.stripe.com/google-pay?platform=web), [Checkout](https://docs.stripe.com/payments/checkout), [Connect charge routing](https://docs.stripe.com/connect/charges).

## Latest refinement: stacked branded buttons

The user requested Apple Pay and Google Pay together, vertically stacked, using their familiar visual presentation. The current desktop/mobile proposal now shows both eligible methods in one checkout above card entry: black Apple Pay with Apple's actual SDK logo artwork and white outlined Google Pay with Google's official colored-G button artwork. Equal 350 px widths, approximately 52 px heights and a 12 px vertical gap. Provider eligibility still determines which buttons actually render; both-present is a hypothetical valid checkout state, not a promise to display unsupported actions. Earlier separate-wallet/text-only examples are hidden as archived references.

Size refinement following user review: reduced both buttons from 350 × 52 px to 294 × 44 px, centered in the payment form with a 12 px gap. Scaled the official artwork proportionally and moved the card section upward by 16 px. Applied to mobile, desktop and overview copies; rendered both screens to check spacing. The 44 px height preserves a comfortable touch target.

New exports: `12-wallets-stacked-mobile.png`, `12-wallets-stacked-desktop.png`, `12-wallets-stacked-overview.png`. Existing `12-wallets-checkout-overview.png` and `12-wallets-checkout-desktop.png` now point to this current composition. Actual implementation uses provider/system-rendered buttons and authorization sheets, not the screenshot assets or a custom wallet imitation.

Visual sources: [Google Pay brand guidelines](https://developers.google.com/pay/api/web/guides/brand-guidelines), its [official white button artwork](https://developers.google.com/static/pay/api/images/brand-guidelines/plain-button-white-pill-shape.png), and [Apple Pay SDK](https://applepay.cdn-apple.com/jsapi/v1/apple-pay-sdk.js) button-logo SVG (the 105 × 43 white logo from the SDK, rendered unchanged at 4x through FigCraft CLI). See [Apple button guidance](https://developer.apple.com/documentation/applepayontheweb/displaying-apple-pay-buttons-using-javascript). Local assets under `design/assets/payment-brands/` are design references only. Rendered both screens and checked labels, spacing and bounds; saved native file and exports. Recovered a minimized/unresponsive FigCraft control window using Computer Use window activation; no source code or provider setting changed.

## Seller setup and provider decision

Stripe Connect is the first integration candidate to assess for multi-seller online payments. Ordinary single-merchant Stripe Checkout alone does not settle the marketplace's seller onboarding, routing, refunds and financial responsibility. Before choosing a charge configuration, validate Germany-based private/occasional sellers, relevant categories, identity requirements, minimum/maximum amounts, liability, statement descriptors, fees, support obligations and supported local-pickup evidence with the provider. Documentation about connected accounts is not confirmation that CampusMarkt's exact C2C business model is approved.

PayPal via Stripe is conditional: documented Connect support requires manual marketplace approval and supports destination charges / separate charges and transfers, not direct charges or on_behalf_of. Do not pick direct charges and then promise PayPal through that same configuration. Alternatively, PayPal's separate multiparty platform also needs live approval; two providers add reconciliation/support complexity. Prefer one approved integration that fits the business, rather than promising every rail up front.

The setup mobile is a pre-onboarding state; enabled settings/preferences and buyer-method screens are a separate hypothetical post-approval snapshot. Enabled options must reflect actual seller/account capabilities. Never expose an unusable online method because its checkbox was once selected. Provider identity verification is distinct from optional university verification and does not grant a university badge. Cash selling remains possible without either badge or provider account.

## Agreement, method changes and money safety

- Snapshot accepted methods and the buyer's selection on the reservation. Seller editing defaults/listing methods must not silently change an existing agreement. Request explicit reselection if a method becomes unavailable.
- Allow changing to another accepted method before payment only when no attempt is unresolved. Reconcile a pending/unknown charge before enabling cash, another provider or a new charge; one successful payment per agreed obligation.
- Revalidate reservation, agreed amount and seller capabilities server-side before checkout. A cancelled/completed/unavailable reservation cannot be charged by a stale open page. An amount change requires fresh consent and invalidates stale checkout sessions.
- Reservation cancellation and provider callbacks require guarded concurrency. If a late payment succeeds after cancellation, do not create another reservation or silently retain the money: reconcile/compensate with a refund and an actionable case.
- No capture occurs just because checkout opened or the method was selected. Surface processing, authentication-required, declined and user-abandoned/closed states distinctly. A closed checkout is not evidence that no charge occurred.
- Pending, failed or delayed payout does not undo a successful buyer payment or justify asking for a second payment.
- Cash has no online charge/refund or provider-confirmed Paid badge. Seller completion records the handover after direct settlement; it is not payment-provider evidence.
- For online-paid pre-handover cancellation, proposed policy is a full refund to the original method. The seller refund screen illustrates an authorized seller request. A buyer needs a cancellation/refund request and escalation route rather than unrestricted access to a seller/provider refund command. Eligibility, execution authority and exceptions need approval.
- Refund requested, provider-confirmed refund and refund failure are separate. Do not equate request submission with money returned, invent a bank deadline or erase the payment record. An unresolved refund/cancellation remains a tracked exception; inventory must not be silently re-offered as a new paid sale until the specified compensation/release rule is satisfied.
- Post-handover complaints follow a defined support/dispute policy and provider process, not unrestricted reversal of a completed pickup. Chargebacks may occur independently of marketplace completion. The state board is an entry point, not a completed dispute-management design.

## Fees and privacy

The €22 gross, €0.60 fee and €21.40 net are fictional arithmetic fixtures, **not a Stripe/PayPal quotation**. The no-added-buyer-fee checkout is a proposed commercial assumption, not an approved tariff. Who absorbs fees, any commission, fee disclosure, non-returned processing costs and refund funding remain open. A final checkout must disclose every buyer charge before confirmation; seller net estimates must be visible before enabling online sales, with actual fee/receipt evidence afterward. No fee is hidden in a post-payment surprise.

CampusMarkt must not receive/store raw card/CVC, PayPal credentials or online banking authentication. Use provider-hosted onboarding and fields, server-only secrets, authenticated participant projections, signed provider events, idempotent mutations, duplicate/out-of-order handling and reconciliation. No raw payment/contact identifiers or private message bodies in ordinary telemetry. Payment-related provider redirects and approved authentication are not chat contact-sharing violations.

GIVE_AWAY bypasses payment selection and checkout; show Free, never a fabricated €0 charge. WANTED remains its existing response flow without checkout. Provider minimum charges may exceed the current offer minimum (€0.01); validate and present usable alternatives before a method is selected, not after accepting an impossible charge.

## Design inventory and QA

Mobile: listing accepted methods (checkboxes), seller setup handoff, buyer method (single-choice), reservation awaiting payment, card checkout, PayPal redirect handoff, confirmed buyer payment, seller reservation after payment, seller cancel/refund request, payment/fee/payout details, cash reservation. Desktop: payment settings and checkout. Boards: listing/form/reservation entry points; three-step method/checkout overview; payment/handover outcomes; nine recovery/refund/payout/dispute states.

Rendered and visually inspected overview panels, card, PayPal, setup, refund, seller payment details, states and both desktop screens. Corrected multiple-method seller controls to checkboxes; buyer selection remains radio-style. PNG exports and native editable file saved. No application code, software test suite, SDK installation, provider activation or live transaction.

Remaining before implementation: provider eligibility and model approval, cost/liability decision, supported seller onboarding and restriction flows, full buyer receipt and buyer refund request, provider authentication screen handoff, detailed dispute/support flow, full DE and 320 px/tablet/keyboard/accessibility checks, state transition/payment reconciliation spec and independent validation. Current artwork is a reviewable proposal, not an implementation-approved payment spec.

## Official references checked on 2026-10-16

- [Stripe Connect](https://docs.stripe.com/connect): multi-party accounts, onboarding, payment routing and payouts.
- [Stripe hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding): provider verification forms and capability-dependent requirements; return alone does not prove enablement.
- [Stripe Checkout](https://docs.stripe.com/payments/checkout): hosted/embedded payment UI options.
- [Stripe PayPal](https://docs.stripe.com/payments/paypal): Germany availability, manual Connect approval and charge-model limitations.
- [Stripe refunds](https://docs.stripe.com/refunds): refund lifecycle and failures.
- [PayPal multiparty overview](https://developer.paypal.com/platforms/overview): seller onboarding, payouts, disputes and live-platform approval.
- [Stripe Tap to Pay](https://stripe.com/terminal/tap-to-pay): SDK/device-dependent contactless acceptance, distinct from this responsive-browser checkout proposal.
