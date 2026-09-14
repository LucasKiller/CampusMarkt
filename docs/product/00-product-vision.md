# CampusMarkt Product Vision

## Product Statement

CampusMarkt is a hyperlocal marketplace for the university life cycle in Braunschweig. It helps useful physical goods move from people who no longer need them to people who have just arrived or need them nearby.

The first product is a responsive web application. It launches around the TU Braunschweig community to build local supply and demand, but standard marketplace access is open to everyone. University verification is optional and acts as a visible trust signal.

> Buy. Sell. Give away. Find what you need.

## Problem

Students and residents already sell or donate furniture, bicycles, electronics, kitchenware, books, and other household goods through fragmented chat groups, informal university channels, and general-purpose marketplaces. These channels make discovery, trust, availability, negotiation, and safe pickup inconsistent.

The problem is especially visible at semester transitions:

- People leaving Braunschweig need to transfer several useful items quickly.
- People arriving need affordable goods close to where they live and study.
- Donated items often fail to reach someone who needs them at the right time.
- Repetitive messages such as "Is it still available?" do not create a reliable transaction state.

## Product Promise

CampusMarkt will make local exchange easier through:

- `SELL` listings for goods offered at a fixed asking price.
- `GIVE_AWAY` listings for free goods.
- `WANTED` listings for goods a person is trying to find.
- Structured purchase intent, offers, reservations, and status changes.
- In-product messaging to arrange local pickup.
- Optional student verification without excluding unverified users.
- Clear marketplace rules, reporting, moderation, and safe-meeting guidance.

## Initial Audience

### Primary users

- Students arriving in Braunschweig who need affordable household and study items.
- Students graduating, moving, or leaving the city who need to sell or donate goods.
- Students replacing items during the academic year.

### Secondary users

- Other Braunschweig residents who participate in the same local reuse economy.
- University communities added after the TU Braunschweig launch proves local demand.

### Access model

| Role | Access |
| --- | --- |
| Visitor | Browse, search, filter, and view public listings. |
| Registered user | Publish supported listings, favorite, message, submit purchase intent, make offers, and participate in reservations. |
| Verified student | All registered-user access plus a time-limited university trust badge. |

Verification never grants standard marketplace privileges that a registered user otherwise lacks. Losing or skipping verification does not remove normal account access.

## Positioning

CampusMarkt is not a national classifieds clone. Its initial advantage is the concentration of relevant goods, buyers, sellers, and pickup locations around the Braunschweig student community.

The brand remains CampusMarkt rather than naming one university. The launch can focus on TU Braunschweig without forcing a rebrand when HBK Braunschweig, Ostfalia, or other communities are supported.

## Product Principles

1. **Student-life relevance**: Prioritize the recurring arrival, study, moving, and departure needs of people in Braunschweig.
2. **Local first**: Design V1 around nearby, in-person pickup.
3. **Trust without exclusion**: Make university verification useful but optional.
4. **Privacy by design**: Collect and expose only data required for a defined product purpose.
5. **Trust and safety from the start**: Reporting, policy enforcement, moderation, and safe-meeting guidance are launch requirements.
6. **Structured marketplace behavior**: Model offers, reservations, and listing status explicitly instead of hiding them in chat messages or unrelated booleans.
7. **Mobile browser first**: Every V1 user journey must work on small screens.
8. **Evolution without speculation**: Document future capabilities, but implement only approved current states and interfaces.
9. **Spec before code**: Significant behavior starts with testable acceptance criteria and ends with independent evidence.
10. **Sustainability through reuse**: Measure success by useful local transfers, not only by listing volume.

## Geographic and Language Strategy

- Launch geography: Braunschweig.
- Initial density focus: TU Braunschweig students and nearby neighborhoods.
- Product languages: German and English.
- Expansion sequence: prove liquidity in one community before adding other universities or cities.
- Location design: use areas or neighborhoods for discovery; do not expose a person's precise private address by default.

## Transaction Strategy

V1 supports local pickup arranged between users. CampusMarkt provides marketplace state, communication, and safety guidance. It does not process or hold money.

Protected online payment is a later capability. When introduced, a regulated marketplace-payment provider will process and hold funds as allowed by its product. CampusMarkt will continue to own listing, offer, reservation, handover, and transaction state.

## Outcomes to Measure

The private beta will establish numeric targets before launch and track:

- **Supply**: active supported listings per week.
- **Demand**: unique users who view, favorite, message, offer, or request a listing.
- **Liquidity**: share of active listings that reach a completed local handover.
- **Time to match**: time from publication to accepted purchase intent or offer.
- **Activation**: share of registered users who complete a first meaningful marketplace action.
- **Retention**: users who return to browse or participate in a later week.
- **Trust**: optional-verification adoption without a lower completion rate for unverified users.
- **Safety**: report volume, confirmed violations, moderation response time, and serious incident count.
- **Reuse impact**: completed give-away and resale handovers.

Numeric thresholds are a pre-beta product decision. They must not be invented by an implementation feature.

## Product Non-Goals

CampusMarkt V1 is not:

- A shipping or delivery marketplace.
- A payment processor, wallet, or escrow custodian.
- A services, housing, jobs, rentals, tickets, or digital-goods marketplace.
- An auction, subscription, advertising, or algorithmic-recommendation platform.
- A national marketplace.
- A native mobile application.
- An official university system that requires institutional affiliation.

See [MVP Scope](02-mvp-scope.md) for the delivery boundary and [Future Capabilities](05-future-capabilities.md) for deferred product directions.
