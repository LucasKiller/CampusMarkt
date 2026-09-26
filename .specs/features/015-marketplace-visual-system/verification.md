# 015 — Marketplace visual system verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: 21619c8..b0d4dffe74c9810039c25f3719fdad87413add5f
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 3 rechecked the `0a26fc9..b0d4dff` fix and every remaining round-2 gap. The complete browser proof target was rerun at the new HEAD. Earlier PASS judgments carry from round 2 at `0a26fc9` where the fix did not touch their surfaces; their tests still ran at `b0d4dff`.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `DESIGN.md` semantic tokens, composition, and detail states | yes, touched detail clauses rechecked at `b0d4dff` | - | - |
| `docs/product/00-product-vision.md`, `02-mvp-scope.md`, `03-marketplace-policy.md` | carried from full round 1 at `dc13442`; no product-rule change in round-3 diff | - | - |
| `.specs/STATE.md` AD-005, AD-020, AD-021 | carried from full round 1 at `dc13442`; no decision change in round-3 diff | - | - |

The plan's referenced design conversation was not provided as a separate artifact; its approved direction is recorded in `DESIGN.md`. Rechecking the committed source found the detail title, type badge, metadata, price, pickup, description, seller, and sold/reserved/archived notices using semantic variables in `apps/web/src/app/listings/[id]/page.tsx:241-675`. `rg -n '#[0-9a-fA-F]{3,8}'` found no hex literals in that file. The `color-mix()` status backgrounds are derived from `--color-warning`, `--color-surface`, and `--color-border`. The prior binding-source contradiction is resolved.

The approved home/search/detail composition checks from round 2 remain intact: card order and favorite target, four grid tracks, desktop gallery beside reading, mobile gallery before reading, and the five mobile destinations. The round-3 diff does not change these layouts.

## Checks

Every named C1–C14 test exists in `apps/web/tests/marketplace-visual-system.spec.ts` (confirmed by `rg -n -C 2 'test\('`) and appeared individually in the HEAD run under Gate. Evidence is `file:line` in that spec unless another file is named. Rows marked carried retain their round-2 judgment at `0a26fc9`, with current line numbers after the round-3 test edit.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | Home/search identity and focus | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:19-36` — exact token values and computed focus color | PASS, carried from `0a26fc9` |
| C2 | Search and early showcase at 390px | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:43-50` — search and showcase geometry | PASS, carried from `0a26fc9` |
| C3 | Five mobile destinations and content clearance | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:57-78` — exact links, no overflow, last card above navigation | PASS, carried from `0a26fc9` |
| C4 | Five English/German navigation labels | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:85-106` — exact path/label pairs in both locales | PASS, carried from `0a26fc9` |
| C5 | Card content, square media, order and favorite target | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:117-179` — square/cover, exact type values, geometry order and ≥44px target | PASS, carried from `0a26fc9` |
| C6 | Honest no-photo placeholders | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:210-226` — WANTED/giveaway text and no images | PASS, carried from `0a26fc9` |
| C7 | Filter request values and pagination | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:248-276` — category/type/area request values and reset; `apps/web/tests/marketplace-feed.spec.ts:247-260` — second-page item | PASS, carried from `0a26fc9` |
| C8 | Empty feed/search explanation and next action | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:289-303` — explanatory copy and working reset | PASS, carried from `0a26fc9` |
| C9 | Feed/search errors and retry | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:323-360` — both error states, retry clears alert and returns to results/empty | PASS, carried from `0a26fc9` |
| C10 | Public detail and safe action composition | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:365-408` — exact public values, private-data negatives, gallery/reading geometry, active actions, and `toHaveCSS('color', 'rgb(24, 37, 34)')` at `:368-371` | PASS, refreshed at `b0d4dff` |
| C11 | WANTED/GIVE_AWAY actions | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:413-428` — WANTED no buy/offer and message; GIVE_AWAY free, interest/message, no offer | PASS, carried from `0a26fc9` |
| C12 | Reserved/sold/archived/owned actions and status | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:435-468` — buyer actions absent, status text, computed warning/muted colors at `:446-455`, owner actions absent | PASS, refreshed at `b0d4dff` |
| C13 | Mobile action and content geometry | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:474-494` — action/nav clearance, seller reachable, no overflow, gallery before heading | PASS, carried from `0a26fc9` |
| C14 | Safe return from unavailable detail | named test passed | `apps/web/tests/marketplace-visual-system.spec.ts:499-504` — browse link, no buy action, navigation to `/` | PASS, carried from `0a26fc9` |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Identity screens (2), mobile locales (2), destinations (5) | plan S1, `DESIGN.md`, AD-020; carried from `0a26fc9` | home/search C1; en/de C4; five destinations C3 | - |
| Card image states (3), listing types (3) | `DESIGN.md` Card and source branches; carried from `0a26fc9` | photo/no photo/WANTED C5-C6; SELL/GIVE_AWAY/WANTED C5/C11 | - |
| Filter dimensions (3), pagination (1), discovery outcomes (3) | plan AC7-9 and feed/search source; carried from `0a26fc9` | request keys/reset C7; second page feed regression; result/empty/error C5/C8/C9 | - |
| Responsive grid (4) and detail composition (2) | `DESIGN.md` Discovery/Detail; carried from `0a26fc9` | 390/768/1100/1440 C5 grid test; desktop C10, mobile C13 | - |
| Detail availability (5), type actions (3) | detail action branches; status source rechecked at `b0d4dff` | active C10; reserved/sold/archived/owned C12; SELL/GIVE_AWAY/WANTED C10/C11 | - |
| Detail semantic colors (title, sold/reserved/archived) | `DESIGN.md` tokens and `page.tsx:241-418` at `b0d4dff` | title computed ink C10 `:368-371`; sold/reserved warning and archived muted C12 `:446-455`; token references in source | - |

No route signature, stored-data entity, or startup assembly changed. The previously omitted detail semantic-color set now has code-derived token mapping and browser assertions for the affected title and state branches.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| UI condition choosing action/state | feed/search/detail UI | Browser assertions for listing types and active/reserved/closed/owned branches | yes — C5/C10-C12, carried from `0a26fc9` and rerun |
| Visual layout and state | CSS, discovery and detail UI | Computed style, visible text and geometry, distinct empty/error | yes — C1/C3/C5/C8-C10/C12-C13; touched detail colors asserted at `b0d4dff` |
| Existing service and route passthrough | feed/search/detail services and routes | Existing tests remain green | yes — 12 related regression cases rerun at `b0d4dff` |

The `Swept` validation, idempotency, authorization, concurrency, and data-lifecycle judgments carry from round 2: this fix changes CSS-facing presentation and browser proofs only.

## Faults injected

Fresh scratch worktree at `C:\Users\INOVV\Documents\GitHub\CampusMarkt-verify-015-round3`, created from `b0d4dff` with its own dependency install. Each effective mutation was isolated, and the real checkout was unchanged. An initial inline title-color edit did not affect rendering because `.detail-page h1` has an overriding `!important` rule; it was not counted as a behavior-level fault. The subsequent mutation targeted that effective CSS rule.

| Mutation | Location | Narrow proof | Killed |
| --- | --- | --- | --- |
| Render detail h1 red by changing the effective CSS rule | `apps/web/src/app/globals.css:726` | C10 fails at test `:368`, expected ink RGB, received red RGB | yes |
| Render sold notice text red instead of warning token | `apps/web/src/app/listings/[id]/page.tsx:247` | C12 fails at test `:452`, expected warning RGB, received red RGB | yes |
| Feed category request key changed | `marketplace-feed.tsx:55`, round 2 at `0a26fc9` | C7 failed at `:249`; unchanged surface, carried | yes |
| Search Retry disabled | `search-client-view.tsx:187`, round 2 at `0a26fc9` | C9 failed at `:359`; unchanged surface, carried | yes |
| Favorite target reduced to 24px | `globals.css:432-435`, round 2 at `0a26fc9` | C5 failed at `:152`; unchanged surface, carried | yes |

Git deregistered the scratch worktree; ignored dependency/build files prevented deletion of its residual directory. No test server or watcher was intentionally left running.

## Gate

`npx playwright test marketplace-visual-system.spec.ts marketplace-feed.spec.ts marketplace-search.spec.ts shell.spec.ts --config apps/web/playwright.config.mjs --reporter=list` — 27 passed, 0 failed at `b0d4dff` (15 visual-system cases, 12 related regressions). The two round-3 narrow mutant runs both failed at their expected assertions. `validate_verification.py 015-marketplace-visual-system` exited 0: 0 errors, 0 warnings.
