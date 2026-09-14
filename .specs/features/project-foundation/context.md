# Project Foundation Context

**Gathered:** 2026-09-14
**Spec:** `.specs/features/project-foundation/spec.md`
**Status:** Ready for design

## Feature Boundary

This feature converts the confirmed CampusMarkt planning conversation into repository governance, navigation, and six durable product documents. It does not create application code, database schema, infrastructure, or empty specifications for later features.

## Implementation Decisions

### Product identity and audience

- The product name is CampusMarkt.
- The launch focus is Braunschweig, initially building density around TU Braunschweig students.
- Anyone can browse. A registered account is required for supported participation.
- University verification is optional and adds trust, not access.

### Marketplace scope

- V1 supports physical goods with SELL, GIVE_AWAY, and WANTED listings.
- Registered users can use direct purchase intent or structured offers where the listing type supports them.
- V1 completes transactions through local pickup. The product shows public-meeting and inspection guidance.
- Services, housing, jobs, swaps, shipping, protected payment, meetup spots, and native mobile are deferred.

### Trust, privacy, and safety

- The primary account email and university-verification email serve separate purposes.
- Institutional email addresses are never public and should not become the normal contact address.
- A verified institutional address cannot verify multiple active accounts.
- Verification is expected to expire after 12 months. Expiry removes the badge, not account access.
- Prohibited content and unsupported content are separate classifications.

### Evolution

- Web comes first, followed by PWA and then a native Expo/React Native client if product evidence justifies it.
- Business rules stay independent from web components.
- Future protected payment uses a regulated marketplace-payment provider. CampusMarkt does not hold funds itself.
- QR and numeric confirmation represent the same future secure handover token.
- Future concepts are documented without unused schema, endpoints, states, or UI.

### Agent's Discretion

- Exact heading hierarchy, cross-link placement, and concise examples inside each document.
- Canonical technical documentation is written in English.
- Framework and package versions are selected and pinned only when their owning implementation feature starts.

### Declined / Undiscussed Gray Areas -> Assumptions

- Exact listing field bounds, offer expiry, reservation timeout, moderation service levels, and account deletion retention are not defined here. Each becomes a decision in its owning feature specification.
- Exact payment provider and protected-payment mechanics remain undecided.
- Exact multilingual copy and translation workflow remain undecided; the product requirement is German and English support.

## Specific References

- Positioning: a hyperlocal marketplace for the transfer of useful physical goods between people leaving and arriving in Braunschweig.
- Brand line: "Buy. Sell. Give away. Find what you need."
- Initial differentiation: WANTED listings, student-verification trust signal, and a later Moving Out flow.
- Safe meeting examples discussed: university areas, Mensa, and busy public places near central Braunschweig. Exact official meetup locations remain a future feature.

## Deferred Ideas

- Moving-out sales and moving bundles.
- CampusMarkt Meetup Spots.
- Protected online payments, KYC, payouts, refunds, disputes, and secure handover confirmation.
- SWAP listings.
- Services, housing, and jobs verticals.
- Native iOS and Android applications.
