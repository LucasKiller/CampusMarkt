# Context: 013-localization-launch-hardening

## Background and Purpose

CampusMarkt V1 is a responsive, local-first marketplace for physical goods in Braunschweig, Germany. To support a safe, compliant, and welcoming private beta rollout at TU Braunschweig (Horizon 5 / Horizon 6), the marketplace must serve both German-speaking local students and international English-speaking students while meeting all regulatory and operational hardening baselines.

Prior features (001 through 012) established the complete goods lifecycle, discovery, text search, private favorites, negotiations, reservations, 1:1 messaging, in-person pickup completion, reporting & blocking, and administrative moderation. Feature 013 provides the final layer of release readiness:
1. **Bilingual Localization (German & English)**: Complete coverage of all public, authenticated, and administrative UI journeys in both languages, with compile-time type parity, server-rendered `<html lang="...">`, zero Flash of Unlocalized Content (FOIC), and clean canonical URLs.
2. **Statutory Legal Compliance**: German Telecommunications-Telemedia Data Protection Act (§ 5 DDG Impressum), GDPR / DSGVO privacy policy (`/datenschutz`), and marketplace terms of service (`/agb`).
3. **Security Hardening**: Strict Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` applied via Next.js middleware.
4. **Operational Readiness & Disaster Recovery**: Verified automated backup and restore script (`scripts/backup-verify.sh`), operational runbooks covering incidents, database health, and moderator workflows, and WCAG 2.1 AA accessibility audit verification.

## In-Scope Capabilities

- **Bilingual Dictionaries**: Strongly typed dictionary system for `de` and `en` covering navigation, auth, listings, discovery, search, messaging, negotiations, pickup completion, safety, moderation, and legal disclaimers.
- **Locale Resolution**: Server-side locale detection via `NEXT_LOCALE` cookie, defaulting to English (`en`) when no valid cookie exists, attaching `Vary: Cookie` and `Content-Language` headers (AD-020).
- **Interactive Language Switcher**: Persistent language switcher component in navigation/header with immediate cookie update and page refresh without URL route perturbation.
- **Legal Disclosure Pages**: Accessible server-rendered routes for `/impressum`, `/datenschutz`, and `/agb` with clear regulatory disclosures.
- **Security Headers Middleware**: Next.js HTTP response headers enforcement.
- **Automated Backup & Restore Verification**: Testable disaster-recovery verification script testing database dump and restore integrity.
- **Accessibility & Quality Baselines**: WCAG 2.1 AA compliance test suite (contrast, screen-reader landmarks, aria labels, document language).
- **Comprehensive E2E Journeys**: Playwright tests verifying full customer journeys in both German and English.

## Out-of-Scope (Deferred beyond V1)

- Multi-city expansion beyond Braunschweig.
- Additional languages beyond German and English (e.g. French, Spanish).
- Automated AI translation of user-generated listing titles/descriptions.
- In-app payment escrow, shipping, or PWA-specific service workers.

## Architectural References

- `docs/product/00-product-vision.md`
- `docs/product/01-domain-model.md`
- `docs/product/02-mvp-scope.md`
- `docs/product/03-marketplace-policy.md`
- `docs/product/04-roadmap.md` (§ Horizon 5 & 6)
- `.specs/STATE.md` (AD-006, AD-007, AD-018)
