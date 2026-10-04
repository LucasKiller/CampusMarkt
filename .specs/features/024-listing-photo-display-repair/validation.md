# Listing Photo Display Repair Validation

**Date:** 2026-10-04
**Result:** PASS
**Spec:** `.specs/features/024-listing-photo-display-repair/spec.md`
**Diff range:** `594825e^..594825e`
**Verifier:** independent sub-agent (author ≠ verifier)

## Task completion

| Task | Result | Evidence |
| --- | --- | --- |
| T1: Correct stored-photo URLs | PASS | Atomic implementation commit `594825e`; focused, browser, type, lint, format, and build gates passed. |

## Spec-anchored acceptance criteria

| Criterion | Spec-defined outcome | Evidence and asserted outcome | Result |
| --- | --- | --- | --- |
| MEDIA-01.1: stored path | Same-origin `/storage/v1/object/public/listing-media/` URL | `apps/web/src/modules/listings/media-url.test.ts:6-8` asserts exact URL for `owner/photo.webp`; `apps/web/src/modules/listings/media-url.ts:1-9` implements it. `infra/caddy/Caddyfile:28-33` proxies `/storage/v1/*`; `supabase/migrations/20260922103000_marketplace_storage_media.sql:9-11` configures a public bucket. | PASS |
| MEDIA-01.2: URL-sensitive path | Encode each segment and retain `/` separators | `apps/web/src/modules/listings/media-url.test.ts:12-14` asserts `owner/my%20photo%20%231.webp` exactly; `apps/web/src/modules/listings/media-url.ts:8` splits and joins path segments. | PASS |
| MEDIA-01.3: no photo | Existing placeholder remains | `apps/web/src/components/marketplace/feed.test.tsx:88-100` asserts WANTED placeholder text and no `<img>`; `apps/web/src/app/listings/[id]/page.test.tsx:89-99` asserts gallery placeholder; `apps/web/src/components/marketplace/home-hero-showcase.test.tsx:40-49` asserts a text tile with no `<img>`. | PASS |
| MEDIA-02.1: public views | Resolved URL in discovery card, home showcase, favorites, and detail gallery | Exact `src` assertions: `apps/web/src/components/marketplace/feed.test.tsx:39-42`, `apps/web/src/components/marketplace/home-hero-showcase.test.tsx:35-37`, `apps/web/src/app/favorites/page.test.tsx:125-127`, `apps/web/src/app/listings/[id]/page.test.tsx:82-84`. | PASS |
| MEDIA-02.2: owner and conversation views | Same resolved URL in owner's list, editor, and conversation summary | Exact `src` assertions: `apps/web/src/app/account/listings/my-listings-view.test.ts:39-41`, `apps/web/tests/listings-management.spec.ts:179-182`, `apps/web/src/components/marketplace/messaging/negotiation-card.test.tsx:22-24`. | PASS |
| MEDIA-02.3: newly created listing in management | Saved media path resolves to public Storage URL; nonexistent preview endpoint is absent | `apps/web/tests/listings-management.spec.ts:153-182` opens management with saved `storagePath` and asserts exact photo `src` at 360px and 1280px; `apps/web/src/app/listings/[id]/manage/listing-manage-editor.tsx:60-63` initializes saved image previews from the resolver; `apps/web/src/app/account/listings/my-listings-view.test.ts:42` rejects the preview route. | PASS |

Existing absolute URLs remain intact by `apps/web/src/modules/listings/media-url.test.ts:17-20`. This is the design's legacy/demo data contract.

## Gate results

| Gate | Result |
| --- | --- |
| Focused Vitest | 7 files, 36 tests passed; 0 failed, 0 skipped. |
| Playwright listing management | 18 tests passed; 0 failed, 0 skipped. Its webServer command built the production application. |
| Typecheck | `npm run typecheck` passed. |
| Scoped ESLint | All 16 changed TypeScript files passed. |
| Scoped Prettier | All 16 changed TypeScript files passed. |

The focused files had 29 test cases before this commit and 36 after it: seven added, none removed. The browser suite retained 18 cases and strengthened the management case with a photo URL assertion. The Playwright process exited and port 3100 had no listener afterward.

## Discrimination sensor

The sensor used `git clone --local --no-hardlinks` in a temporary directory. Mutations were applied only inside that clone, one at a time, and restored after each run.

| Behavior fault | Target | Focused result | Outcome |
| --- | --- | --- | --- |
| Resolve stored paths through `wrong-bucket` | `apps/web/src/modules/listings/media-url.ts:1` | 2 URL resolver tests failed | Killed |
| Render owner-listing cover as a site-root path | `apps/web/src/app/account/listings/my-listings-view.tsx:155` | 1 owner view test failed | Killed |

**Sensor result:** 2/2 killed. The scratch clone was clean after restoration and was removed. Primary checkout porcelain matched its clean pre-sensor baseline.

## Code quality and limits

The diff is confined to the approved resolver, existing photo renderers, requirement-derived tests, and feature records. Storage paths remain in the API and persistence boundary; resolution occurs only for display. No new endpoint, policy, or deferred feature was introduced. The browser test proves the correct image request URL for a saved listing; the local browser gate does not run a Storage service, so it does not assert image bytes or `naturalWidth`. The configured same-origin proxy and public bucket support that URL contract.

**Overall:** PASS. All six acceptance criteria have implementation and assertion evidence; both behavior faults were detected.
