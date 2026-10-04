# Listing Photo Upload Repair Tasks

**Status:** Approved by the operator's 2026-10-04 request.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| API | Vitest integration | PHOTO-01 public signed URL and malformed URL failure | `tests/integration/listings/creation-routes.test.ts` | `npx vitest run tests/integration/listings/creation-routes.test.ts` |
| Browser | Playwright | PHOTO-01 upload success/failure and PHOTO-02 picker/drop/limits | `apps/web/tests/listings-management.spec.ts` | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/listings-management.spec.ts` |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Focused | `npx vitest run tests/integration/listings/creation-routes.test.ts apps/web/src/app/listings/new/listing-create-form.test.ts apps/web/src/app/listings/[id]/manage/listing-manage-editor.test.ts` |
| Types | `npm run typecheck` |
| Lint | `npx eslint apps/web/src/app/api/listings/media/upload-intent/route.ts apps/web/src/app/listings/new/listing-create-form.tsx apps/web/src/app/listings/[id]/manage/listing-manage-editor.tsx apps/web/src/modules/listings tests/integration/listings/creation-routes.test.ts apps/web/tests/listings-management.spec.ts` |
| Format | `npx prettier --check apps/web/src/app/api/listings/media/upload-intent/route.ts apps/web/src/app/listings/new/listing-create-form.tsx apps/web/src/app/listings/[id]/manage/listing-manage-editor.tsx tests/integration/listings/creation-routes.test.ts apps/web/tests/listings-management.spec.ts` |
| Build | `npm run --workspace @campusmarkt/web build` |

## Execution Plan

```text
T1 -> T2
```

## Task Breakdown

### T1: Return a browser-reachable signed upload URL

**Depends on:** none
**Requirements:** PHOTO-01.1, PHOTO-01.2
**Deliverable:** Validate and translate the signed Storage URL to the site origin with route tests.
**Done when:** A valid intent returns the same signed path and token on the public origin; malformed provider URLs fail closed.
**Tests:** Upload-intent integration tests.
**Gate:** Focused tests, types, lint, format, build, and atomic commit.

### T2: Upload from picker and drop target

**Depends on:** T1
**Requirements:** PHOTO-01.3, PHOTO-02
**Deliverable:** Multipart signed upload, accurate success/failure state, and a creation-form drop target; matching upload behavior in listing management.
**Done when:** Picker and drop both upload real photos, failures do not count as uploads, limits and pending state work, and the browser journey passes.
**Tests:** Browser listing tests and focused unit/integration tests.
**Gate:** Focused tests, browser test, types, lint, format, build, and atomic commit.

## Status

- [x] T1
- [ ] T2

T1 gate: 19 focused route/form tests, typecheck, scoped lint, formatting, and production web build passed. Signed URL tests verify public origin, preserved token, and fail-closed invalid responses. No server or watcher remains running.

After T2, a fresh independent verifier writes `validation.md` with the requirement evidence and discrimination sensor.
