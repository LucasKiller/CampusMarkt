# University Verification Link Confirmation Validation

**Verdict: PASS.** Five acceptance criteria have matching outcome evidence, all gates pass, and six behavior-level mutants are killed.

**Result:** PASS
**Date:** 2026-10-04
**Spec:** .specs/features/023-university-link-confirmation/spec.md
**Diff range:** b852fbb^..a9094c5 (T1 b852fbb; T2 a9094c5)
**Verifier:** fresh independent sub-agent; author != verifier

## Task completion

T1 and T2 are marked complete in .specs/features/023-university-link-confirmation/tasks.md:52-53 and have separate commits. Context and design files do not exist for this feature. I read .specs/STATE.md and relevant product domain, MVP, and marketplace policy documents.

## Spec-anchored acceptance criteria

| AC | Spec-defined outcome | File:line evidence and asserted value | Result |
| --- | --- | --- | --- |
| 1 | A well-formed link redirects to a tokenless page and stages a short-lived HttpOnly, SameSite=Strict cookie. | apps/web/src/app/auth/action/[purpose]/route.ts:44-77 implements staging. tests/integration/identity/university-routes.test.ts:56-71 asserts 303, exact tokenless location, cookie value, and parsed attribute tokens HttpOnly, SameSite=Strict, Max-Age=300. apps/web/tests/university-verification.spec.ts:364-372 asserts browser URL and cookie submission. | PASS |
| 2 | A staged valid token submits automatically and displays the verified university. | apps/web/src/app/auth/university-verification/university-confirmation-view.tsx:18-55 performs POST on mount. apps/web/tests/university-verification.spec.ts:362-372 follows the email-shaped URL without clicking and asserts success heading, TU Braunschweig, and cookie submission. | PASS |
| 3 | Missing, malformed, expired, or consumed tokens show an invalid-link message and route to request a replacement. | tests/integration/identity/university-routes.test.ts:74-90 asserts exact invalid redirect and no cookie for missing, whitespace, and short alphanumeric tokens. apps/web/tests/university-verification.spec.ts:376-410 asserts invalid heading and /account request link for missing and consumed cases. tests/integration/identity/university-routes.test.ts:450-474 asserts invalid_link for service-reported expired/invalid tokens; existing database assertions at supabase/tests/identity-university-persistence.test.ts:527-558 cover expired/unknown token rejection. | PASS |
| 4 | Temporary server failure shows a retryable error without success. | tests/integration/identity/university-routes.test.ts:395-420 asserts 503, retained cookie, and service call. apps/web/tests/university-verification.spec.ts:413-453 asserts error text, absent success heading, retry button, then success after second attempt. | PASS |
| 5 | Success consumes token, clears staged cookie, and badge state follows persistence. | apps/web/src/app/api/identity/university-verifications/confirm/route.ts:51-76 passes cookie token to service and :118-125 clears cookie on non-5xx outcome. tests/integration/identity/university-routes.test.ts:357-391 asserts 200, cookie clearing, and exact token passed. Existing database assertions at supabase/tests/identity-university-persistence.test.ts:506-524 require verified state with null token fields. apps/web/tests/university-verification.spec.ts:469-491 checks verified badge visibility. | PASS |

**Spec precision:** 5/5 criteria have concrete outcomes and matching assertions. The existing database persistence test was inspected but was outside this feature's gate and was not rerun. Focused tests mock the confirmation service; fresh database execution is not claimed.

## Gate and test integrity

All Gate Check Commands in tasks.md passed on the real checkout:

| Gate | Result |
| --- | --- |
| Focused Vitest integration | 62 passed, 0 failed, 0 skipped across 3 files. |
| Playwright university verification | 14 passed, 0 failed, 0 skipped. Managed server exited. |
| npm run typecheck | Passed. |
| Focused npx eslint | Passed. |
| Focused npx prettier --check | Passed. |
| npm run --workspace @campusmarkt/web build | Passed. |

Focused integration count rose from 57 before T1 to 62 after T2 (five added cases). Browser count rose from 10 to 14. Diff b852fbb^..a9094c5 adds tests and deletes, skips, or weakens none. T2 changes HttpOnly from substring matching to parsed cookie-attribute matching and adds the short-token input.

## Discrimination sensor

**Isolation:** git clone --local --no-hardlinks at C:\Users\INOVV\AppData\Local\Temp\campusmarkt-unilink-fresh-20261004-221011, HEAD a9094c5, with its own successful npm ci. No junction or symlink to primary node_modules. The clone was safely removed after review. Clone baseline focused Vitest: 22 passed. Each mutant was applied only in the clone and restored in finally.

| Fault | File:line | Focused result | Verdict |
| --- | --- | --- | --- |
| Accept 1-43 character tokens | apps/web/src/app/auth/action/[purpose]/route.ts:17 | Vitest exit 1; short-token redirect failed, 1 failed/21 passed. | Killed |
| Emit NotHttpOnly | apps/web/src/modules/identity/http/index.ts:264 | Vitest exit 1; exact attribute failed, 1 failed/21 passed. | Killed |
| Redirect link to / | apps/web/src/app/auth/action/[purpose]/route.ts:14 | Vitest exit 1; destination failed, 4 failed/18 passed. | Killed |
| Ignore staged cookie | apps/web/src/app/api/identity/university-verifications/confirm/route.ts:60 | Vitest exit 1; service token and failure outcome failed, 2 failed/20 passed. | Killed |
| Never clear cookie | apps/web/src/app/api/identity/university-verifications/confirm/route.ts:121 | Vitest exit 1; cookie-clearing assertion failed, 1 failed/21 passed. | Killed |
| Render error after successful POST | apps/web/src/app/auth/university-verification/university-confirmation-view.tsx:35 | Playwright exit 1; expected success heading absent at apps/web/tests/university-verification.spec.ts:369. | Killed |

**Sensor depth:** six faults across route, cookie boundary, confirmation API, and UI for an identity flow. **Result: 6 killed, 0 survived.** Clone git diff --exit-code passed and clone porcelain was empty after restoration. The real checkout kept only the pre-existing untracked validation.md; no tracked source changed. Port 3100 had no listener after Playwright.

## Code quality and edge cases

Production changes are confined to the approved confirmation flow and reuse identity HTTP and verification-service boundaries. Tests map to valid, malformed/missing, consumed/expired, and temporary-failure outcomes. No deferred capability or schema was added. Interactive human UAT was not performed; automated browser journey passed.

**Requirement status:** UNILINK-01 independently verified by this report. No code, spec, task status, or commit was changed by this verifier. A clean PASS yields no new lesson.

