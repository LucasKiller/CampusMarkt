# Navigation refinement — direction A

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Status: direction accepted by the user, with a spacing correction completed. Publishing and language now have a 48 px horizontal gap on desktop and a 12 px vertical gap on mobile. The user authorized moving on to other screens. No application implementation or feature contract is changed.

## Research

Inspected public pages on 2026-10-16:

- [Vinted](https://www.vinted.de/): persistent desktop search, a visible selling action, account/language utilities and a separate category row. Use the hierarchy and discoverability, keeping CampusMarkt's original identity.
- [Karrot](https://www.karrotmarket.com/): local context and a prominent entry to listing an item. The [official Korean mobile help screenshot](https://cs.kr.karrotmarket.com/wv/faqs/27215) illustrates stable bottom destinations; region-specific community and map features do not belong in CampusMarkt V1.
- [Wallapop](https://es.wallapop.com/): the public header exposes search, authentication and selling, with categories below. Browser observation was partially obscured by its consent UI, so it is supporting structural evidence rather than the primary visual reference.
- [Airbnb](https://www.airbnb.com/): clear separation between search, main navigation and profile controls. Apply spacing/hierarchy only to the CampusMarkt goods marketplace.

## Proposed navigation

Desktop uses an 88 px primary row and a 48 px discovery row. The primary row contains the text wordmark, search, labeled favorites/messages/account controls, List an item and an explicit language selector. The discovery row contains Explore, Categories, Free finds, Wanted and a Braunschweig pickup-area selector.

Mobile uses the same text identity, an immediately visible publishing action, pickup-area and language controls, and a search field. A light floating bottom surface has five stable destinations: Explore, Search, Favorites, Messages and Account. A soft teal capsule and a bold label identify the current destination. Desktop and mobile retain the same item intent and navigation vocabulary.

| Control | Destination or behavior |
| --- | --- |
| Wordmark / Explore | Public home |
| Search | Existing search route; preserve the query and filters |
| Categories | Existing goods-category filters |
| Free finds / Wanted | Existing listing-type filters |
| Braunschweig | Existing coarse pickup-area selector; no new city expansion or location tracking |
| Favorites / Messages | Existing destinations, with the established authentication redirect when needed |
| List an item | Existing creation flow, including authentication when needed |
| Account | Sign-in for visitors; existing account/menu destinations for members |
| Language | Existing English/German selection and cookie persistence |

The member example uses the public initial M, sample name Maya and a fictional unread count of 2. Real unread badges must derive from actual unread conversations and disappear when there are none. The public initial does not stand for university verification. Private email addresses never appear in these controls.

## Intended interaction contract

- Creation, editing, review and publication-success compact headers expose the same EN/DE preference through the globe/code/chevron control. The selector shows English and Deutsch by name and a current-choice check. Switching must retain unsaved form values and uploaded-photo order, and must not translate the author's listing text. Static open/DE examples are on page 07 (`07-drag-and-language.png`); implementation/device validation remains pending.

- Keep keyboard focus visible and expose accessible names for every icon. Active destinations need a textual/current-page indication as well as color.
- Minimum interactive targets remain 44 × 44 px. The small language surface and search glyph need full-size hit areas in implementation; the static paint size is not the hit target.
- The mobile dock is fixed above the bottom safe area. Reserve space at the end of the document, including the dock, safe area and spacing, so final content can scroll fully clear of it.
- When a modal filter sheet or the software keyboard is open, prevent the global dock from overlapping its content and action row. Restore it after dismissal.
- On a listing detail screen with a persistent item action bar, use one coordinated bottom layout; finalize it with that screen's design.
- Account, categories, pickup-area and language menus must support keyboard opening/closing, focus return and Escape. Static open-account and focus examples are on the anatomy board; other open states remain to be drawn.
- Use short 150–200 ms state feedback and respect reduced motion. Do not animate navigation in or out automatically in this proposal.

## Visual checks

Rendered the revised home and search contexts, visitor/member desktop headers, active mobile docks and 320 px composition. Corrected the publishing/search icon sizing, visitor account-icon position and the mobile search footer spacing. The existing earlier pages remain as history. Interactive behavior, screen-reader operation, long German labels and intermediate widths require later validation before coding.
