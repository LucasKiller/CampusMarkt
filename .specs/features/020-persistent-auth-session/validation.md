# Persistent Authentication Session Validation

**Date:** 2026-10-04  
**Verdict:** PASS  
**Verifier:** independent sub-agent; author ≠ verifier  
**Spec:** `.specs/features/020-persistent-auth-session/spec.md`  
**Diff range:** `18059fe..11f0e13` (`d39cfd9`, `bddabbe`, `d89f30b`, `11f0e13`)

## Task completion and gates

T1–T4 are marked complete and committed separately. The required focused gate passed on the final state: 19 files, 345 tests, 0 failed, 0 skipped. `npm run typecheck`, scoped ESLint, scoped Prettier, and `npm run --workspace @campusmarkt/web build` passed on the final state. T4's broader gate including cookie-adapter tests passed 364 tests. Pre-feature test count was not measured in this verification; no test deletion appears in the feature diff.

## Spec-anchored acceptance criteria

| Criterion | Expected outcome and evidence | Result |
| --- | --- | --- |
| SESS-01.1 sign-in credentials | `session-cookie.ts:30-37,40-48,51-71` sets both cookies with HttpOnly, SameSite=Lax, production Secure, and 30-day Max-Age; `tests/integration/identity/session-routes.test.ts:83-100,116-157` asserts both token values, Max-Age, and all three attributes separately per cookie in production. | PASS |
| SESS-01.2 near-expiry rotation | `session-refresh.ts:100-105,117-135` exchanges and forwards the new pair; `tests/integration/identity/session-refresh.test.ts:44-74` asserts both tokens, per-cookie HttpOnly/SameSite, and remaining age; `session-refresh.test.ts:76-99` asserts refresh at 60 seconds and no refresh at 61; `session-refresh.test.ts:101-123` asserts per-cookie production Secure. | PASS |
| SESS-01.3 original 30-day expiry | `session-refresh.ts:88-98,117-133` retains `stored.issuedAt`; `tests/integration/identity/session-refresh.test.ts:65-73,143-156` checks preserved issue time, reduced Max-Age, and expiry at day 30. | PASS |
| SESS-01.4 absent/old refresh | `session-refresh.ts:84-98` skips missing refresh and clears aged credentials; `tests/integration/identity/session-refresh.test.ts:127-156` asserts no refresh and expiry clearing. `server/access.ts:72-74` rejects expired access JWT. | PASS |
| SESS-01.5 invalid/unavailable refresh | `session-refresh.ts:105-115` clears both on invalid and retains them on unavailable; `tests/integration/identity/session-refresh.test.ts:159-183` asserts those exact outcomes. Expired access remains denied by `server/access.ts:72-74`. | PASS |
| SESS-02.1 current/all logout | `sessions/current/route.ts:37-50` and `sessions/route.ts:142-152` clear both cookies; `application/access/index.ts:233-264` attempts local/global provider logout; `tests/integration/identity/session-routes.test.ts:455-485,533-559`, `apps/web/src/modules/identity/application/access/index.test.ts:260-287`, and `tests/integration/identity/auth-gateway.test.ts:172-194` assert cookie clearing, calls, scopes, and JWT forwarding. | PASS |
| SESS-02.2 recovery/deletion | `password-resets/route.ts:81-87` and `me/deletion/route.ts:84-98` clear both; `tests/integration/identity/recovery-routes.test.ts:258-283` and `tests/integration/identity/deletion-routes.test.ts:409-424` assert both expire. | PASS |
| SESS-02.3 real reauthentication pair | `application/access/index.ts:266-307` validates and emits both real tokens; `me/reauthentication/route.ts:77-96` writes them; `tests/integration/identity/deletion-routes.test.ts:68-126` and `apps/web/src/modules/identity/application/access/index.test.ts:303-330` assert exact replacement. | PASS |
| SESS-02.4 failed/missing-pair sign-in | `application/access/index.ts:185-216` requires both tokens; `sessions/route.ts:60-88,106-112` does not write or report success without them; `tests/integration/identity/session-routes.test.ts:156-200` checks 503/401 and absent Set-Cookie; `apps/web/src/modules/identity/application/access/index.test.ts:214-230` checks missing-pair compensation. | PASS |

No spec-precision gap remains: the 60-second threshold and per-cookie security attributes are asserted to their exact outcomes. The legacy access-only and transient failure edge cases are represented by `tests/integration/identity/session-refresh.test.ts:127-141,172-183`.

## Discrimination sensor

Vitest loaded temporary Vite transform plugins that mutated module text in memory. Committed source was never edited. The temporary config was removed; `git status --porcelain=v1` returned to the pre-sensor state, containing only this untracked report. Each mutant ran against the relevant session tests; no server or watcher was started.

| Mutation | Source line | Result |
| --- | --- | --- |
| Remove HttpOnly from common route cookie header | `session-cookie.ts:45` | Killed: 2 tests failed |
| Return full 30-day age after refresh | `session-cookie.ts:27` | Killed: 2 tests failed |
| Skip refresh for recently expired JWT | `session-refresh.ts:101` | Killed: 2 tests failed |
| Bypass invalid-refresh clearing | `session-refresh.ts:107` | Killed: 1 test failed |
| Drop access cookie on transient failure | `session-refresh.ts:106` | Killed: 1 test failed |
| Keep old token in server request after rotation | `session-refresh.ts:121` | Killed: 1 test failed |
| Change refresh trigger from `now + 60` to `now + 0` | `session-refresh.ts:101` | Killed after T3: 2 tests failed |
| Remove HttpOnly only from rotated refresh cookie | `session-refresh.ts:129-133` | Killed after T3: 2 tests failed |
| Remove production Secure from sign-in cookie header | `session-cookie.ts:47` | Killed after T4: 1 test failed |
| Remove production Secure from rotated refresh cookie | `session-refresh.ts:129-133` | Killed after T4: 1 test failed |

**Sensor result:** 10 killed, 0 survived; PASS. The final rerun of the four initially surviving mutants used 27 route/refresh tests. An exploratory string `NotHttpOnly` passed a substring assertion and was discarded as an invalid attribute mutation; the replacement `PublicCookie` above confirmed the common-header test detects actual absence.

## Code quality and ranked fix tasks

The diff remains inside session handling, affected identity routes, and requirement tests. Business rules stay in the application/session modules; server authorization remains in the existing session DAL. No deferred product capability or secret was added. All changed tests map to the session requirements or affected identity behavior. T3 and T4 closed the test gaps found in the initial verifier pass. No ranked gaps remain.

**Next step:** Local implementation is complete. Deployment requires separate authorization.
