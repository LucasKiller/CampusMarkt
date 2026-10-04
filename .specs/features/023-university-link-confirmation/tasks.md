# University Verification Link Confirmation Tasks

**Status:** Approved by the operator's 2026-10-04 bug-fix request.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| HTTP action | Vitest integration | UNILINK-01.1 and malformed/missing token | `tests/integration/identity/university-routes.test.ts` | `npx vitest run tests/integration/identity/university-routes.test.ts` |
| Browser | Playwright | UNILINK-01.2-4, including tokenless URL and clear outcomes | `apps/web/tests/university-verification.spec.ts` | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/university-verification.spec.ts` |
| Existing confirmation API | Vitest integration | UNILINK-01.5 cookie consumption and confirmation | `tests/integration/identity/university-routes.test.ts` | `npx vitest run tests/integration/identity/university-routes.test.ts` |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Focused integration | `npx vitest run tests/integration/identity/university-routes.test.ts tests/integration/identity/registration-routes.test.ts apps/web/src/modules/identity/http/index.test.ts` |
| Browser | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/university-verification.spec.ts` |
| Types | `npm run typecheck` |
| Lint | `npx eslint 'apps/web/src/app/auth/action/[purpose]/route.ts' apps/web/src/app/auth/university-verification/page.tsx apps/web/src/app/auth/university-verification/university-confirmation-view.tsx apps/web/src/app/api/identity/university-verifications/confirm/route.ts apps/web/src/modules/identity/http/index.ts tests/integration/identity/university-routes.test.ts apps/web/tests/university-verification.spec.ts` |
| Format | `npx prettier --check 'apps/web/src/app/auth/action/[purpose]/route.ts' apps/web/src/app/auth/university-verification/page.tsx apps/web/src/app/auth/university-verification/university-confirmation-view.tsx apps/web/src/app/api/identity/university-verifications/confirm/route.ts apps/web/src/modules/identity/http/index.ts tests/integration/identity/university-routes.test.ts apps/web/tests/university-verification.spec.ts` |
| Build | `npm run --workspace @campusmarkt/web build` |

## Execution Plan

```text
T1 -> T2
```

## Task Breakdown

### T1: Route university links through staged confirmation

**Depends on:** none
**Requirements:** UNILINK-01.1 to UNILINK-01.5
**Deliverable:** Stage university verification tokens securely, render a dedicated confirmation page, and submit to the existing confirmation API with explicit outcomes.
**Done when:** Valid link reaches verified result and invalid/error links show actionable results; all focused gates pass.
**Tests:** University route integration and browser tests.
**Gate:** Focused integration, browser, types, lint, format, build, and atomic commit; then independent verification.

### T2: Prove strict token shape and cookie security attributes

**Depends on:** T1
**Requirements:** UNILINK-01.1, UNILINK-01.3
**Deliverable:** Reject a short alphanumeric token in the route test and assert the exact `HttpOnly` cookie attribute after parsing `Set-Cookie`.
**Done when:** The focused integration gate passes and mutations accepting short tokens or replacing `HttpOnly` are detected; types, lint, format, and build pass.
**Tests:** `tests/integration/identity/university-routes.test.ts`
**Gate:** Focused integration, types, lint, format, build, and atomic commit; then fresh independent verification.

## Status

- [x] T1
- [x] T2
