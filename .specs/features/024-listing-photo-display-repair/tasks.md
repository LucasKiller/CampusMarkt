# Tasks

**Status:** Approved by the operator's 2026-10-04 request.

## Test Coverage Matrix

| Layer | Test type | Requirements | Gate command |
| --- | --- | --- | --- |
| Listing URL | Vitest unit | MEDIA-01.1, MEDIA-01.2 | `npx vitest run apps/web/src/modules/listings/media-url.test.ts` |
| Public and owner components | Render tests | MEDIA-01.3, MEDIA-02.1, MEDIA-02.2 | Focused Vitest suite, including favorites and conversation |
| Owner management | Playwright | MEDIA-02.3 and upload regression | Listing management browser suite |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Focused | `npx vitest run apps/web/src/modules/listings/media-url.test.ts apps/web/src/components/marketplace/feed.test.tsx apps/web/src/app/listings/[id]/page.test.tsx apps/web/src/components/marketplace/home-hero-showcase.test.tsx apps/web/src/app/account/listings/my-listings-view.test.ts apps/web/src/app/favorites/page.test.tsx apps/web/src/components/marketplace/messaging/negotiation-card.test.tsx` |
| Browser | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/listings-management.spec.ts` |
| Types | `npm run typecheck` |
| Lint | `npx eslint` on changed TypeScript files |
| Format | `npx prettier --check` on changed TypeScript files |
| Build | Browser gate builds the production web application |

## Execution Plan

```text
T1
```

## Task Breakdown

### T1: Correct stored-photo URLs

**Requirements:** MEDIA-01, MEDIA-02.
**Depends on:** none.
**Tests:** URL resolver unit tests, rendered listing views, and owner management browser journey.
**Gate:** Focused tests, browser suite, typecheck, lint, format, and production build; then atomic commit.

Add regression tests for the URL resolver and each affected display surface, fix photo sources, run focused tests, typecheck, lint, format, and the production web build. Commit the task atomically. Obtain independent validation and record it in `validation.md` after the task gate.

**Status:** Complete locally. Seven focused Vitest files passed (36 tests); 18 Playwright listing journeys passed, including photo upload and saved-photo management previews at 360px and 1280px. Typecheck, scoped lint, formatting, and production web build passed. Playwright stopped its web server; port 3100 has no listener. Independent validation is next.
