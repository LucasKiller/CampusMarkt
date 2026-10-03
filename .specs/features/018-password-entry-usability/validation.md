# Password Entry Usability Validation

**Result:** PASS
**Date:** 2026-10-03
**Spec:** `.specs/features/018-password-entry-usability/spec.md`
**Diff range:** `cb127a6^..2c5512f`
**Verifier:** fresh independent sub-agent; author != verifier

## Task completion

T1, T2, and T3 are complete in `tasks.md:55-59`. The verification findings from the first two rounds were closed by the T2 and T3 test commits. No implementation defect was observed.

## Spec-anchored acceptance criteria

| Criterion | Spec-defined outcome | Exact assertion and implementation evidence | Result |
| --- | --- | --- | --- |
| PWDUI-01.1 | Sign-in and registration passwords alternate masked/visible while retaining value, focusability, autocomplete, and non-submit behavior. | `apps/web/tests/sessions.spec.ts:21-22` checks type/autocomplete; `:23-41` checks button type, keyboard focus, both type/value transitions, and zero requests. `apps/web/tests/registration.spec.ts:18-20` checks type/autocomplete; `:25-55` checks button type, keyboard focus, independent type/value transitions, and zero requests. `apps/web/src/app/(identity)/password-input.tsx:22-34` preserves input props and uses `type="button"`. | PASS |
| PWDUI-01.2 | Named controls report false/true/false pressed states; registration fields toggle independently. | `apps/web/tests/sessions.spec.ts:23-25`, `:32-39` assert Show/Hide names and false/true/false. `apps/web/tests/registration.spec.ts:21-28`, `:34-49` assert both named controls and false/true/false; `:33-39`, `:45-53` assert independent field types. | PASS |
| PWDUI-02.1 | Missing or mismatched confirmation shows its field error, focuses summary, and sends no request. | `apps/web/tests/registration.spec.ts:194-204` asserts mismatch focus, exact field text, and zero requests; `:224-230` does the same for missing confirmation. | PASS |
| PWDUI-02.2 | Matching confirmation sends the primary password without a confirmation key. | `apps/web/tests/registration.spec.ts:151-168` fills matching boundary values and asserts the exact `password` request value and absent `confirmPassword`; `:399-405`, `:422-435` repeats with a regular password. | PASS |
| PWDUI-02.3 | Local or remote registration failure clears both fields. | `apps/web/tests/registration.spec.ts:196-204` asserts both cleared after local mismatch; `:329-347` asserts both cleared after HTTP 400. `apps/web/src/app/(identity)/registration/registration-form.tsx:46-49`, `:76-80`, `:103-106`, `:123-128` uses the shared clear path for local, API, and network errors. | PASS |
| PWDUI-03.1 | Guidance progressively marks the 10/14/20 code-point milestones through text and color. | `apps/web/tests/registration.spec.ts:72-83` asserts 10-character label, progress text, completed/incomplete text color and segment colors; `:85-97` asserts the exact 14-character label, progress text, and colors; `:99-106` asserts the exact 20-character label, progress text, and completed colors. `apps/web/src/app/(identity)/registration/password-guidance.tsx:7-9` counts Unicode code points. | PASS |
| PWDUI-03.2 | Guidance disclaims a security score and permits paste, manager-compatible autocomplete, and any server-accepted 10-128-code-point password. | `apps/web/tests/registration.spec.ts:68-70` asserts the disclaimer; `:19-20` checks both `new-password` attributes; `:113-168` pastes 10 characters and fills 128 emoji code points, then checks the exact request password and absent confirmation. `packages/validation/src/identity/account/index.test.ts:71-76`, `:80-90` asserts inclusive ASCII/emoji bounds and rejects out-of-range input. | PASS |

**Spec precision:** 0 gaps. **Automated acceptance outcomes:** 7/7.

## Gates and test integrity

| Gate | Fresh result |
| --- | --- |
| Browser gate from `tasks.md` | 54 passed, 0 failed, 0 skipped |
| `npx vitest run packages/validation/src/identity/account/index.test.ts` | 47 passed, 0 failed |
| `npm run typecheck` | Passed |
| Scoped ESLint from `tasks.md` | Passed |
| Scoped Prettier from `tasks.md` | Passed |

The relevant browser count increased from 47 before T1 to 54 after T3. No test was deleted or weakened in the reviewed feature diff. The Playwright server exited after each run; port 3100 had no listener after verification. The unavailable local Supabase endpoint logged a warning but did not fail the gate.

## Discrimination sensor

The real checkout's baseline porcelain contained only this untracked report. An attempted detached scratch source runner could not establish a passing baseline because its dependency links broke the build, so those runs are excluded from the sensor verdict. Its worktree and added files were removed. The valid sensor used temporary copies of the existing focused browser tests in the real workspace and a pre-hydration `MutationObserver` to force only the target control's rendered `aria-pressed` to `false`. This was a DOM behavior mutation, not a source-code mutation; implementation files were never changed.

| Injected fault | Focused outcome | Result |
| --- | --- | --- |
| Force false for the sign-in button associated with `autocomplete="current-password"` | The copied `apps/web/tests/sessions.spec.ts:33` assertion failed: Hide password expected `true`, received `false` (temporary sensor test line 47). | Killed |
| Force false for the confirmation button associated with `id="confirmPassword"` | The copied `apps/web/tests/registration.spec.ts:43` assertion failed: Hide confirm password expected `true`, received `false` (temporary sensor test line 57). | Killed |

**Sensor:** 2 injected, 2 killed, 0 survived; PASS. The unmodified focused tests passed in the 54-test baseline gate. Both temporary sensor test files were removed, and real-tree porcelain returned to only this report. No process was listening on port 3100.

## Code quality and edge cases

The reviewed diff is scoped to the approved forms, guidance, styles, tests, and feature records. The shared input is justified by three fields and retains existing input IDs, names, autocomplete, values, and error descriptions. Registration sends only the existing request body fields; no server, Auth, or database policy changed. Tests cover missing, mismatched, matching, server-error, paste, ASCII/Unicode boundary, and 360px layout paths. The implementation follows `AGENTS.md`, `DESIGN.md`, and the coding-guidelines skill. No unclaimed feature behavior was found.

## Limitations

No interactive human UAT, visual judgment, or third-party password-manager autofill was observed. Browser checks used Chromium at 360px and 1280px. The previous verifier's unrelated dependency residue at `C:\Users\INOVV\AppData\Local\Temp\campusmarkt-pwdui-sensor-20261003` remains after automatic command review rejected its recursive deletion; this verifier did not retry that rejected deletion. Clean PASS introduced no new lesson; the prior L-018 lesson remains.

## Requirement traceability

| Requirement | Status |
| --- | --- |
| PWDUI-01 | Verified |
| PWDUI-02 | Verified |
| PWDUI-03 | Verified |

**Overall:** PASS. Local feature 018 meets its seven acceptance criteria with passing gates and a 2/2 targeted discrimination sensor.