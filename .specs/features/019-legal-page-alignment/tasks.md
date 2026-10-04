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
T1 -> T2
```

## Task Breakdown

### T1: Align legal destinations and product wording

**Depends on:** none
**Requirements:** LEGALUI-01, LEGALUI-02
**Deliverable:** Shared site shell and footer, scoped legal-page CSS, corrected product description, user-facing headings, and requirement-derived checks.
**Done when:** Both locales and all three routes pass the specified browser and render checks at desktop and mobile widths.
**Tests:** Browser and render checks in the coverage matrix.
**Gate:** Browser, render, types, lint, formatting, spec/task status, then an atomic local commit.

### T2: Cover every legal route at mobile width

**Depends on:** T1 and the first independent validation finding.
**Requirements:** LEGALUI-01.2
**Deliverable:** Browser assertions for Impressum, Privacy Policy, and Terms of Service at 320px in both locales.
**Done when:** Each route and locale combination has an explicit no-overflow assertion, an operable language control, and a footer link reachable above the fixed mobile navigation.
**Tests:** Focused Playwright browser gate and formatting/lint checks for the changed test.
**Gate:** Browser, types, scoped lint, formatting, status update, then an atomic local commit.

## Status

- [x] T1
- [x] T2

T1 gate: Three focused Playwright tests passed across all three destinations and both locales; six legal-page render tests passed. Typecheck, scoped lint, formatting, and spec/task validators passed. Chromium screenshots were visually inspected at desktop and 320px mobile widths. The temporary Playwright server exited, leaving port 3100 without a listener.

T2 gate: The expanded 320px browser check exposed horizontal overflow on the English Privacy Policy title. Adding `overflow-wrap: anywhere` to the legal heading removed it. The targeted mobile check passed all six route/locale combinations, then the full focused Playwright suite passed 3/3. Typecheck, scoped lint, formatting, and task validation passed. The temporary server exited with port 3100 free.

The first independent validation recorded FAIL because T1 tested only AGB at 320px. After T2 is committed, the verifier rechecks all criteria and updates `validation.md`.
