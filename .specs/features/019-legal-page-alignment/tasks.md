# Legal Page Alignment Tasks

**Status:** Approved by the operator's 2026-10-04 request.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| Browser | Playwright | LEGALUI-01 navigation, computed colors, desktop/mobile geometry, locale switching; LEGALUI-02 product description and no internal labels. | `apps/web/tests/legal-page-alignment.spec.ts` | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/legal-page-alignment.spec.ts` |
| Render | Vitest | LEGALUI-02 bilingual copy and binding note. | `apps/web/src/app/impressum/page.test.tsx`, `apps/web/src/app/agb/page.test.tsx` | `npx vitest run apps/web/src/app/impressum/page.test.tsx apps/web/src/app/agb/page.test.tsx` |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Browser | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/legal-page-alignment.spec.ts` |
| Render | `npx vitest run apps/web/src/app/impressum/page.test.tsx apps/web/src/app/agb/page.test.tsx` |
| Types | `npm run typecheck` |
| Lint | `npx eslint apps/web/src/app/page.tsx apps/web/src/app/impressum/page.tsx apps/web/src/app/datenschutz/page.tsx apps/web/src/app/agb/page.tsx apps/web/src/components/marketplace/legal-page-shell.tsx apps/web/src/components/marketplace/marketplace-footer.tsx apps/web/tests/legal-page-alignment.spec.ts` |
| Format | `npx prettier --check apps/web/src/app/page.tsx apps/web/src/app/globals.css apps/web/src/app/impressum/page.tsx apps/web/src/app/datenschutz/page.tsx apps/web/src/app/agb/page.tsx apps/web/src/components/marketplace/legal-page-shell.tsx apps/web/src/components/marketplace/marketplace-footer.tsx apps/web/tests/legal-page-alignment.spec.ts` |

## Execution Plan

```text
T1
```

## Task Breakdown

### T1: Align legal destinations and product wording

**Depends on:** none
**Requirements:** LEGALUI-01, LEGALUI-02
**Deliverable:** Shared site shell and footer, scoped legal-page CSS, corrected product description, user-facing headings, and requirement-derived checks.
**Done when:** Both locales and all three routes pass the specified browser and render checks at desktop and mobile widths.
**Tests:** Browser and render checks in the coverage matrix.
**Gate:** Browser, render, types, lint, formatting, spec/task status, then an atomic local commit.

## Status

- [x] T1

T1 gate: Three focused Playwright tests passed across all three destinations and both locales; six legal-page render tests passed. Typecheck, scoped lint, formatting, and spec/task validators passed. Chromium screenshots were visually inspected at desktop and 320px mobile widths. The temporary Playwright server exited, leaving port 3100 without a listener.

After T1 is committed, a fresh independent verifier reviews the spec, diff, tests, and a discrimination sensor, then writes `validation.md`.
