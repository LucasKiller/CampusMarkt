# 016 Neighborhood identity validation

**Date:** 2026-09-27  
**Verdict:** PASS  
**Verifier:** independent sub-agent (author ≠ verifier)  
**Diff range:** `41012ec^..e8383d7`

## Validation: PASS

## Task completion

| Task | Status | Evidence |
| --- | --- | --- |
| T1 | Complete | Home composition, copy, honest item tiles, and responsive layout are covered by `apps/web/tests/neighborhood-identity.spec.ts:38`, `:65`, `:93` and `apps/web/src/components/marketplace/home-hero-showcase.test.tsx:26`. |
| T2 | Complete | Card motion and focus are covered by `apps/web/tests/neighborhood-identity.spec.ts:116`, `:145`, `:172`. |
| T3 | Complete | Initial empty server feed and pressed favorite under reduced motion are covered by `apps/web/tests/neighborhood-identity.spec.ts:82` and `:145-169`. |

## Spec-anchored acceptance criteria

| AC | Expected outcome and assertion evidence | Result |
| --- | --- | --- |
| 1 | Desktop two-column headline/search and item collage: `apps/web/tests/neighborhood-identity.spec.ts:44-62` asserts the approved heading, three actual listing links, and copy ending before the collage begins. | PASS |
| 2 | At 390px search is in the first viewport and no page overflow: `apps/web/tests/neighborhood-identity.spec.ts:65-79` asserts search y < 844, listing section proximity, and `scrollWidth <= innerWidth`. | PASS |
| 3 | An item without a photo produces a textual hero tile: `apps/web/src/components/marketplace/home-hero-showcase.test.tsx:26-38` asserts its actual title and listing link with no `<img>`; implementation is `home-hero-showcase.tsx:22-41`. | PASS |
| 4 | German copy: `apps/web/tests/neighborhood-identity.spec.ts:103-113` sets the locale cookie and asserts the German heading and search action. | PASS |
| 5 | English copy: `apps/web/tests/neighborhood-identity.spec.ts:97-101` asserts the English heading and search action. | PASS |
| 6 | Home and search cards retain square media, title, price/intent, area, seller, and type/status: `apps/web/tests/marketplace-visual-system.spec.ts:109-179` asserts the fields, square dimensions, giveaway/wanted intent, and reserved status on both routes. | PASS |
| 7 | Hover transforms only media within 220ms: `apps/web/tests/neighborhood-identity.spec.ts:116-142` asserts `transitionProperty === 'transform'`, duration <= 220ms, changed image transform, and unchanged card transform on home and search; CSS is `apps/web/src/app/globals.css:445-454`. | PASS |
| 8 | Reduced motion suppresses media and favorite transforms: `apps/web/tests/neighborhood-identity.spec.ts:145-169` emulates reduced motion, hovers media, presses favorite, and asserts computed transforms remain `none`; CSS is `apps/web/src/app/globals.css:1086-1095`. | PASS |
| 9 | Keyboard focus is visible on card link and favorite: `apps/web/tests/neighborhood-identity.spec.ts:172-184` asserts solid outlines after keyboard focus; CSS is `apps/web/src/app/globals.css:41-44`, `:432-435`. | PASS |

**Result:** 9/9 acceptance criteria have outcome-specific evidence; no spec-precision gap.

## Edge cases

- Initially empty public feed: `apps/web/tests/neighborhood-identity.spec.ts:82-90` loads `/?e2eEmptyFeed=1` and asserts zero invented listing links or images, exactly three generic type-filter links, and the existing `.empty-feed-state`. The fixture is gated by `E2E_TEST` in `apps/web/src/app/page.tsx:68-78`. PASS.
- No-photo card: `apps/web/tests/marketplace-visual-system.spec.ts:205-227` asserts a labeled placeholder, no image, and square media. PASS.

## Gate

Ran the `build` gate from `tasks.md`: `npx playwright test neighborhood-identity.spec.ts marketplace-visual-system.spec.ts --config apps/web/playwright.config.mjs && npm run check`. Exit 0: 22/22 Playwright tests, 1,279/1,279 unit tests, and 153/153 architecture tests passed. Typecheck, lint, format check, secret scan, and docs command check passed. No skipped tests. The prior browser file retained its 15 tests; the feature added seven browser tests. Playwright stopped its managed server after the run. The local Supabase port was unavailable, so E2E fixtures supplied the feed; this did not affect the gate verdict.

## Discrimination sensor

Ran two behavior mutations in a detached scratch worktree at `e8383d7`; the real tree remained unchanged (the pre-existing untracked `validation.md` was the only porcelain entry before and after).

| Mutation | Targeted test | Result |
| --- | --- | --- |
| Remove `.favorite-button-card:active` from the reduced-motion `transform: none` rule at `apps/web/src/app/globals.css:1093`. | `neighborhood-identity.spec.ts:145` | KILLED: expected `none`, received `matrix(0.88, 0, 0, 0.88, 0, 0)` at `:166`. |
| Remove generic tiles by changing `genericTiles.slice(shownItems.length)` to `slice(3)` at `apps/web/src/components/marketplace/home-hero-showcase.tsx:108`. | `neighborhood-identity.spec.ts:82` | KILLED: expected three browse links, received zero at `:88`. |

**Sensor result:** 2/2 killed. `git worktree remove --force` unregistered the scratch but left a residual directory of installed dependencies; the command to remove that directory was blocked by host policy. It is outside the real repository at `C:\Users\INOVV\Documents\GitHub\CampusMarkt-verify-016-r2` and contains no live terminal or server process.

## Code quality and scope

The implementation follows `AGENTS.md`, `DESIGN.md`, and the approved visual direction. The diff is confined to the home/discovery presentation, tests, and feature documentation. Real feed imagery is used; no generated image is shipped. No marketplace capability, authorization rule, or external state changed. `git diff --check 41012ec^..HEAD` passed. This automated verification does not substitute for the user's subjective visual review.

## Traceability

| Requirement | Validation |
| --- | --- |
| VIS-01 | Verified: AC1-5 and empty-feed edge case. |
| VIS-02 | Verified: AC6-9 and no-photo card edge case. |

**Overall:** Ready for visual review. No grounded new lesson arose in this clean re-verification; the earlier failed sensor was already recorded in `.specs/lessons.json` by the first verifier.
