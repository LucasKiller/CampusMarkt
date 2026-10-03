# Password Entry Usability Tasks

**Status:** Approved by the operator's 2026-10-03 request.

## Test Coverage Matrix

| Layer | Test type | Coverage expectation | Files | Gate command |
| --- | --- | --- | --- | --- |
| Browser | Playwright | PWDUI-01 reveal/hide and independent fields; PWDUI-02 empty/mismatch/match/error; PWDUI-03 progressive milestones, paste, and responsive layout. | `apps/web/tests/registration.spec.ts`, `apps/web/tests/sessions.spec.ts`, `apps/web/tests/identity-acceptance/identity-acceptance.spec.ts` | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/registration.spec.ts apps/web/tests/sessions.spec.ts apps/web/tests/identity-acceptance/identity-acceptance.spec.ts` |

## Gate Check Commands

| Scope | Command |
| --- | --- |
| Browser | `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/registration.spec.ts apps/web/tests/sessions.spec.ts apps/web/tests/identity-acceptance/identity-acceptance.spec.ts` |
| Types | `npm run typecheck` |
| Lint | `npx eslint apps/web/src/app apps/web/tests/registration.spec.ts apps/web/tests/sessions.spec.ts apps/web/tests/identity-acceptance/identity-acceptance.spec.ts` |
| Format | `npx prettier --check apps/web/src/app/globals.css apps/web/tests/registration.spec.ts apps/web/tests/sessions.spec.ts apps/web/tests/identity-acceptance/identity-acceptance.spec.ts` |

## Execution Plan

```text
T1 -> T2 -> T3
```

## Task Breakdown

### T1: Add password controls, confirmation, and guidance

**Depends on:** none
**Requirements:** PWDUI-01, PWDUI-02, PWDUI-03
**Deliverable:** Shared reveal control, registration confirmation and progress guidance, scoped styles, and requirement-derived browser checks.
**Done when:** Each field toggles independently; missing or mismatched confirmation blocks requests; matching confirmation is not sent; the existing password policy remains unchanged; relevant browser tests pass.
**Tests:** Browser checks in the coverage matrix.
**Gate:** Browser, types, lint, formatting, and task/requirement status update in the same atomic commit.

### T2: Close independent test coverage findings

**Depends on:** T1
**Requirements:** PWDUI-01, PWDUI-03
**Deliverable:** Browser assertions for both visibility controls, rendered progress colors, and registration submission with 10/128-code-point passwords, plus server-rule boundary assertions.
**Done when:** The confirmation control's false pressed-state mutation is detected; browser tests prove the remaining outcomes identified in `validation.md`.
**Tests:** Focused registration browser checks and the full browser command in the coverage matrix.
**Gate:** Browser, types, lint, and formatting before an atomic test-fix commit.

### T3: Close sign-in and milestone test gaps

**Depends on:** T2
**Requirements:** PWDUI-01, PWDUI-03
**Deliverable:** Exact sign-in button accessibility and non-submission assertions, plus milestone text and computed color assertions.
**Done when:** The sign-in-only false pressed-state mutation fails the browser test and the 10/14/20 milestone labels and colors match the spec.
**Tests:** Focused sign-in and registration browser checks and the full browser command in the coverage matrix.
**Gate:** Browser, types, lint, and formatting before an atomic test-fix commit.

## Status

- [x] T1
- [x] T2
- [x] T3

T1 gate: 52 relevant Playwright tests passed; after the Unicode input adjustment, 11 registration tests and the final focused guidance test passed. Typecheck, scoped lint, formatting, and tracked-secret scan passed. Playwright stopped its temporary server after each run.

T2 gate: 54 relevant Playwright tests, 47 account-validation unit tests, typecheck, scoped lint, and formatting passed. A focused four-test browser run covered both visibility controls, rendered guidance, paste, and Unicode input. The temporary browser server exited and port 3100 had no listener.

T3 gate: Three focused browser tests and the complete 54-test browser suite passed. Typecheck, scoped lint, and formatting passed. Port 3100 had no listener after Playwright exited.

After T3 is committed, a fresh verifier reviews the spec, diff, tests, and a discrimination sensor and updates `validation.md`.
