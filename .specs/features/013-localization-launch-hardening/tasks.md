# Tasks: Feature 013-localization-launch-hardening

## Test Coverage Matrix

| Requirement | Acceptance Criteria | Test File | Test Type |
| --- | --- | --- | --- |
| LOC-01 | P1 Story 1: AC1, AC2, AC3, AC4 | `packages/domain/src/localization/parity.test.ts`<br>`tests/architecture/localization-boundary.test.ts`<br>`apps/web/tests/marketplace-localization-hardening.spec.ts` | Unit / Architecture / E2E |
| LOC-02 | P1 Story 2: AC1, AC2, AC3 | `packages/domain/src/localization/resolve-locale.test.ts`<br>`tests/integration/localization/locale-routes.test.ts`<br>`apps/web/tests/marketplace-localization-hardening.spec.ts` | Unit / Integration / E2E |
| LOC-03 | P1 Story 3: AC1, AC2, AC3, AC4 | `tests/integration/localization/legal-pages.test.ts`<br>`apps/web/tests/marketplace-localization-hardening.spec.ts` | Integration / E2E |
| LOC-04 | P1 Story 4: AC1, AC2, AC3 | `tests/integration/hardening/security-headers.test.ts`<br>`apps/web/tests/marketplace-localization-hardening.spec.ts` | Integration / E2E |
| LOC-05 | P1 Story 5: AC1, AC2, AC3 | `scripts/backup-verify.test.ts`<br>`tests/integration/hardening/accessibility-audit.test.ts`<br>`apps/web/tests/marketplace-localization-hardening.spec.ts` | Unit / Integration / E2E |

---

## Gate Check Commands

- **Quick gate**: `cmd.exe /c "npm run check"`
- **Integration gate**: `cmd.exe /c "npm run check && npm run test:integration"`
- **Full gate**: `cmd.exe /c "npm run check && npm run test:integration && npx playwright test apps/web/tests/marketplace-localization-hardening.spec.ts --config apps/web/playwright.config.mjs"`

---

## Execution Plan

### Phase 1: Contracts and Domain Foundation
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Security Middleware, Headers & Infrastructure Hardening
```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Server Services and Localization Context
```text
T9 -> T10 -> T11 -> T12
```

### Phase 4: UI Components, Legal Pages and E2E Journeys
```text
T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### Phase 1: Contracts and Domain Foundation

#### T1: Define supported locales and dictionary schema types
**What**: Define `SupportedLocale`, `DictionaryNamespace`, `Dictionary` interfaces, and type predicates.
**Where**: `packages/domain/src/localization/types.ts`
**Depends on**: None
**Requirement**: LOC-01, LOC-02
**Done when**:
- [ ] `SupportedLocale` union (`'de' | 'en'`) and `Dictionary` interfaces declared.
- [ ] Type predicate `isSupportedLocale(value: unknown): value is SupportedLocale` implemented.
- [ ] Exported from `packages/domain`.
- [ ] Unit tests pass in `packages/domain/src/localization/types.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(localization): define supported locales and dictionary schema types`

#### T2: Implement german and english typed dictionaries with parity test
**What**: Provide complete German (`de.ts`) and English (`en.ts`) dictionaries implementing `Dictionary`, with a deep recursive test asserting 100% key parity.
**Where**: `packages/domain/src/localization/dictionaries/index.ts`
**Depends on**: T1
**Requirement**: LOC-01
**Done when**:
- [ ] `de.ts` and `en.ts` dictionaries implemented covering common, nav, listings, messaging, negotiation, safety, moderation, and legal keys.
- [ ] `parity.test.ts` validates zero missing keys between `de` and `en`.
- [ ] Zero undefined or empty values.
- [ ] Unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(localization): implement german and english typed dictionaries with parity test`

#### T3: Implement locale resolution and cookie sanitizer
**What**: Implement `resolveLocale` parsing `NEXT_LOCALE` cookie and `Accept-Language` header, enforcing strict regex `/^(de|en)$/` sanitization and safe fallback to `'de'`.
**Where**: `packages/domain/src/localization/resolve-locale.ts`
**Depends on**: T2
**Requirement**: LOC-01, LOC-02
**Done when**:
- [ ] `resolveLocale(cookie, acceptLanguage)` handles valid, malformed, empty, and wildcard inputs cleanly.
- [ ] `getDictionary(locale)` returns the corresponding typed dictionary.
- [ ] Unit tests in `resolve-locale.test.ts` verify all edge cases.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(localization): implement locale resolution and cookie sanitizer`

#### T4: Add architectural boundary tests for localization module
**What**: Add architectural tests preventing unauthorized dependencies, circular references, or client-side leakage.
**Where**: `tests/architecture/localization-boundary.test.ts`
**Depends on**: T3
**Requirement**: LOC-01, LOC-04
**Done when**:
- [ ] Architecture tests assert `@campusmarkt/domain` localization does not import browser or Next.js globals.
- [ ] Architecture tests verify dictionary files export pure plain data objects.
- [ ] Architecture gate passes.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(localization): add architectural boundary tests for localization module`

---

### Phase 2: Security Middleware, Headers & Infrastructure Hardening

#### T5: Implement security headers and vary headers middleware
**What**: Enforce strict Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and Vary headers in Next.js middleware.
**Where**: `apps/web/src/middleware.ts`
**Depends on**: T4
**Requirement**: LOC-04
**Done when**:
- [ ] Middleware sets all required security headers on all responses.
- [ ] `Vary: Cookie, Accept-Language` and `Content-Language` attached to responses.
- [ ] Integration tests in `tests/integration/hardening/security-headers.test.ts` verify header presence on routes.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(hardening): implement security headers and vary headers middleware`

#### T6: Implement automated database backup and restore verification script
**What**: Create automated disaster-recovery backup verification script that dumps the database schema and asserts restore validity and row checksums.
**Where**: `scripts/backup-verify.ts`
**Depends on**: T5
**Requirement**: LOC-05
**Done when**:
- [ ] Script executes schema verification, table presence checks, and row count sanity tests.
- [ ] Handles missing environment variables and error states gracefully.
- [ ] Unit and execution tests pass in `scripts/backup-verify.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(hardening): implement automated database backup and restore verification script`

#### T7: Document launch operational runbooks and disaster recovery
**What**: Document operational runbook covering VPS capacity, backup strategy, disaster recovery RTO/RPO, moderator lifecycle, and incident triage.
**Where**: `docs/runbooks/launch-operations.md`
**Depends on**: T6
**Requirement**: LOC-05
**Done when**:
- [ ] Runbook documents daily backup routines, restore steps, and RTO/RPO targets.
- [ ] Incident response escalation tree and moderator onboarding steps documented.
- [ ] Markdown validation passes.
**Tests**: docs
**Gate**: Quick
**Commit**: `docs(hardening): document launch operational runbooks and disaster recovery`

#### T8: Add automated wcag 2.1 aa accessibility audit tests
**What**: Implement automated accessibility audit testing color contrast, document language attributes, heading hierarchy, and ARIA labels.
**Where**: `tests/integration/hardening/accessibility-audit.test.ts`
**Depends on**: T7
**Requirement**: LOC-05
**Done when**:
- [ ] Automated accessibility assertions check root layout language and interactive element labeling.
- [ ] Tests assert 0 critical accessibility violations across core surfaces.
- [ ] Integration tests pass.
**Tests**: integration
**Gate**: Integration
**Commit**: `test(hardening): add automated wcag 2.1 aa accessibility audit tests`

---

### Phase 3: Server Services and Localization Context

#### T9: Implement server locale extractor and dictionary loader
**What**: Implement server-side helper reading cookies and headers to provide active locale and dictionary to Server Components.
**Where**: `apps/web/src/modules/localization/server/get-server-locale.ts`
**Depends on**: T8
**Requirement**: LOC-01, LOC-02
**Done when**:
- [ ] `getServerLocale()` and `getServerDictionary()` helpers implemented.
- [ ] Uses Next.js `cookies()` and `headers()`.
- [ ] Unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(localization): implement server locale extractor and dictionary loader`

#### T10: Implement locale toggle api route handler
**What**: Implement `POST /api/localization/locale` to set the `NEXT_LOCALE` cookie with strict validation, `SameSite=Lax`, and 1-year max-age.
**Where**: `apps/web/src/app/api/localization/locale/route.ts`
**Depends on**: T9
**Requirement**: LOC-02
**Done when**:
- [ ] Validates locale payload against `isSupportedLocale`.
- [ ] Sets `NEXT_LOCALE` cookie with `SameSite=Lax`, `Path=/`, and returns JSON confirmation.
- [ ] Rejects invalid locale codes with HTTP 400.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(localization): implement locale toggle api route handler`

#### T11: Implement client language provider and translation hook
**What**: Create React Context provider and `useTranslation()` hook for client components, ensuring seamless hydration without FOIC.
**Where**: `apps/web/src/modules/localization/components/LanguageProvider.tsx`
**Depends on**: T10
**Requirement**: LOC-01, LOC-02
**Done when**:
- [ ] `LanguageProvider` wraps client component tree with initial server-provided locale.
- [ ] `useTranslation()` returns active locale, dictionary, and `setLocale` callback.
- [ ] Component tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(localization): implement client language provider and translation hook`

#### T12: Add integration tests for locale resolution and toggle api
**What**: Add integration test suite for locale resolution, cookie setting, and dictionary retrieval across route handlers.
**Where**: `tests/integration/localization/locale-routes.test.ts`
**Depends on**: T11
**Requirement**: LOC-01, LOC-02
**Done when**:
- [ ] Integration tests verify `POST /api/localization/locale` sets cookie correctly.
- [ ] Tests verify malformed locales return 400.
- [ ] Integration suite passes.
**Tests**: integration
**Gate**: Integration
**Commit**: `test(localization): add integration tests for locale resolution and toggle api`

---

### Phase 4: UI Components, Legal Pages and E2E Journeys

#### T13: Implement interactive language switcher component
**What**: Build accessible language switcher component with German/English toggle button and seamless state transition.
**Where**: `apps/web/src/modules/localization/components/LanguageSwitcher.tsx`
**Depends on**: T12
**Requirement**: LOC-02
**Done when**:
- [ ] Switcher rendered in main navigation header and mobile navigation drawer.
- [ ] Displays active language and allows toggling with single click.
- [ ] Accessible `aria-label` provided in active language.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(localization): implement interactive language switcher component`

#### T14: Implement statutory german impressum and datenschutz pages
**What**: Create accessible, server-rendered legal disclosure routes `/impressum` (§ 5 DDG) and `/datenschutz` (DSGVO/GDPR) with German and English translations.
**Where**: `apps/web/src/app/impressum/page.tsx`
**Depends on**: T13
**Requirement**: LOC-03
**Done when**:
- [ ] `/impressum` renders required operator identity, address, contact, and disclaimers.
- [ ] `/datenschutz` details GDPR data processing, HMAC hash privacy, and user rights.
- [ ] English view displays translated text with binding German statutory notice.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(legal): implement statutory german impressum and datenschutz pages`

#### T15: Implement marketplace agb terms of service page
**What**: Create server-rendered `/agb` terms of service page clarifying peer-to-peer pickup rules, non-escrow payment model, and moderation takedown rights.
**Where**: `apps/web/src/app/agb/page.tsx`
**Depends on**: T14
**Requirement**: LOC-03
**Done when**:
- [ ] Terms page documents peer-to-peer physical goods rules, prohibited items, and moderation authority.
- [ ] Footer links to `/impressum`, `/datenschutz`, and `/agb` updated and accessible.
- [ ] Integration tests pass in `tests/integration/localization/legal-pages.test.ts`.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(legal): implement marketplace agb terms of service page`

#### T16: Prove e2e bilingual journeys and launch hardening verification
**What**: Write comprehensive Playwright E2E journeys testing bilingual language switching, legal pages navigation, and launch hardening verification.
**Where**: `apps/web/tests/marketplace-localization-hardening.spec.ts`
**Depends on**: T15
**Requirement**: LOC-01, LOC-02, LOC-03, LOC-04, LOC-05
**Done when**:
- [ ] E2E tests verify language toggle switches navigation and feed strings immediately.
- [ ] E2E tests verify `/impressum`, `/datenschutz`, and `/agb` render correctly in both languages.
- [ ] E2E tests verify security headers are present on loaded pages.
- [ ] All E2E journeys pass.
**Tests**: e2e
**Gate**: Full
**Commit**: `test(launch): prove e2e bilingual journeys and launch hardening verification`
