# Saved Profile Name in Account Settings Tasks

**Status:** Approved by the operator's 2026-10-04 bug-fix request.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| Browser | Playwright | NAME-01 saved read, refresh, delayed-read ordering, failed read | `apps/web/tests/profiles.spec.ts` | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/profiles.spec.ts` |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Browser | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/profiles.spec.ts` |
| Types | `npm run typecheck` |
| Lint | `npx eslint apps/web/src/app/account/profile/profile-editor.tsx apps/web/tests/profiles.spec.ts` |
| Format | `npx prettier --check apps/web/src/app/account/profile/profile-editor.tsx apps/web/tests/profiles.spec.ts` |
| Build | `npm run --workspace @campusmarkt/web build` |

## Execution Plan

```text
T1 -> T2
```

## Task Breakdown

### T1: Hydrate the profile editor from the saved owner profile

**Depends on:** none
**Requirements:** NAME-01.1 to NAME-01.5
**Deliverable:** Load the owner profile into the editor without presenting a fake saved name or overwriting an active edit or successful save.
**Done when:** The browser tests prove the registration name, updated name after refresh, delayed-read ordering, and failed-read display; types, lint, format, and build pass.
**Tests:** `apps/web/tests/profiles.spec.ts`
**Gate:** Browser, types, lint, format, build, and atomic commit.

### T2: Prove a late profile read cannot replace a completed save

**Depends on:** T1
**Requirements:** NAME-01.4
**Deliverable:** Expose completion of the initial read to assistive technology and wait for that completion before asserting the saved name in the browser test.
**Done when:** The late-read test checks the saved name after the initial GET has been consumed, and the browser, type, lint, format, and build gates pass.
**Tests:** `apps/web/tests/profiles.spec.ts`
**Gate:** Browser, types, lint, format, build, and atomic commit.

## Status

- [x] T1
- [x] T2
