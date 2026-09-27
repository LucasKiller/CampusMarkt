# 016 Neighborhood identity tasks

## Test Coverage Matrix

> Generated from `AGENTS.md`, `package.json`, and `apps/web/tests/marketplace-visual-system.spec.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Home/card UI | e2e | Every acceptance criterion and listed edge case | `apps/web/tests/*.spec.ts` | `npx playwright test neighborhood-identity.spec.ts --config apps/web/playwright.config.mjs` |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| full | `npx playwright test neighborhood-identity.spec.ts --config apps/web/playwright.config.mjs && npm run typecheck && npm run lint` |
| build | `npx playwright test neighborhood-identity.spec.ts marketplace-visual-system.spec.ts --config apps/web/playwright.config.mjs && npm run check` |

## Execution Plan

### Phase 1: Discovery identity

```
T1 → T2
```

## Task Breakdown

### T1: Apply the approved home identity

**What**: Build the item-led home composition with local copy and honest image fallback.
**Where**: `apps/web/src/app/page.tsx`
**Depends on**: None
**Reuses**: `apps/web/src/components/marketplace/marketplace-header.tsx` and current feed data
**Requirement**: VIS-01

**Done when**:

- [x] Desktop has the approved headline, search, and item collage.
- [x] At 390px, search is in the first viewport and there is no page overflow.
- [x] Missing item photos produce textual tiles; an empty feed uses generic marketplace tiles.
- [x] New home copy follows English and German locale.

**Tests**: e2e
**Gate**: full
**Status**: complete

### T2: Polish shared discovery cards and motion

**What**: Make cards on home and search match the approved restrained visual and motion language.
**Where**: `apps/web/src/components/marketplace/feed.tsx`
**Depends on**: T1
**Reuses**: `apps/web/src/components/marketplace/favorites/favorite-button.tsx`
**Requirement**: VIS-02

**Done when**:

- [ ] Home and search preserve the square media, decision information, and honest no-photo card.
- [ ] Hover only scales media within 220ms; reduced motion suppresses card and favorite transforms.
- [ ] Keyboard focus is visible on the card link and favorite button.

**Tests**: e2e
**Gate**: build
**Status**: pending
