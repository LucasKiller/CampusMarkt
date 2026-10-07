# Optional profile avatar verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: `c2a024242173b19328dc43b760100423e6cff23a..f8f2a3a79be615db0992ee63023c4b46e9b7c1d9`
**Round**: 2 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `DESIGN.md` | yes - composition, account/profile, color and accessibility sections | none | - |
| `.specs/STATE.md` AD-007 | yes - same-origin owner-authorized identity mutation | none | - |
| `.specs/features/002-identity-accounts/spec.md` | yes - avatar format, size, privacy and session rules | none; feature 026 intentionally replaces the older fallback | - |
| `docs/product/01-domain-model.md`, `docs/product/02-mvp-scope.md` | yes - public profile and web V1 boundary | none | - |
| feature `plan.md` | yes - Surface, Observable and Criteria | none | - |

The setup screen has the account heading, a setup card with introduction, preview and photo selection, then the later action. C2 asserts heading, explanatory copy, and preview/selection/later visibility and vertical order at 390 px. The existing account, public profile, listing detail, inbox, conversation, and blocked-user layouts retain their existing avatar regions; C7 visits each and checks the shared shape. The binding design has no fixed setup mock. Spacing, color, and type weight on the setup screen remain visual judgment items; its selector-reachable copy and arrangement are covered.

## Checks

| Check | Claim | Proof run at HEAD | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | confirmation to setup | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:62-85` - exact sign-in href, account setup URL, setup visible | PASS |
| C2 | setup preview, selection, later in order | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:94-112` - heading/copy and three visible elements with increasing top coordinates | PASS |
| C3 | skip without upload | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:129-131` - account URL, setup absent, zero POSTs | PASS |
| C4 | JPEG/PNG/WebP, 5 MB, owner path, saved photo | browser and Vitest pass | `tests/integration/identity/avatar-processing.test.ts:100-109,122-129` - three accepted formats and oversized rejection; `apps/web/tests/avatar-onboarding.spec.ts:140-180` - authenticated cookie on POST, saved image, no POST for oversized browser file; `tests/integration/identity/avatar-routes.test.ts:445-457` - unauthenticated POST rejected | PASS |
| C5 | invalid/failure retains current avatar and later action | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:198-236` - exact invalid/dependency errors, generic retained, prior photo retained, later link visible | PASS |
| C6 | absent/unconfirmed session denied | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:239-253` - both sessions redirect; no setup controls | PASS |
| C7 | same fallback on six surfaces | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:256-281` - all six routes, visible SVG and equal path signature | PASS |
| C8 | unchanged by reload/name | browser and Vitest pass | `apps/web/tests/avatar-onboarding.spec.ts:282-294` - reload preserves path signature; `apps/web/src/components/identity/generated-avatar.test.tsx:15-18` - equal path/circle markup for two names | PASS |
| C9 | removal restores account/public fallback | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:337-342` - public photo before removal, account and public SVG after response-driven removal | PASS |
| C10 | local inline art without remote/stored/email dependency | Vitest pass and code inspection | `apps/web/src/components/identity/generated-avatar.test.tsx:26-39` - inline SVG; no image, source, style, URL, email marker or fetch; `apps/web/src/components/identity/generated-avatar.tsx:8-55` - fixed local geometry only | PASS |
| C11 | loaded photo wins | browser pass | `apps/web/tests/avatar-onboarding.spec.ts:355-360` - image visible with `naturalWidth=1`, generic count zero | PASS |

At HEAD, `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs --reporter=list` ran all ten named cases: 10 passed, exit 0. `npx vitest run apps/web/src/components/identity/generated-avatar.test.tsx tests/integration/identity/avatar-processing.test.ts tests/integration/identity/avatar-routes.test.ts --reporter=verbose` ran 56 individually named cases: 56 passed, exit 0. Playwright stopped its managed server on exit. Every new proof belongs to the full feature diff; the existing route proof is additional boundary evidence.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| account setup outcomes (2) | plan Surface and account page guard | active C2; absent/unconfirmed redirect C6 | - |
| photo choice (2) | plan S1 | upload C4; later C3 | - |
| allowed formats (3) | identity spec and plan | JPEG, PNG, WebP in table-driven C4 | - |
| setup failure classes (2) | plan AC5 | invalid and dependency C5, with empty and existing photo | - |
| photo-less surfaces (6) | plan AC7 | account, public, listing, inbox, conversation, blocked users C7 | - |
| avatar render states (2) | plan AC7/AC11 | generic C7; decoded uploaded photo C11 | - |
| transitions (3) | plan AC8/AC9 | reload and rename C8; removal from public photo to fallback C9 | - |

No Relations or Landing set exists. The only Surface route has the outcome row above. Swept existing constraints were re-read: confirmed-session account guard in `apps/web/src/app/account/page.tsx:45-49`; owner route security and version-aware swap in the existing identity endpoint/service; existing avatar removal in `apps/web/src/app/account/avatar/avatar-manager.tsx:115-128`. Observability is an approved n/a.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Setup view branch and skip navigation | account page, setup component, confirmation link | active, skipped, absent/unconfirmed browser cases | yes |
| Generic SVG renderer | generated avatar and six consuming views | component plus browser; shared SVG and no remote source | yes |
| Existing avatar processor and endpoint | avatar manager, processor, endpoint | all formats, size, invalid/dependency, auth boundary and setup browser | yes |

## Faults injected

The real tree was read-only apart from this report. A detached scratch worktree at HEAD was used. All mutation test processes exited. The scratch worktree remains registered because the filesystem tool rejected junction cleanup; this does not affect the feature tree or proof results.

| Mutation | Location | Killed |
| --- | --- | --- |
| Insert remote CSS `url(https://example.com/art.svg)` into inline SVG | `apps/web/src/components/identity/generated-avatar.tsx:20` | yes - C10 component proof failed at line 32 |
| Make SVG background fill depend on display name | `apps/web/src/components/identity/generated-avatar.tsx:20` | yes - C8 component proof failed at line 16 |
| Change skip destination from `/account` to `/` | `apps/web/src/app/account/avatar/account-avatar-setup.tsx:25` | yes - C3 browser proof failed at line 129 using a scratch-only webpack dev server |

The scratch production build could not resolve the junctioned dependencies with Turbopack. The browser mutation was run through a scratch-only webpack dev server; its failure reached the C3 assertion and was behavioral, not a startup failure.

## Gate

Named feature proofs: 66 passed, 0 failed at HEAD. Three behavior faults were killed. Repository-wide `npm run check` remains red on the pre-existing Prettier baseline; targeted feature gates passed. Completion validator run is recorded separately by the orchestrator.
