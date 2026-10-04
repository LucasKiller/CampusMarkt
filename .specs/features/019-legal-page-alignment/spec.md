# Legal Page Alignment Specification

**Status:** Locally implemented on 2026-10-04; awaiting independent validation.

## Problem Statement

The three pages linked from the marketplace footer use unrelated styling and omit the marketplace navigation and footer. The Impressum also describes access as student-only, contrary to the approved open-access product model.

## Goals

- [x] Align all three legal pages with the approved web visual system.
- [x] Preserve bilingual legal access and navigation on desktop and mobile.
- [x] Correct user-facing product descriptions that contradict the approved product model.

## Out of Scope

| Item | Reason |
| --- | --- |
| New legal operator identity or address | The operator confirmed the current details on 2026-10-04. |
| Legal advice or substantive replacement of statutory clauses | The request concerns presentation and consistency with the current product. |
| Deployment | The project guide authorizes local work and commits only. |

## Assumptions & Open Questions

| Assumption | Decision | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Visual reference | Follow `DESIGN.md` and reuse the existing marketplace header, footer, and semantic CSS tokens. | They are the approved site design. | yes |
| Legal identity | Retain the current operator and university details. | The operator explicitly confirmed them. | yes |
| Product wording | State that anyone in Braunschweig may use the marketplace and verification is optional. | Matches product vision and MVP scope. | yes |

**Open questions:** none for this local change.

## User Stories

### LEGALUI-01: Read legal pages in the site design

**User Story:** As a visitor, I want the legal pages to look and navigate like the marketplace so I can recognize where I am and move between sections.

**Acceptance Criteria:**

1. WHEN a visitor opens `/impressum`, `/datenschutz`, or `/agb` THEN the page SHALL render the marketplace header, brand colors, readable legal content, and the same three legal footer links as the home page.
2. WHILE a legal page is viewed at a 320px mobile width, the page SHALL keep its content and language control accessible without horizontal overflow or overlap with mobile navigation.
3. WHEN a visitor follows any home footer legal link THEN the destination SHALL load with the corresponding English or German title for the selected locale.

**Independent Test:** Navigate from the home footer to each page in both languages and inspect computed style and mobile geometry.

### LEGALUI-02: Describe the current product accurately

**User Story:** As a visitor, I want the legal-page product description to reflect who can use CampusMarkt.

**Acceptance Criteria:**

1. WHILE viewing the Impressum in either language, the page SHALL state that the marketplace is open to everyone in Braunschweig and university verification is optional.
2. WHILE viewing legal pages in English, the page SHALL retain the notice that the German statutory text is binding.
3. WHILE viewing privacy and terms pages, the headings SHALL use user-facing language without internal architecture decision identifiers.

**Independent Test:** Assert the rendered copy in both languages and the absence of internal `AD-` labels.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LEGALUI-01 | Site design and navigation | Execute | Implemented; awaiting independent validation |
| LEGALUI-02 | Accurate product language | Execute | Implemented; awaiting independent validation |

## Success Criteria

- [x] Focused browser and page tests pass for all three links and both locales.
- [x] Typecheck, lint, formatting, and spec/task gates pass.
- [ ] Independent validation records PASS in `validation.md`.
