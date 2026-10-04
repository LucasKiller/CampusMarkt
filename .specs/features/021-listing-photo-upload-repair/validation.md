# Listing Photo Upload Repair Validation

## Validation: PASS

**Verdict: PASS.** The signed upload uses the public site origin, the repository signs through the Supabase Storage namespace, the form records only accepted Storage uploads, and picker/drop input obeys the approved limits.

**Date:** 2026-10-04  
**Spec:** `.specs/features/021-listing-photo-upload-repair/spec.md`  
**Diff range:** original verification `6ca5772..a1c3663`; reopened production regression `1fa9b21..eab2c1a`  
**Verifier:** independent sub-agent; author != verifier

## Task completion

| Task | Result | Evidence |
| --- | --- | --- |
| T1 | PASS | Public URL and invalid-provider cases in `tests/integration/listings/creation-routes.test.ts:185` and `tests/integration/listings/creation-routes.test.ts:221`. |
| T2 | PASS | Shared upload and picker/drop paths in `apps/web/src/app/listings/new/listing-create-form.tsx:139`, `apps/web/src/app/listings/new/listing-create-form.tsx:161`, and `apps/web/src/app/listings/new/listing-create-form.tsx:167`; browser assertions below. |
| T3 | PASS | Multipart file contents asserted at `apps/web/src/modules/listings/client/upload-photo.test.ts:34`; duplicate drop and JPEG/WebP asserted at `apps/web/tests/listings-management.spec.ts:341` and `apps/web/tests/listings-management.spec.ts:352`. |
| T4 | PASS | The repository uses `storage.storage.from("listing-media")` at `apps/web/src/modules/listings/server/repository.ts:327`; `tests/integration/listings/repository.test.ts:348` models both Supabase `from` methods and asserts that database `from` is not called at `tests/integration/listings/repository.test.ts:376`. |

## Spec-anchored acceptance criteria

| Criterion | Spec-defined outcome | Evidence and exact assertion | Result |
| --- | --- | --- | --- |
| PHOTO-01.1: valid authenticated upload intent | Signed `/storage/v1/object/upload/sign/listing-media/<path>` URL on the canonical site origin with its token and storage path | `tests/integration/listings/creation-routes.test.ts:212` asserts the exact canonical-origin Storage path and `token=signed-token`; route verifies identity at `apps/web/src/app/api/listings/media/upload-intent/route.ts:39` and constructs the public URL at `apps/web/src/app/api/listings/media/upload-intent/route.ts:81`. | PASS |
| PHOTO-01.2: malformed or non-upload provider URL | HTTP 503 with no usable `data` | `tests/integration/listings/creation-routes.test.ts:221` supplies malformed, wrong-path and missing-token URLs; `tests/integration/listings/creation-routes.test.ts:248` asserts status 503 and `tests/integration/listings/creation-routes.test.ts:249` asserts `data` is undefined. The explicit missing-token case repeats this at `tests/integration/listings/creation-routes.test.ts:275`. | PASS |
| PHOTO-01.3: Storage accepts/rejects signed PUT | Multipart PUT sends the chosen bytes; only accepted uploads enter the photo list; rejection shows error and leaves count at zero | `apps/web/src/modules/listings/client/upload-photo.test.ts:26` asserts PUT, `apps/web/src/modules/listings/client/upload-photo.test.ts:34` asserts `photo-bytes`, and `apps/web/src/modules/listings/client/upload-photo.test.ts:47` asserts rejection. Picker journey asserts `1/8 uploaded` at `apps/web/tests/listings-management.spec.ts:294`; rejected Storage journey asserts error and `0/8 uploaded` at `apps/web/tests/listings-management.spec.ts:407` and `apps/web/tests/listings-management.spec.ts:410`. Creation code appends only after awaited PUT at `apps/web/src/app/listings/new/listing-create-form.tsx:139`. | PASS |
| PHOTO-01.4: real admin client backs upload intent | Sign through Storage `from("listing-media")`; never call database table `from` | The installed SDK exposes database `from` without `createSignedUploadUrl` and Storage `from` with it at `tests/integration/listings/repository.test.ts:349-356`. The dual-namespace client test asserts success, zero database calls, and the signed path at `tests/integration/listings/repository.test.ts:373-379`. Production wiring passes the admin client as storage at `apps/web/src/modules/listings/server/index.ts:119-133`, and the repository selects `storage.storage.from` at `apps/web/src/modules/listings/server/repository.ts:327-328`. | PASS |
| PHOTO-02.1: picker and JPEG/PNG/WebP drops | Both inputs share the 5 MB, eight-photo, signed-upload path | Picker success: `apps/web/tests/listings-management.spec.ts:284` and `apps/web/tests/listings-management.spec.ts:294`. PNG drop success: `apps/web/tests/listings-management.spec.ts:336` and `apps/web/tests/listings-management.spec.ts:345`. JPEG/WebP drops: `apps/web/tests/listings-management.spec.ts:352` and `apps/web/tests/listings-management.spec.ts:376`. Eight-photo and 5 MB rejection: `apps/web/tests/listings-management.spec.ts:439` and `apps/web/tests/listings-management.spec.ts:457`; both inputs call `uploadFiles` at `apps/web/src/app/listings/new/listing-create-form.tsx:161` and `apps/web/src/app/listings/new/listing-create-form.tsx:167`. | PASS |
| PHOTO-02.2: upload pending | Pending state is visible and duplicate actions cannot start another intent or PUT | `apps/web/tests/listings-management.spec.ts:337` asserts disabled `Uploading...` button; `apps/web/tests/listings-management.spec.ts:340` asserts zero completed; second drop at `apps/web/tests/listings-management.spec.ts:341` leaves `intentCount` and `uploadCount` exactly one at `apps/web/tests/listings-management.spec.ts:342` and `apps/web/tests/listings-management.spec.ts:343`. | PASS |
| PHOTO-02.3: unsupported or over-limit file | Actionable error, no new photo or upload intent | Unsupported MIME: `apps/web/tests/listings-management.spec.ts:404` asserts the format error and `apps/web/tests/listings-management.spec.ts:405` asserts no intent. Nine files: `apps/web/tests/listings-management.spec.ts:439` asserts maximum-eight error. Oversize: `apps/web/tests/listings-management.spec.ts:457` asserts 5 MB error, `apps/web/tests/listings-management.spec.ts:458` asserts zero uploaded, and `apps/web/tests/listings-management.spec.ts:459` asserts no intent. | PASS |

**Coverage:** 7/7 acceptance criteria match the specified outcomes. No spec-precision gap remains.

## Discrimination sensor

The sensor copied the production uploader and its actual Vitest test to temporary files, changed only the copied production behavior, ran the copied test, removed both files, and compared the real checkout's `git status --porcelain=v1` before and after each run. No junction, symlink, scratch worktree, stash, or committed source mutation was used.

**Initial sensor signal:**
The first wrong-bytes mutant survived before T3 because the test checked only file name and type. T3 added an exact byte assertion, and the same mutant then failed.

| Fault injected into `apps/web/src/modules/listings/client/upload-photo.ts` | Test outcome | Result |
| --- | --- | --- |
| Line 10: invert the Storage success condition (`!response.ok` to `response.ok`) | Two of two transport tests failed. | KILLED |
| Line 7: replace selected file bytes with `wrong-photo-bytes`, retaining its name and MIME type | One transport test failed at the exact byte assertion, `apps/web/src/modules/listings/client/upload-photo.test.ts:34`. | KILLED |

**Sensor depth:** lightweight, two behavior faults. **Final result:** 2/2 killed; real-tree porcelain remained unchanged after each run.

**T4 sensor:** The verifier copied `repository.ts` and its integration test to temporary files, changed only the copied repository's bucket selection from `storage.storage.from` to database `storage.from`, and ran the copied test. The production-regression test failed at `tests/integration/listings/repository.test.ts:375` (`result.ok` was `false`), reproducing `createSignedUploadUrl is not a function`; another signing test also failed. The copied suite had 2 failed and 14 passed cases. Both temporary files were removed, and real-tree `git status --porcelain=v1` matched its pre-sensor baseline. **Result: 1/1 T4 mutation killed.**

## Gate and integrity

| Check | Result |
| --- | --- |
| Focused Vitest command from `tasks.md` | 21 passed, 0 failed, 0 skipped across 4 files. |
| `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/listings-management.spec.ts` | 18 passed, 0 failed, 0 skipped. |
| `npm run typecheck` | PASS. |
| Scoped ESLint command from `tasks.md` | PASS. |
| Scoped Prettier check from `tasks.md` | PASS. |
| `npm run --workspace @campusmarkt/web build` | PASS. |
| T4 repository and route Vitest suite | 28 passed, 0 failed, 0 skipped across 2 files. |
| T4 focused Vitest command from `tasks.md` | 21 passed, 0 failed, 0 skipped across 4 files. |
| T4 `npm run typecheck`, scoped ESLint, scoped Prettier, and production web build | PASS. |

The baseline source at `6ca5772` defined 15 focused Vitest cases and 13 listing-browser cases; the final suites execute 21 and 18, respectively. No prior test was removed or weakened. Playwright's temporary web server exited after the run; port 3100 has no listener.

T4 adds one repository regression case: 15 repository tests at `1fa9b21`, 16 at `eab2c1a`. No test was removed or skipped. The verifier ran only finite Vitest, typecheck, lint, format, and build processes; none remains running. T4 was not exercised against the live VPS or a live Storage instance.

## Code quality and limits

The diff is limited to the approved photo-upload path, requirement tests, and feature records. The creation and management forms use the same signed PUT helper (`apps/web/src/app/listings/new/listing-create-form.tsx:139`, `apps/web/src/app/listings/[id]/manage/listing-manage-editor.tsx:164`). T4 removes the ambiguous dynamic namespace selection in favor of the typed Storage client call. No new database or Storage schema was added. The implementation follows `AGENTS.md` and the existing visual/error guidance in `DESIGN.md`. Automated browser journeys cover the observable upload behavior; no live Storage instance or manual UAT was part of this local gate.

## Requirement traceability

| Requirement | Before | Validation result |
| --- | --- | --- |
| PHOTO-01 | T1-T3 verified; T4 production regression awaiting validation | Verified locally through T4 |
| PHOTO-02 | Implemented; awaiting independent validation | Verified |

**Next step:** record the T4 verified status in `spec.md` and commit the validation artifact with the project handoff update. The public site remains unverified until this commit is explicitly deployed and checked there. No push or deployment is authorized by this report.
