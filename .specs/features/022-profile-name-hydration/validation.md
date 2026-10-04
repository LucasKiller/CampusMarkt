# Saved Profile Name in Account Settings Validation

**Result:** PASS. Five acceptance criteria match the spec, all gates passed, and the isolated mutation was killed.  
**Date:** 2026-10-04  
**Spec:** `.specs/features/022-profile-name-hydration/spec.md`  
**Diff range:** `cb02941^..f11bd67`  
**Verifier:** independent sub-agent; author != verifier

## Task completion

| Task | Result | Evidence |
| --- | --- | --- |
| T1 | Done | `tasks.md:34-42` specifies hydration, ordering, and failure behavior; commit `cb02941` implements them. |
| T2 | Done | `tasks.md:43-50` requires observable GET completion; commit `f11bd67` adds `aria-busy` and the wait in the browser test. |

## Spec-anchored acceptance criteria

| Criterion | Required outcome | Assertion and implementation evidence | Result |
| --- | --- | --- | --- |
| NAME-01.1, open or refresh | Both input and current-name text equal the owner-profile GET display name. | `apps/web/tests/profiles.spec.ts:249-269` returns `Registration Name`, then asserts `toHaveValue("Registration Name")` and matching current-name text. `apps/web/src/app/account/profile/profile-editor.tsx:25-41` applies GET data. | PASS |
| NAME-01.2, update and refresh | Both values equal the newly persisted name after reload. | `apps/web/tests/profiles.spec.ts:228-260` models PATCH and subsequent GET with `savedName`; `:271-281` reloads and asserts `Updated Name` in both places. `apps/web/src/app/account/profile/profile-editor.tsx:116-121` applies the save response. | PASS |
| NAME-01.3, edit before GET finishes | Late GET cannot replace the active input edit. | `apps/web/tests/profiles.spec.ts:297-321` delays GET, fills `Unsaved Edit`, releases GET, observes `Current display name: Saved Name`, then asserts input `Unsaved Edit`. `apps/web/src/app/account/profile/profile-editor.tsx:40-42,192-195` guards the edit. | PASS |
| NAME-01.4, save before GET finishes | After late GET completion, input and current-name text still equal `New Name`, not `Old Name`. | `apps/web/tests/profiles.spec.ts:337-374` delays GET with `Old Name`, saves `New Name`, releases GET, waits for `aria-busy="false"`, then asserts both values remain `New Name`. `apps/web/src/app/account/profile/profile-editor.tsx:38-42,50-51,118-120,191` supplies the save guard and completion state. | PASS |
| NAME-01.5, GET fails | Do not claim `User` is the saved name. | `apps/web/tests/profiles.spec.ts:389-404` returns 503 and asserts the error, empty input, and `toHaveCount(0)` for `Current display name: User`. `apps/web/src/app/account/profile/profile-editor.tsx:6-7,44-48,132-142` starts empty and shows failure. | PASS |

**Spec precision:** Each criterion defines an observable name or state, and its assertion checks that outcome. No precision gap.

## Gate check

| Command from `tasks.md` | Result |
| --- | --- |
| `npx playwright test --config apps/web/playwright.config.mjs apps/web/tests/profiles.spec.ts` | PASS: 11 passed, 0 failed, 0 skipped. |
| `npm run typecheck` | PASS |
| `npx eslint apps/web/src/app/account/profile/profile-editor.tsx apps/web/tests/profiles.spec.ts` | PASS |
| `npx prettier --check apps/web/src/app/account/profile/profile-editor.tsx apps/web/tests/profiles.spec.ts` | PASS |
| `npm run --workspace @campusmarkt/web build` | PASS |

The scoped suite had seven tests at `cb02941^` and eleven at `f11bd67`: four added, none deleted or weakened. All new tests map to NAME-01. The Playwright-managed server stopped; no port 3100 listener remained.

## Discrimination sensor

**Result:** PASS; one mutation injected, one killed, zero survived.

| Mutation | Location | Observed result |
| --- | --- | --- |
| Remove the successful-save guard from the late GET path: `if (active && !savedRef.current)` to `if (active)`. | `apps/web/src/app/account/profile/profile-editor.tsx:38` in the independent clone. | Targeted Playwright test reached its assertion and failed at `apps/web/tests/profiles.spec.ts:374`: `Current display name: New Name` was absent after the late GET. Exit 1, one failed test. |

The scratch clone was created with `git clone --local --no-hardlinks` at `C:\Users\INOVV\AppData\Local\Temp\campusmarkt-profile-sensor-20833fb95d824dc5b2e4da0b8268d1d2`, outside the repository, and received its own `npm ci`. Its `node_modules` was a directory, not a junction or symlink. The clone remained available through review and was then safely removed. Real-tree porcelain before and after the sensor matched: only this untracked `validation.md`. No real source or test was changed.

## Code quality and scope

- Runtime changes stay in the profile editor. The GET shape agrees with `apps/web/src/app/api/identity/me/profile/route.ts:45-58`; server authorization is unchanged.
- Loading state, edit/save guards, and `aria-busy` serve NAME-01. No deferred product feature, endpoint, schema, secret, or unnecessary abstraction was added.
- Each added test maps to NAME-01. The sensor proves the late-save assertion detects a real ordering fault.
- Guidance checked: `AGENTS.md`, `DESIGN.md`, `.specs/STATE.md`, `docs/product/00-product-vision.md`, `docs/product/01-domain-model.md`, and `docs/product/02-mvp-scope.md`.
- Interactive UAT was not run for this narrow account-field correction; browser tests cover its required rendered states and ordering.

## Requirement traceability

`NAME-01`: Verified by 5/5 criteria, all gates, and the killed mutation. `spec.md` still records validation pending; this verifier's scope allows only the `validation.md` report. The orchestrator can update the spec status when closing the feature.

**Overall:** PASS; ready for the completion gate and status update.
