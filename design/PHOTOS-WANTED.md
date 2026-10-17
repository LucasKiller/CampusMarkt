# Multiple photos and Wanted references

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Status: static proposal for visual review. Source: FigCraft page **07 · Photos & Wanted references — direction A** in `CampusMarkt-Redesign.figcraft`. No application code, uploads or live listings changed.

The user approved the drag-reordering and EN/DE visual refinement and asked to continue to the next screen unit. That acceptance establishes the visual direction; interaction/device and final design validation remain pending.

## Included compositions

- Sell and Wanted mobile creation with three photos and two-column upload grids.
- Wanted desktop creation with three reference photos and the actual cover in the live preview.
- Wanted detail with one photo, three photos and eight photos on mobile; three-photo desktop detail.
- Sell detail with three photos on desktop and mobile.
- Enlarged reference-image viewer on desktop/mobile.
- Maximum-eight-photo manager with removal, ordering and explained unavailable add/capture controls.
- Mobile comparison board showing the upload section, single-photo Wanted and multi-photo Wanted in 390 × 844 viewport compositions.

## Behavior represented

1. The upload section grows into additional rows as photos are added. Mobile uses two columns; desktop offers a wider grid. Existing fields follow the expanded photo section. The contextual form action remains fixed in the viewport.
2. The first successfully uploaded photo is the cover. At the user's request, the primary ordering interaction is now drag by a visible six-dot handle: mouse/pointer on desktop, touch by the dedicated handle on mobile so page scrolling remains possible outside it. A floating preview, original-position placeholder and insertion marker communicate the pending order. Dropping updates the cover when the first position changes. Cancel/Escape restores the original order. Remove and grip/menu targets are 44 px. The quiet photo-options menu retains Move earlier / Move later / Make cover as click/keyboard alternatives; Make cover moves that photo to the first position. The first cannot move earlier, and the last cannot move later. Removing the cover promotes the next image while preserving remaining order.
3. The limit is eight successfully uploaded photos, with the existing 5 MB JPEG/PNG/WebP constraints. At eight, capture/gallery controls show the limit and explain that a photo must be removed before adding another. Pending/failed files are governed by page 06 recovery designs and do not count as completed uploads.
4. Wanted photos are optional references supplied by the poster. With zero, retain the generic request placeholder from page 05/06. With one or more, display the supplied cover in the form preview and public listing detail, replacing the decorative placeholder. Label it Reference photo(s). User-entered title and description explain the desired object; the interface does not recognize or infer it.
5. A single photo has no counter, redundant thumbnail row or previous/next controls. It can open the larger viewer.
6. Multiple photos use the cover as the initial image, an active/total counter, selectable thumbnails and previous/next controls. Mobile also supports swiping; thumbnails scroll horizontally when they exceed the available width, with the next thumbnail partially visible. Desktop fits up to eight small thumbnails in its gallery column. The initial previous control is inactive; the final next control is inactive.
7. Tapping/clicking an image opens the viewer, preserving the selected image. The intended implementation supports keyboard navigation/Escape, meaningful image labels, focus return and mobile zoom. Viewer behavior remains a proposal to validate during implementation; the FigCraft artifact itself is static.
8. A Wanted with images retains its Wanted label and contact action. Adding references does not introduce purchase, offer or reservation controls. Other listing types reuse the same media layout with their existing type-appropriate actions.

## References and review

Additional refinement board: **Photo drag and language / EN–DE refinement**, exported as `07-drag-and-language.png`. It compares a drag in progress, the open English/German selector and the same photo section in German. A separate photo-options board documents the click/keyboard alternative. The supplied grip/overflow controls replace the always-visible directional button rows in the current multi-photo form and max-eight examples. Actual pointer/touch/keyboard behavior remains for implementation; the board is static.

Creation/edit/review/success mobile headers now show a discoverable globe + EN/DE + chevron selector with a 44 px height. Its preference is shared with the main navigation, follows feature 013 and AD-020 (English without an explicit saved choice), and must preserve the current fields, uploaded images and image order while changing UI labels. Author-written titles/descriptions remain untouched. Choosing a UI language does not translate listing content or add server-persisted drafts. The German board checks the visible photo-section labels, not the entire German journey.

Checked existing features 004 (photo count, order and cover), 005 (ordered gallery, single-image behavior, optional Wanted placeholder, responsive eight-photo gallery) and 024 (consistent stored-photo display) alongside the current design handoff. The three-photo examples use different crops of the existing chair reference photograph, and the eight-photo state repeats those crops to illustrate positions. They are fictional mockup content, not distinct uploaded photos or actual inventory. No image editing or object recognition is implied.

Rendered and visually inspected the mobile comparison, full mobile Wanted creation/detail, desktop Wanted form/detail, eight-photo manager, eight-image thumbnail strip and expanded viewers. Photo-manager, gallery, narrow-width/localization, focus/keyboard, zoom and overflow interactions still require implementation/device validation and final independent design validation.

Exports use the `07-` prefix. The earlier zero-photo and one-photo creation designs remain on pages 05/06 so the states can be compared without replacing them.
