# Legal Page Alignment Validation

**Verdict: FAIL.** The 320px layout criterion lacks evidence for two of the three legal routes. The feature remains open.

**Date:** 2026-10-04  
**Diff range:** `eb82897^..eb82897`  
**Verifier:** independent agent; implementation author was a different agent  
**Spec:** `.specs/features/019-legal-page-alignment/spec.md`

**Result:** FAIL

## Task and acceptance criteria

T1 is marked complete in `tasks.md`. The implementation is present in commit `eb82897`, but independent acceptance remains incomplete.

| Criterion | Spec outcome | Evidence: implementation and assertion | Result |
| --- | --- | --- | --- |
| LEGALUI-01.1: all three routes use marketplace framing | Header, brand styling, readable article, same three legal footer links as home | `apps/web/src/components/marketplace/legal-page-shell.tsx:21` renders the header; `apps/web/src/components/marketplace/legal-page-shell.tsx:42` renders the footer; `apps/web/src/components/marketplace/marketplace-footer.tsx:19`-`:21` defines the links; `apps/web/tests/legal-page-alignment.spec.ts:22` loops over all routes in both locales, `apps/web/tests/legal-page-alignment.spec.ts:32` asserts header visibility, `apps/web/tests/legal-page-alignment.spec.ts:33`-`:44` assert canvas/surface colors, `apps/web/tests/legal-page-alignment.spec.ts:47` asserts three footer links. Brand link color is specified at `apps/web/src/app/globals.css:433` but not computed in the browser test. | PASS for the shared framing, with a narrow style assertion |
| LEGALUI-01.2: a legal page at 320px | Content and language control accessible with no horizontal overflow or mobile navigation overlap on each legal route | `apps/web/tests/legal-page-alignment.spec.ts:74` sets 320px, but `:75` opens only `/agb`; `:77`, `:85`, and `:101` assert language visibility, no document overflow, and footer separation only there. No `file:line` assertion covers `/impressum` or `/datenschutz` at 320px, including long German text. | **GAP** |
| LEGALUI-01.3: home footer links in both locales | Each destination loads with its locale's title | `apps/web/tests/legal-page-alignment.spec.ts:13` and `:22` iterate both locales and all three hrefs; `:25`-`:31` click and assert URL, HTML language, and localized `h1`. | PASS |
| LEGALUI-02.1: Impressum access description | Both locales say open to everyone in Braunschweig and verification optional | `apps/web/src/app/impressum/page.tsx:53`-`:54` supplies both versions; `apps/web/src/app/impressum/page.test.tsx:43`-`:44` and `:57`-`:58` assert the exact phrases. Browser assertions also appear at `apps/web/tests/legal-page-alignment.spec.ts:63`-`:67`. | PASS |
| LEGALUI-02.2: English binding notice | Each English legal page retains the German statutory-text notice | `apps/web/src/components/marketplace/legal-page-shell.tsx:34`-`:37` renders the shared note; `apps/web/tests/legal-page-alignment.spec.ts:49`-`:53` asserts it while looping over all three pages in English. | PASS |
| LEGALUI-02.3: user-facing headings | Privacy and terms headings contain no internal `AD-` identifiers | `apps/web/src/app/datenschutz/page.tsx:49`-`:52` and `apps/web/src/app/agb/page.tsx:35`-`:38`, `:57`-`:60` use public labels; `apps/web/tests/legal-page-alignment.spec.ts:48` asserts no `AD-` in each rendered article, and `apps/web/src/app/agb/page.test.tsx:36`, `:50` assert the same in both locales. | PASS |

**Spec-anchored outcome:** 5/6 criteria have adequate evidence; 1 criterion has a route/locale coverage gap. No spec-precision gap was found in the specified outcomes.

## Gate check and test integrity

| Gate | Result |
| --- | --- |
| `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/legal-page-alignment.spec.ts` | 3 passed, 0 failed, 0 skipped |
| `npx vitest run apps/web/src/app/impressum/page.test.tsx apps/web/src/app/agb/page.test.tsx` | 6 passed, 0 failed, 0 skipped |
| `npm run typecheck` | Passed |
| Scoped ESLint and Prettier commands from `tasks.md` | Passed |
| `validate_spec.py` and `validate_tasks.py` | 0 errors; task validator warned that diagram arrows could not be cross-checked automatically |

The two render files contained six tests before and after the feature. The browser file adds three focused tests, so the focused count increased from six to nine. No existing assertion was removed or weakened in the diff. The browser server exited and port 3100 had no listener after the run. The Playwright server logged failed calls to the unavailable local rate-limit service at `127.0.0.1:54321`; the focused legal tests still passed.

## Discrimination sensor and isolation

| Fault in disposable worktree | Targeted test | Result |
| --- | --- | --- |
| `apps/web/src/app/impressum/page.tsx`: changed English `University verification is optional.` to `University verification is required.` | `apps/web/src/app/impressum/page.test.tsx:58` | **Killed**: 1 expected assertion failure, 3 other tests passed |

**Sensor depth:** one targeted behavior mutation. No mutant survived.

**Cleanup incident:** The disposable worktree had a junction from its `node_modules` to the main checkout's `node_modules`. `git worktree remove --force` followed the junction and removed tracked files in the main checkout and installed dependencies. Before the sensor the main checkout was clean at `eb82897`. I restored tracked files with `git restore --source=HEAD --worktree -- .`, refreshed the index, and ran `npm ci` after confirming the main `node_modules` was an empty ordinary directory inside the repository. HEAD remained `eb82897`, `git status --porcelain` became empty, and the six render tests plus typecheck passed again. The scratch worktree is gone and port 3100 is free. Ignored dependency/cache bytes were regenerated rather than preserved byte for byte; no credential file was opened or changed. Do not repeat this junction-based sensor setup.

## Code quality and limitations

The diff confines production changes to the legal pages, shared marketplace footer/shell, and scoped styles. It adds no API, database, authorization, or deferred product capability. The shared components follow the existing web pattern and remove old page-specific framing. The new browser test maps to the feature, but its mobile section exercises only AGB; therefore per-route edge coverage does not meet the task's expectation. Automated tests do not replace the optional interactive visual UAT, which was not performed by this verifier.

## Required fix

Extend the 320px Playwright check to visit `/impressum`, `/datenschutz`, and `/agb` in both `en` and `de`. For each combination, assert no document overflow; visibility and operability of the language control; and no overlap between legal content/footer and mobile navigation. Run the focused browser gate and independent revalidation after the test is committed. Investigate any failing layout before marking LEGALUI-01 verified.

**Traceability:** Keep `LEGALUI-01` and `LEGALUI-02` in their existing implemented, awaiting-validation state. Do not mark the feature complete or update `.specs/STATE.md` until the gap is closed and validation passes.
