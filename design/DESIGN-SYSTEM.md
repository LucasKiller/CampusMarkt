# CampusMarkt Design System v1.0

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

16 October 2026. Editable source: `CampusMarkt-Redesign.figcraft`, page **21 · CampusMarkt Design System — v1.0** (15 boards). Interactive examples: **22 · Motion playground — CampusMarkt**. Portable book: `../output/pdf/CampusMarkt-Design-System.pdf`.

Design deliverable for review, not app implementation approval. Existing feature specifications govern behavior. The user's design-system request reopened logo exploration; earlier deferral no longer prevents proposing a mark. Existing screen logos remain unchanged.

## Preserved and proposed

| Preserved from accepted designs | Newly specified for review |
| --- | --- |
| A / Local discovery, original teal, Inter 400/600/700 | CM symbol, signature, clear space, minimum sizes and inverse assets |
| Accepted navigation and language/publishing separation | Voice principles and EN/DE example wording |
| Account B and university-cap rosette | Consolidated typography, native variables/styles/components |
| Available/Unavailable/Reserved and condition colors | Support teal shades and functional field boundary mapping |
| Photography and intentional Wanted placeholder | Geometry roles and provisional breakpoint map |
| Existing dialog, feedback and reduced-motion principles | Exact durations/curves and normal/reduced native demos |

The dark brand samples demonstrate inverse assets; they do not introduce a product dark theme. New definitions await review before adoption.

## Brand and voice

The new CM monogram has an open C around an M, with round ends and a solid color. Construction uses a 48-unit grid and 5-unit stroke. Wordmark: **CampusMarkt**, preserved casing, Inter 700. Clear space and symbol/name spacing are one quarter of the nominal symbol size. Standard symbol minimum is 24 px; 16 px favicon is an optical exception requiring actual-size inspection. Lockup minimum is 160 px wide. No stretching, rotation, gradients, shadows or merger with the university seal; use a protective surface over photographs.

The CM represents the marketplace; the approved cap rosette confirms current university-email access. It does not promise identity, purchase protection or staff powers. The active twelve-calendar-month policy follows AD-019 and the amended verification spec; historical 180-day evidence is not reinstated.

Voice is local, welcoming and direct. The new 70% proximity / 30% expression guideline is creative direction, not a product metric. Labels describe actions, success follows confirmation, failure provides an available next action. EN remains the default and DE a persisted choice. Do not automatically translate names, listings or messages. Portuguese is documentation only. New German example copy still needs normal language review.

## Colors

| Role | Value |
| --- | --- |
| Brand / hover / soft | `#0B665E` / `#084D47` / `#E7F4F0` |
| Ink / muted | `#182522` / `#53645F` |
| Canvas / surface | `#F7F8F5` / `#FFFFFF` |
| Decorative line / quiet field border | `#DDE5DF` / `#CBD8D0` |
| Focus | `#9B5A18` |
| Available | white, outline `#BBDCC7`, text/dot `#23734A`, pale halo |
| Unavailable | `#F0F3F0`, gray text and circled minus |
| Reserved | `#FFF7E5` / `#80520B` |
| Report/block | `#FFF1F2` / `#B42332` |
| Existing base danger | `#A83232`, retained separately |
| New / Like new | `#F3EDFF` / `#6D42A1`; `#E5F6FA` / `#086A7B` |
| Good / Fair | `#EAF2FF` / `#24569C`; `#FFF3DA` / `#855516` |
| Decorative sun | `#E8BB64`, not small text on white |

Additional proposed support shades: `#CBE5DE`, `#A2CEC3`, `#69AA9C`, `#348A7B`, `#052E2B`. These board swatches are not approved anchor replacements or exported semantic tokens. Disabled `#89958F` is not body text.

New functional boundary mapping: `#7A8882` where a field's outline identifies the control. Existing decorative lines stay quiet. New field components use the stronger outline; old screens have not been globally changed.

Measured sRGB contrast: white/brand 6.83:1, ink/white 15.83:1, muted/white 6.26:1, report/rose 5.92:1, Available/white 5.80:1, condition pairs 6.24/5.63/6.46/5.77:1. Pair checks are not full-app accessibility certification.

## Typography and geometry

Inter 400/600/700 remains. New role consolidation:

| Role | Desktop size/line | Mobile size/line | Weight |
| --- | --- | --- | --- |
| Display | 52/55 | 32/36 | 700 |
| H1 | 40/46 | 28/36 | 700 |
| H2 | 28/36 | 24/32 | 700 |
| Card title | 16/22 | 16/22 | 700 |
| Body | 16/24 | 16/24 | 400 |
| Metadata/UI | 14/20 | 14/20 | 400/600 |
| Caption | 12/16 | 12/16 | 400/600 |

Nine native text styles exist; mobile Display/H2 and regular compact alternatives are documented roles, not all separate native styles yet. Worksheet samples are scaled for the documentation. Body tracking zero; titles up to -2%. Use locale-aware currency/dates and tabular numbers in tables.

Spacing steps: 4/8/12/16/20/24/32/48/64 px. Current controls use 10 px corners; the older 8 px guide remains legacy. Cards 16 px, photos 20 px, sheets/dialogs 24 px, filters/status pills. Buttons 44 px high, fields 52 px, icon targets at least 44 by 44 px. At 390 px: margins 20 px, gap 12 px, two 169 px discovery cards. Desktop max content 1280 px, four columns with 24 px gutters. Header/dock tokens 88/84 px require safe-area treatment in implementation.

Proposed ranges: 320-639 compact two columns; 640-1023 two; 1024-1279 three; 1280+ four. These require testing with actual content, zoom and long German copy. Use one column where necessary to preserve readable text and touch targets. Full 320 px/tablet/EN/DE coverage remains in `REVIEW-HANDOFF.md`.

## Components and patterns

Native reusable sets include three five-state button families, a four-state text field, three listing types and two interactive favorite sets. Buttons/fields expose label properties; selected component fills/strokes bind to variables. This is a starter library; not all older layers or minor controls are componentized.

Cards explicitly distinguish Sell/Give away/Wanted, price/type, approximate area, seller and optional badge. Chair/book photos are illustrative fixtures, not live inventory. Status has text. Wanted without a photo differs from failed-image recovery. Favorites sit above cropped square photos.

Accepted desktop navigation and the mobile Explore/Search/Favorites/Messages/Account dock remain, including language/publishing separation. Account B remains selected. Admin entry requires capabilities; conversations remain private. Checkbox/radio/filter, list, skeleton, photo chooser and save-feedback boards document patterns; they are not all interactive reusable components.

Feed pagination uses a confirmed cursor without invented totals. Supported mobile browsers retain both camera and gallery/files choices with permission/failure handling. Dirty forms never discard on backdrop tap. Dialog focus entry/return, Escape cancellation, named icon actions, persistent labels, error associations and live status feedback are implementation obligations. Uncertain saves require checking stored state before retrying; success requires confirmation.

## Motion and accessibility

| Token | Duration | Purpose |
| --- | --- | --- |
| Press | 80 ms | Brief press response |
| Fast / exit | 150 ms | Color feedback and leaving |
| State | 180 ms | Favorite/hover state |
| Enter | 200 ms | Dialog entrance or gallery settling |

State curve `cubic-bezier(.2,0,0,1)`, entrance `cubic-bezier(.22,1,.36,1)`, exit `cubic-bezier(.4,0,1,1)`. Favorite may reach scale 1.08; photo hover 1.02 inside its crop. Gallery tracks the gesture and settles in 200 ms. Production dialog travel is at most 12 px plus opacity.

Reduced motion removes scale, translation, spring and automatic movement while retaining immediate state, focus and text. No animated prices, invented progress, pulsing badges or blanket scroll reveals. Use deliberate transform/opacity transitions, not `transition: all`.

Page 22 demonstrates favorite state and dialog open/close plus standard/reduced navigation. Standard uses 180 ms smart animation and 200/150 ms overlay transitions; reduced uses instant transitions. The native overlay's bottom move-in illustrates timing/direction, not a measured 12 px travel. Favorite scale, photo zoom and gallery drag are specified but not all demonstrated. Browser preference detection, focus trapping and screen-reader behavior require app validation.

Contrast targets: 4.5:1 normal text, 3:1 large text/functional boundaries. Visible 2 px focus outline with spacing, logical keyboard order, 44 px touch targets, safe-area/keyboard clearance, meaningful alt text and no hover-only functionality remain required. Private account/institutional email stays private.

## Deliverables and review evidence

`design-system/` contains fifteen 1.5x PNG boards; five outlined-text SVG logo assets; 55 native variables in `tokens.json`; unchanged raw `tokens.figcraft.css`; a `tokens.css` copy with explicit px/ms units for future adoption; and `audit.json` with IDs/styles/check notes. These files are not imported into the application.

The PDF has 15 vector pages, selectable text and bookmarks. All pages were rendered and inspected in an overview, with detailed native/final views for typography, layout, controls, branding, motion and patterns. No text bounds extend outside the documentation boards. Favorite toggle and dialog open/close were exercised in the native presenter in both modes. Native source was saved. This is local visual QA, not independent final product validation.

The eight-page Koviq reference informed documentation structure, not identity, AI semantics, roles or numbered pagination. Existing accepted CampusMarkt screens remain the source for preserved choices. V1 remains responsive web, physical goods, local pickup and no platform-held funds. Payment integration and expanded admin contracts still need their own approved specs. No app coding, real role changes, publication or deployment occurred.
