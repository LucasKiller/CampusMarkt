# CampusMarkt - Produto aprovado

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Updated 2026-10-16. Current curated native document: **CampusMarkt — Produto aprovado**, saved as `CampusMarkt-Approved.figcraft`. The original `CampusMarkt-Redesign.figcraft` remains the unchanged exploration/history source for this consolidation.

## Approval record

The user approved the design-system proposals, requested a separate FigCraft document containing approved ideas and a coherent journey, and explicitly chose **integrated checkout as the main design journey**. This approves the visual reference and its design consolidation. Existing V1 implementation remains governed by approved feature specifications; online payments and expanded administration require their own implementation contracts. No app, payment account, live role or deployment was changed.

Selected: A / Local discovery; account B; CM mark; teal/Inter system; social university-cap rosette; accepted navigation; distinct status/condition/report colors; mobile camera/files; draggable gallery direction; EN/DE; free chat without quick replies; blocked contact-send direction; bidirectional blocking; moderation; administration visual layouts; loading/recovery patterns; stacked supported wallets at normal layout size. Rejected Hazaar B, early account hub, first exploration, quick replies/send-anyway and obsolete separate-wallet layouts are absent from the new file.

## Document structure

Account clarification: **Account B is the approved main account screen**. On page 13, its desktop/mobile frames now sit first at the origin; profile settings follow, while public profiles are explicitly labeled and placed in their own later section. Public profile is not an alternative account dashboard. Dedicated Account B prototype entries and public-profile/edit links make that distinction explicit. The former layout placed the selected B frames far below public profile, which obscured the selected direction.

24 native pages: start/index, brand/system, motion, discovery/search, detail, publish/edit, photos/Wanted references, my listings/favorites, messaging, offers/chat safety, pickup, checkout/receiving, access/recovery, account B/profile, university verification, reporting/blocking, moderation, help/legal, administration, shared recovery, buyer journey, seller journey, administration journey, and delivery criteria.

Start at **00 · Comece aqui**. Its 20 clickable entries open three journey maps, sixteen product areas and delivery criteria. Each journey has eight stage links and a return to the index. Existing standard/reduced motion demonstrations are preserved. Primary action examples connect negotiation, method choice, checkout, confirmation, payment record and pickup views; this is an illustrative prototype, not a fully functional application. Some screen controls remain static.

## Main journeys

- Buyer: browse > listing > private conversation/counteroffer > acceptance/reservation > accepted payment method > meet and inspect > checkout > provider-confirmed payment > seller-confirmed physical pickup. Reservation itself never charges. The sample counteroffer is €22 for a €25 chair. Direct asking-price request is separately illustrated at €25 without silently changing it to a €20 offer.
- Seller: configure accepted methods/onboarding > publish with camera/files > review > incoming interest > counteroffer > reserve > check receipt > confirm actual handover. Receipt and bank payout remain separate.
- Free: no payment and no checkout, only pickup. Wanted: private response to the request, without financial reservation or checkout.
- Administration: account B conditional entry > directory/context > allowed corrections > before/after review > confirmation > read-only activity. Moderation and staff-access management remain distinct capabilities. Private conversations are excluded.

## Consolidation and derived additions

The new file preserves the selected native layers, images, styles, variables and motion, removes obsolete alternatives and duplicate overview sheets, and replaces 147 exact old wordmark occurrences with the approved CM signature treatment. Small shell variants retain smaller type. The discovery, account and moderation headers were visually inspected after the change.

Integrated-payment language replaces obsolete blanket statements that CampusMarkt never processes payment. Explicit cash/direct-method alternatives remain. New derived views close the main journey: buyer payment record on mobile/desktop, paid reservation, buyer completed pickup, Free pickup, Wanted response, asking-price request/sent and its matching conversation. Create Sell now exposes accepted-method defaults; listing detail shows the methods before commitment. These are consolidation additions based on accepted behavior, available for visual review in this document.

The starter system now has **60 variables** and **12 text styles**: the previously displayed support ramp is tokenized and mobile Display/H2 plus regular compact styles are present. `approved/tokens.json` is native interchange; `approved/tokens.figcraft.css` is the raw unitless numeric export. Existing `design-system/tokens.css` describes the earlier 55-variable snapshot, not this expanded collection. No token file is imported into the app.

## Open contracts and validation

The native page **23 · Contratos e critérios de entrega** records unresolved implementation work without treating it as a new approved feature: payment provider/routing/onboarding, actual costs, payout, authentication, paid cancellation, refund/dispute rules; admin field/capability matrix and access lifecycle; final contacts/legal content; full EN/DE/320/tablet/long-content compositions; keyboard, focus, screen reader, safe-area and reduced-motion integration. The earlier coverage backlog remains relevant and is not erased by visual approval.

Legal layouts are examples, not finalized legal terms. Payment references, names, fees and amounts are illustrative fixtures. Wallet visibility/authorization must come from an eligible provider component; the mockup does not guarantee both wallets appear for every customer. Success needs authoritative confirmation, uncertain results reconcile before retry, and pickup never substitutes for payment confirmation.

Local checks: new index/journey/criteria and added payment/Free/Wanted views exported and visually inspected; key signature headers inspected; native index-to-buyer-to-checkout navigation exercised. Per-flow action wiring and destinations were checked programmatically. Native source saved separately. This is local design QA, not independent final application validation or complete coverage of every control/state.

Review exports and tokens live in `approved/`. Start view: `approved/home.png`; journey views: `approved/buyer.png`, `approved/seller.png`, `approved/ops.png`; acceptance/remaining criteria: `approved/rules.png`. Native IDs and inventory are in `approved/manifest.json`.
