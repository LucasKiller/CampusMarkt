# Legal Page Alignment Validation

**Verdict: PASS.** All six acceptance criteria have spec-matching assertions, and every required gate passes.

**Date:** 2026-10-04
**Diff range:** `eb82897^..482828a`
**Verifier:** independent agent; implementation author was a different agent
**Spec:** `.specs/features/019-legal-page-alignment/spec.md`

**Result:** PASS

## Task and acceptance criteria

T1 and T2 are marked complete in `tasks.md`. This recheck inspected commits `eb82897` and `482828a` without changing production files.

| Criterion | Spec outcome | Evidence: implementation and assertion | Result |
| --- | --- | --- | --- |
| LEGALUI-01.1: all three routes use marketplace framing | Header, brand styling, readable article, same three legal footer links as home | `apps/web/src/components/marketplace/legal-page-shell.tsx:21` renders the header; `apps/web/src/components/marketplace/legal-page-shell.tsx:42` renders the footer; `apps/web/src/components/marketplace/marketplace-footer.tsx:19`-`:21` defines the links; `apps/web/tests/legal-page-alignment.spec.ts:22` loops over all routes in both locales, `apps/web/tests/legal-page-alignment.spec.ts:32` asserts header visibility, `apps/web/tests/legal-page-alignment.spec.ts:33`-`:44` assert canvas/surface colors, `apps/web/tests/legal-page-alignment.spec.ts:47` asserts three footer links. Brand link color is specified at `apps/web/src/app/globals.css:433` but not computed in the browser test. | PASS for the shared framing, with a narrow style assertion |
| LEGALUI-01.2: every legal page at 320px | Content and language control accessible with no horizontal overflow or mobile navigation overlap on each legal route and locale | `apps/web/tests/legal-page-alignment.spec.ts:75` sets 320px; `:77`-`:82` visit all six route/locale combinations; `:87`-`:91` assert language control, mobile navigation, and footer visibility; `:93`-`:98` assert no document overflow; `:106`-`:118` assert the last footer link stays above mobile navigation; `:120`-`:126` click the language control and assert the other locale. The long English privacy heading wraps via `apps/web/src/app/globals.css:449`-`:455`. | PASS |
| LEGALUI-01.3: home footer links in both locales | Each destination loads with its locale's title | `apps/web/tests/legal-page-alignment.spec.ts:13` and `:22` iterate both locales and all three hrefs; `:25`-`:31` click and assert URL, HTML language, and localized `h1`. | PASS |
| LEGALUI-02.1: Impressum access description | Both locales say open to everyone in Braunschweig and verification optional | `apps/web/src/app/impressum/page.tsx:53`-`:54` supplies both versions; `apps/web/src/app/impressum/page.test.tsx:43`-`:44` and `:57`-`:58` assert the exact phrases. Browser assertions also appear at `apps/web/tests/legal-page-alignment.spec.ts:63`-`:67`. | PASS |
| LEGALUI-02.2: English binding notice | Each English legal page retains the German statutory-text notice | `apps/web/src/components/marketplace/legal-page-shell.tsx:34`-`:37` renders the shared note; `apps/web/tests/legal-page-alignment.spec.ts:49`-`:53` asserts it while looping over all three pages in English. | PASS |
| LEGALUI-02.3: user-facing headings | Privacy and terms headings contain no internal `AD-` identifiers | `apps/web/src/app/datenschutz/page.tsx:49`-`:52` and `apps/web/src/app/agb/page.tsx:35`-`:38`, `:57`-`:60` use public labels; `apps/web/tests/legal-page-alignment.spec.ts:48` asserts no `AD-` in each rendered article, and `apps/web/src/app/agb/page.test.tsx:36`, `:50` assert the same in both locales. | PASS |

**Spec-anchored outcome:** 6/6 criteria have adequate assertions matching the specified outcomes; no spec-precision gap was found.

## Gate check and test integrity

| Gate | Result |
| --- | --- |
| `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/legal-page-alignment.spec.ts` | 3 passed, 0 failed, 0 skipped |
| `npx vitest run apps/web/src/app/impressum/page.test.tsx apps/web/src/app/agb/page.test.tsx` | 6 passed, 0 failed, 0 skipped |
| `npm run typecheck` | Passed |
| Scoped ESLint and exact scoped Prettier commands from `tasks.md` | Passed |
| `validate_spec.py` and `validate_tasks.py` | 0 errors, 0 warnings |

The two render files contained six tests before and after the feature. The browser file adds three focused tests, so the focused count increased from six to nine. No existing assertion was removed or weakened in T2. The browser server exited and port 3100 had no listener after the run. The Playwright server logged failed calls to the unavailable local rate-limit service at `127.0.0.1:54321`; the focused legal tests still passed.

The first exact Prettier recheck failed on six production files because this Windows checkout had CRLF line endings while the Git index had LF. `git ls-files --eol` reported `i/lf w/crlf` for `apps/web/src/app/page.tsx`, `impressum/page.tsx`, `datenschutz/page.tsx`, `agb/page.tsx`, `legal-page-shell.tsx`, and `marketplace-footer.tsx`. The same check with `--end-of-line auto` passed. The orchestration agent normalized only the checkout line endings, without changing Git content; the exact Prettier command then passed, and `git status --short` was empty before this report edit. The verifier did not edit implementation files.

## Discrimination sensor and isolation

| Recorded fault | Targeted test | Result |
| --- | --- | --- |
| Earlier verifier changed English `University verification is optional.` to `University verification is required.` in a disposable worktree | `apps/web/src/app/impressum/page.test.tsx:58` | **Killed**: 1 expected assertion failure, 3 other tests passed |
| T2's pre-fix browser run exposed English `/datenschutz` title overflow at 320px | `apps/web/tests/legal-page-alignment.spec.ts:93`-`:98` | **Killed**: the overflow assertion failed before the heading wrap fix and passes after it |

**Sensor depth:** one prior targeted copy mutation and the recorded red browser run before T2's CSS fix. No mutant survived. This recheck did not create another filesystem scratch; the user barred worktrees, junctions, symlinks, recursive deletion, and implementation edits.

**Cleanup incident and restoration:** The earlier verifier's disposable worktree had a junction from its `node_modules` to the main checkout's `node_modules`. `git worktree remove --force` followed the junction and removed tracked files in the main checkout and installed dependencies. That verifier restored tracked files from HEAD, refreshed the index, ran `npm ci`, reran six render tests plus typecheck, and confirmed a clean tree. The scratch worktree is gone. This recheck confirmed clean porcelain before editing the report, reran the focused gates, and confirmed port 3100 free. Ignored dependency/cache bytes were regenerated rather than preserved byte for byte; no credential file was opened or changed. Do not repeat this junction-based sensor setup.

## Code quality and limitations

The diff confines production changes to the legal pages, shared marketplace footer/shell, and scoped styles. It adds no API, database, authorization, or deferred product capability. The shared components follow the existing web pattern and remove old page-specific framing. The browser tests map to the feature and now exercise all three routes in both locales at 320px. Automated tests do not replace optional interactive visual UAT, which was not performed by this verifier.

## Requirement traceability

LEGALUI-01 and LEGALUI-02 can be marked verified. The feature may be closed locally after the state completion gate passes.
