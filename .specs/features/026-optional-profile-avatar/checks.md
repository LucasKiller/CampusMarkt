# Optional profile avatar checks

Profile: ui
Plan: `.specs/features/026-optional-profile-avatar/plan.md`

11 checks in 2 slices · 0 one-way doors · 0 blocking questions

## Checks

### S1 - Offer a photo at first profile access

**C1** - After confirmed email, the sign-in action returns a successful sign-in to `/account?setup=avatar` (AC 1).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "confirmation leads to avatar setup"`

**C2** - An active member at `/account?setup=avatar` sees the avatar preview, photo selection, and "Do this later" in that order, with no required file (AC 2).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "setup offers photo or later"`

**C3** - Choosing "Do this later" opens `/account` without a request to `POST /api/identity/me/avatar` (AC 3).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "skipping setup makes no avatar upload"`

**C4** - Setup accepts a valid JPEG, PNG, or WebP file no larger than 5 MB through the existing owner-authorized avatar path and shows the saved photo (AC 4).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "setup saves a valid photo"`
Proof: `npx vitest run tests/integration/identity/avatar-processing.test.ts -t "accepts supported avatar formats"`

**C5** - Invalid or failed setup upload retains the generic avatar, shows a specific error, and leaves "Do this later" usable (AC 5).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "invalid setup photo keeps generic avatar"`
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "failed setup upload keeps generic avatar"`

**C6** - Without an active confirmed session, `/account?setup=avatar` redirects to sign-in and shows no owner controls (AC 6).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "setup requires a confirmed session"`

### S2 - Consistent generic avatar

**C7** - Account, public profile, listing detail, inbox, conversation, and blocked-user views render the same abstract SVG when the relevant profile has no photo (AC 7).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "shared generic avatar appears on all profile surfaces"`

**C8** - The generic SVG is unchanged after reload and display-name change (AC 8).
Proof: `npx vitest run apps/web/src/components/identity/generated-avatar.test.tsx -t "generic avatar is independent of display name"`

**C9** - Removing an uploaded avatar restores the generic SVG in account and public profile views (AC 9).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "removing photo restores the generic avatar"`

**C10** - The generic avatar is an inline local SVG with no per-user stored image, remote resource, or email-derived value (AC 10).
Proof: `npx vitest run apps/web/src/components/identity/generated-avatar.test.tsx -t "generic avatar uses only local vector markup"`

**C11** - A successfully loaded uploaded avatar appears instead of the generic SVG (AC 11).
Proof: `npx playwright test avatar-onboarding.spec.ts --config apps/web/playwright.config.mjs -g "uploaded photo takes priority over generic avatar"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /account?setup=avatar` outcomes (2) | 200 active member C2 · redirect without confirmed session C6 | - |
| photo choice outcomes (2) | upload C4 · later C3 | - |
| allowed upload formats (3) | JPEG C4 · PNG C4 · WebP C4 | - |
| setup upload failure classes (2) | invalid C5 · dependency failure C5 | - |
| photo-less profile surfaces (6) | account C7 · public profile C7 · listing detail C7 · inbox C7 · conversation C7 · blocked users C7 | - |
| avatar render states (2) | no photo C7 · loaded photo C11 | - |

- The only new route signature is the optional account setup query; C2 and C6 cross that boundary.
- The existing avatar upload endpoint keeps its current body and response contract. C4 and C5 prove the new UI reaches it without altering its authorization rule.

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Setup view branch and skip navigation | browser proof at `/account?setup=avatar` | active, skipped, and unauthenticated outcomes asserted separately |
| Generic SVG renderer | focused component proof and browser integration proof | one SVG signature across every named surface; no remote image source in fallback |
| Existing avatar processor and endpoint | existing integration proofs plus setup browser proof | all three allowed formats and invalid/dependency outcomes |

Evidence:

- `apps/web/src/app/account/page.tsx`: the new setup query introduces one visible branch beside normal account rendering.
- `apps/web/src/app/account/avatar/avatar-manager.tsx`: existing file validation, upload and removal already decide image, error and fallback outcomes.
- Closest analogue: `apps/web/tests/avatar.spec.ts` proves account upload, removal, and invalid selection through browser-visible behavior.

Cost: one new browser proof file, one small vector component proof, and one table-driven format assertion in the existing avatar processor tests.

## Swept

- validation: C4, C5 - existing format and 5 MB rules remain effective.
- failure modes: C5 - invalid and dependency failures preserve fallback and skip.
- idempotency: C8 - reload produces unchanged markup; no write occurs for fallback.
- authorization: C6 - existing account and avatar guards remain active.
- concurrency: existing - the version-aware `swap_avatar` path is unchanged.
- data lifecycle: C9, C10 - removal restores inline art; no generic object is stored.
- dependency failure: C5 - upload failure does not block account use.
- state transitions: C3, C4, C9, C11 - skip, upload, removal, and display precedence.
- observability: n/a - no new background work, external call, or diagnostic event is introduced.

## Handoff

- S1 touches confirmation, sign-in return navigation, account setup, and existing avatar control: about 35 KB / 4 = ~9k tokens.
- S2 touches the shared SVG and six existing display surfaces plus proofs: about 75 KB / 4 = ~19k tokens. Total ~28k, under the default 150k budget: one builder.
