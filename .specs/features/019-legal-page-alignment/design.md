# Legal Page Alignment Design

Use the existing `MarketplaceHeader` and a shared `MarketplaceFooter` for home and the three legal pages. A small server-rendered `LegalPageShell` supplies common framing, title, English binding note, mobile language control, and content region. Page-specific legal copy stays in each route. Scoped CSS in `globals.css` uses the established semantic tokens and leaves the existing marketplace styles intact.

No API, database, or locale-resolution behavior changes. Browser checks cover the footer navigation, computed design colors, and 320px layout. Page rendering tests cover product wording and the German binding note.
