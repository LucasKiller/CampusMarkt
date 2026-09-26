# 015 — Marketplace visual system checks

Profile: ui
Plan: `.specs/features/015-marketplace-visual-system/plan.md`

14 checks in 3 slices · 1 one-way door · 0 open questions.

## Checks

### S1 - Identity and responsive navigation · 4 files · ~20 KB · ~5k tokens

**C1** - Home and search use `#0B665E` brand, `#F7F8F5` canvas, Inter/system type, and visible focus tokens (AC 1; Landing identity).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "identity tokens on home and search" --config apps/web/playwright.config.mjs`

**C2** - At 390px, home exposes search in the first viewport and starts the listing showcase before a full-screen hero ends (AC 2).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "home search and showcase at 390px" --config apps/web/playwright.config.mjs`

**C3** - At 390px, the five mobile destinations are visible with no page overflow and no covered final content (AC 3).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "five mobile destinations fit without overlap" --config apps/web/playwright.config.mjs`

**C4** - New navigation labels are English without a locale cookie and German with `NEXT_LOCALE=de` (AC 4).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "mobile navigation follows locale cookie" --config apps/web/playwright.config.mjs`

### S2 - Coherent discovery · 4 files · ~50 KB · ~13k tokens

**C5** - Feed and search cards have `1:1` undistorted media and display title, price/intent, pickup area, type, and reserved text when applicable (AC 5).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "feed and search cards share square media" --config apps/web/playwright.config.mjs`

**C6** - Photo-less `WANTED` and other listings keep the square media region and show type-appropriate text, not a fake image (AC 6).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "photo-less cards have honest placeholders" --config apps/web/playwright.config.mjs`

**C7** - Changing and clearing category/type/area preserves feed query behavior and exposes the active selection (AC 7).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "feed filters stay functional and visible" --config apps/web/playwright.config.mjs`

**C8** - Empty feed and search show an explanation and a working clear/explore action (AC 8).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "empty discovery has a next action" --config apps/web/playwright.config.mjs`

**C9** - Failed feed and search requests show error feedback distinct from empty, with retry (AC 9).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "discovery failures offer retry" --config apps/web/playwright.config.mjs`

### S3 - Detail and safe decisions · 3 files · ~45 KB · ~12k tokens

**C10** - An active listing shows gallery, title, price/intent, description, approximate area, seller, and optional badge without private email/address (AC 10).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "detail presents public decision information" --config apps/web/playwright.config.mjs`

**C11** - `WANTED` detail has no purchase CTA and only its allowed contact action (AC 11).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "wanted detail never offers purchase" --config apps/web/playwright.config.mjs`

**C12** - Reserved, sold, and owned listings do not present an available buyer CTA (AC 12).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "unavailable buyer actions stay unavailable" --config apps/web/playwright.config.mjs`

**C13** - On mobile, an available detail action stays reachable without covering the final content or navigation (AC 13).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "mobile detail action leaves content reachable" --config apps/web/playwright.config.mjs`

**C14** - An unavailable detail provides a safe route back to browsing instead of an empty action panel (AC 14).
Proof: `npx playwright test marketplace-visual-system.spec.ts -g "unavailable detail links back to browse" --config apps/web/playwright.config.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| identity screens (2) | `/` C1 · `/search` C1 | - |
| mobile destinations (5) | explore C3 · search C3 · favorites C3 · messages C3 · account C3 | - |
| mobile locale (2) | `en` C4 · `de` C4 | - |
| card image states (3) | photo C5 · no photo C6 · photo-less `WANTED` C6 | - |
| core listing types (3) | `SELL` C5/C10 · `GIVE_AWAY` C5/C10 · `WANTED` C6/C11 | - |
| detail availability (4) | active C10 · reserved C12 · sold C12 · owned C12 | - |
| discovery outcomes (3) | results C5 · empty C8 · error C9 | - |

No route signatures, database entities, or startup configuration change. `DESIGN.md` identity door is covered by C1, C5, and C10–C13.

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| UI condition choosing an action or state | browser proof at the rendered boundary | each `SELL`/`GIVE_AWAY`/`WANTED` and active/reserved/closed/owned branch asserted where the code chooses it |
| Visual layout and state | browser proof with computed style, visible text, and geometry | both 390px and desktop where a layout change is claimed; empty/error are distinct |
| Existing service and route passthrough | existing tests remain green | no new business-rule assertion from a styling-only edit |

Evidence: `feed.tsx` branches on listing type, reserved state, image presence, and optional badge; `listings/[id]/page.tsx` branches on type/state/owner; `marketplace-feed.tsx` branches on results/empty/error. Existing analogues: `apps/web/tests/marketplace-feed.spec.ts`, `apps/web/tests/marketplace-search.spec.ts`, and `apps/web/src/components/marketplace/feed.test.tsx`.

Cost: one new browser spec with 14 named cases; existing unit/E2E suites stay as regression checks. No repository-wide testing guideline changes.

## Swept

- validation: existing - forms and listing validation are unchanged.
- failure modes: C9, C14.
- idempotency: existing - no new mutation is introduced; existing negotiation/favorite actions keep their guards.
- authorization: C11, C12; existing server/data authorization is unchanged.
- concurrency: n/a - presentation adds no concurrent state transition.
- data lifecycle: n/a - no stored-data change.
- dependency failure: C9, C14.
- state transitions: C5, C11, C12.
- observability: n/a - no new backend operation or metric is introduced.

## Handoff

Estimated touched source: S1 ~20 KB/4 = 5k tokens; S2 ~50 KB/4 = 13k; S3 ~45 KB/4 = 12k; tests and review overhead ~25k; total ~55k, below the default 150k budget. Mechanism: one builder.

- **Boundary:** C1–C14 implemented in the home/search/card/detail web UI; ready for independent verification after the feature commit.
- **Settled mid-build:** German expectations in older browser tests now set an explicit `de` cookie, consistent with AD-020's English default. Search filter controls also follow the active locale.
- **Abandoned:** A mobile sticky action rail inside the detail grid could overlap bottom navigation; replaced with a fixed, height-bounded action panel and reserved page space.

## Completion

| Check | Build status |
| --- | --- |
| C1 | implemented; named proof passes |
| C2 | implemented; named proof passes |
| C3 | implemented; named proof passes |
| C4 | implemented; named proof passes |
| C5 | implemented; named proof passes |
| C6 | implemented; named proof passes |
| C7 | implemented; named proof passes |
| C8 | implemented; named proof passes |
| C9 | implemented; named proof passes |
| C10 | implemented; named proof passes |
| C11 | implemented; named proof passes |
| C12 | implemented; named proof passes |
| C13 | implemented; named proof passes |
| C14 | implemented; named proof passes |
