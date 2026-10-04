# Listing Photo Upload Repair Tasks

**Status:** Approved by the operator's 2026-10-04 request.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| API | Vitest integration | PHOTO-01 public signed URL and malformed URL failure | `tests/integration/listings/creation-routes.test.ts` | `npx vitest run tests/integration/listings/creation-routes.test.ts` |
| Browser | Playwright | PHOTO-01 upload success/failure and PHOTO-02 picker/drop/limits | `apps/web/tests/listings-management.spec.ts` | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/listings-management.spec.ts` |
| Transport | Vitest unit | PHOTO-01 signed multipart PUT and failure response | `apps/web/src/modules/listings/client/upload-photo.test.ts` | `npx vitest run apps/web/src/modules/listings/client/upload-photo.test.ts` |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Focused | `npx vitest run tests/integration/listings/creation-routes.test.ts apps/web/src/modules/listings/client/upload-photo.test.ts apps/web/src/app/listings/new/listing-create-form.test.ts apps/web/src/app/listings/[id]/manage/listing-manage-editor.test.ts` |
| Types | `npm run typecheck` |
| Lint | `npx eslint apps/web/src/app/api/listings/media/upload-intent/route.ts apps/web/src/app/listings/new/listing-create-form.tsx apps/web/src/app/listings/[id]/manage/listing-manage-editor.tsx apps/web/src/modules/listings tests/integration/listings/creation-routes.test.ts apps/web/tests/listings-management.spec.ts` |
| Format | `npx prettier --check apps/web/src/app/api/listings/media/upload-intent/route.ts apps/web/src/app/listings/new/listing-create-form.tsx apps/web/src/app/listings/[id]/manage/listing-manage-editor.tsx apps/web/src/modules/listings/client/upload-photo.ts apps/web/src/modules/listings/client/upload-photo.test.ts tests/integration/listings/creation-routes.test.ts apps/web/tests/listings-management.spec.ts` |
| Build | `npm run --workspace @campusmarkt/web build` |

## Execution Plan

```text
T1 -> T2 -> T3
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

### T3: Prove the chosen photo and pending drop behavior

**Depends on:** T2
**Requirements:** PHOTO-01.3, PHOTO-02.1, PHOTO-02.2
**Deliverable:** Assert the uploaded multipart bytes, reject a second drop while an upload is pending, and cover dropped JPEG and WebP photos.
**Done when:** A wrong-bytes upload implementation fails the transport test and the browser tests prove one upload during the pending state plus each supported image format.
**Tests:** Signed upload transport unit test and listing creation browser journeys.
**Gate:** Focused tests, browser test, types, lint, format, build, and atomic commit.

## Status

- [x] T1
- [x] T2
- [x] T3

T1 gate: 19 focused route/form tests, typecheck, scoped lint, formatting, and production web build passed. Signed URL tests verify public origin, preserved token, and fail-closed invalid responses. No server or watcher remains running.

T2 gate: 21 focused Vitest tests and 16 Playwright listing journeys passed. Browser tests prove picker and dropped photos, upload pending state, multipart transport, rejected Storage responses, and photo limits. Typecheck, lint, formatting, and the production web build passed. Port 3100 closed after Playwright; no server or watcher remains running.

After T2, a fresh independent verifier reviewed the implementation and recorded an initial surviving wrong-bytes mutation; T3 closed this gap.

T3 was added from the independent verifier's first discrimination run: a wrong-bytes upload mutation survived the original transport test. The strengthened test now checks the actual multipart file contents; browser coverage also checks a second drop during the pending request and JPEG/WebP drops. Independent revalidation passed 6/6 acceptance criteria and killed 2/2 final mutations.

T3 gate: 21 focused Vitest tests and 18 Playwright listing journeys passed. Typecheck, scoped lint, formatting, and the production web build passed. Port 3100 closed after Playwright; no server or watcher remains running.
