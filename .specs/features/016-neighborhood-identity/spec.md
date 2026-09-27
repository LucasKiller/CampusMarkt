# 016 Neighborhood identity

## Problem Statement

The approved marketplace layout is consistent on the core journey, but the home hero still uses abstract decoration and the cards have little of the local, welcoming personality chosen for CampusMarkt. The user approved a 70% local and welcoming, 30% young and expressive direction after reviewing a concrete home and card mockup.

## Goals

- [ ] Show a distinctive, item-led home without fictional listings or images.
- [ ] Give home and search cards the same restrained interaction language.
- [ ] Preserve the existing marketplace flows, responsive navigation, and English/German localization.

## Out of Scope

| Feature | Reason |
| --- | --- |
| New listing, payment, or trust capabilities | The work changes presentation only. |
| Redesign of authenticated supporting flows | This slice establishes the approved identity on discovery first. |
| Generated photos in production | The mockup photos were conceptual; real listings own their imagery. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Visual direction | 70% local/welcoming, 30% young/expressive | User approved the shown mockup. | y |
| Hero imagery | Use current feed images, with honest text tiles if a photo is absent | Avoid implying that generated examples are live listings. | y |
| Motion | Short action feedback on the existing cards and controls, removed under reduced motion | Adds energy without distracting from browsing. | y |

**Open questions:** none.

## User Stories

### P1: Local home identity

**User Story**: As a visitor, I want the home to feel distinctly local and lead me into actual listings, so I can discover useful things nearby.

**Why P1**: The home is the first contact with the marketplace identity.

**Acceptance Criteria**

1. WHEN a visitor opens the home THEN the system SHALL show the approved two-column headline/search and item collage at desktop width.
2. WHEN a visitor opens the home at 390px THEN the system SHALL show the search in the first viewport and the listing section without horizontal overflow.
3. IF a current feed item has no photo THEN the system SHALL use a textual item tile in the hero rather than a fictional photo.
4. WHEN a visitor selects German THEN the system SHALL display the new home copy in German.
5. WHEN a visitor selects English THEN the system SHALL display the new home copy in English.

**Independent Test**: Open home at 390px and 1440px in both locales, including a feed with no photos.

### P1: Calm, expressive discovery cards

**User Story**: As a visitor, I want cards that make items easy to compare and respond clearly to my actions.

**Why P1**: The card is the marketplace's most repeated visual element.

**Acceptance Criteria**

6. WHEN a visitor views cards on home or search THEN the system SHALL show a square media plate, title, price or intent, pickup area, seller, and type/status text.
7. WHEN a pointer hovers a card THEN the system SHALL animate only the media transform for at most 220ms.
8. WHILE reduced motion is requested THEN the system SHALL suppress card media and favorite transforms.
9. WHEN a visitor focuses a card or favorite button with a keyboard THEN the system SHALL show a visible focus indicator.

**Independent Test**: Inspect cards in both routes at desktop/mobile, hover, tab, and reduced-motion emulation.

## Edge Cases

- IF the public feed is empty THEN the system SHALL show the existing empty state while the hero uses generic textual marketplace tiles.
- IF a card has no photo THEN the system SHALL retain a square, labeled placeholder.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VIS-01 | P1: Local home identity | Execute | Implementing |
| VIS-02 | P1: Calm, expressive discovery cards | Execute | Pending |

**Coverage:** 2 total, 2 mapped to tasks, 0 unmapped.

## Success Criteria

- [ ] New browser proof for home layout, locale, and honest imagery passes.
- [ ] Existing marketplace visual-system browser proof remains green.
- [ ] Home and search have no horizontal overflow at 390px.
