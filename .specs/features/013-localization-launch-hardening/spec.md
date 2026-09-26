# Localization & Launch Hardening Specification

**Status:** Verified

## Problem Statement

To launch a secure, legally compliant, and welcoming private beta in Braunschweig (Horizon 5 / Horizon 6), CampusMarkt must serve both German-speaking local students and international English-speaking students. Without bilingual UI support, statutory German legal disclosure pages (§ 5 DDG Impressum, DSGVO/GDPR Datenschutzerklärung, AGB), HTTP security header enforcement, automated disaster-recovery backup verification, and accessibility baselines, the platform faces regulatory vulnerability, international student exclusion, security risks, and operational fragility.

## Goals

- [x] Provide 100% bilingual UI dictionary coverage for German (`de`) and English (`en`) across all core marketplace journeys.
- [x] Enforce compile-time TypeScript type parity to guarantee zero missing, undefined, or empty keys across languages.
- [x] Implement server-side locale detection via sanitized `NEXT_LOCALE` cookie and `Accept-Language` header, defaulting to German (`de`).
- [x] Eliminate Flash of Unlocalized Content (FOIC) and hydration mismatch by server-rendering `<html lang="...">` and matching strings.
- [x] Provide an accessible language switcher component in navigation/header with immediate cookie update and zero URL perturbation.
- [x] Deliver compliant German statutory disclosure pages: `/impressum` (§ 5 DDG), `/datenschutz` (DSGVO/GDPR), and `/agb` (Marketplace terms).
- [x] Enforce HTTP security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`).
- [x] Provide and verify an automated disaster-recovery backup/restore script (`scripts/backup-verify.sh`).
- [x] Document and verify operational launch runbooks (`docs/runbooks/launch-operations.md`).
- [x] Assert WCAG 2.1 AA automated accessibility compliance across all core customer journeys.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Languages beyond German and English (e.g. Spanish, French) | CampusMarkt V1 focuses exclusively on the TU Braunschweig campus community where DE and EN cover >98% of students. |
| Automated AI translation of user-generated listing descriptions | User-generated content is displayed in its author-written text; automatic AI machine translation is deferred. |
| URL subpath explosion (`/[locale]/...`) | Decided by The Jury (AD-018): preserves clean canonical permalinks and prevents route rewriting regressions. |
| In-app payment escrow, shipping, or PWA-specific service workers | Deferred beyond V1 per Roadmap and AGENTS.md boundaries. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Locale architecture | Lightweight server-driven typed dictionaries (AD-018) | Unanimous Jury decision: compile-time safety, zero route disruption, zero FOIC, fits single VPS (AD-006). | yes |
| Default language | German (`de`) | CampusMarkt is hosted and operated in Braunschweig, Germany; German is the official administrative language. | yes |
| Cookie sanitization | Strict regex `/^(de|en)$/` | Prevents header injection, cookie tampering, or cache poisoning attacks. | yes |
| Legal bindingness | German statutory text is primary | English translations include explicit disclaimer referencing German statutory text as legally binding under German law. | yes |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Locale strings must strictly match `de` or `en`; any malformed or unrecognized value safely defaults to `de`. |
| Failure / partial-failure states | Missing or corrupted cookie defaults to `Accept-Language` or `de`; server rendering never crashes on missing keys due to compile-time dictionary parity. |
| Idempotency / retry handling | Setting the locale cookie is idempotent; multiple toggles write the same cookie value cleanly. |
| Auth boundaries & rate limits | Locale resolution applies to all visitors (public, authenticated, and moderators); security headers protect all endpoints. |
| Concurrency / ordering | Locale cookies are read-only per request; switching triggers immediate client-side reload or re-render. |
| Data lifecycle & cascades | No database migrations required for localization; user preference is persisted in client cookie `NEXT_LOCALE`. |
| Observability | Structured logging for uncaught security header violations; CSP report-only or blocking mode configurations. |
| Privacy boundary | Legal pages explicitly document HMAC identity hashing (AD-019), twelve-calendar-month verification expiry, and zero primary email exposure. |

---

## User Stories

### P1: Bilingual Core Navigation & Dictionary Parity ⭐ MVP

As a student browsing CampusMarkt (either German-speaking or international),  
I want the entire marketplace interface rendered in my preferred language (German or English),  
So that I can comfortably search, read, negotiate, and transact without language barriers.

#### Acceptance Criteria

- **WHEN** a user visits any page with `NEXT_LOCALE=de` or with an `Accept-Language: de` header,  
  **THEN** the system server-renders the document with `<html lang="de">` and German interface strings across navigation, cards, and buttons.
- **WHEN** a user visits any page with `NEXT_LOCALE=en` or with an `Accept-Language: en` header,  
  **THEN** the system server-renders the document with `<html lang="en">` and English interface strings across navigation, cards, and buttons.
- **WHEN** the user has not set an explicit locale cookie and no English preference is present in `Accept-Language`,  
  **THEN** the system defaults to German (`de`).
- **WHEN** executing unit and architectural tests,  
  **THEN** the test suite asserts 100% key parity between the German and English translation dictionaries with zero missing, undefined, or empty keys.

---

### P1: Interactive Language Switching & Locale Persistence ⭐ MVP

As a user,  
I want to toggle my language preference from any page header or footer,  
So that my preference is immediately applied, persisted in a secure cookie, and preserved across page navigations.

#### Acceptance Criteria

- **WHEN** the user selects the alternate language in the language switcher component,  
  **THEN** the system sets the `NEXT_LOCALE` cookie with `SameSite=Lax`, `Path=/`, `Max-Age=31536000` (1 year), and updates the page state without altering the canonical URL path.
- **WHEN** the locale is switched,  
  **THEN** the system renders the translated page with zero Flash of Unlocalized Content (FOIC) and zero hydration mismatch warnings.
- **WHEN** a client submits a malformed or unsupported locale code (e.g. `fr` or `<script>`),  
  **THEN** the system sanitizes the input, rejects the unsupported value, and resolves safely to default German (`de`).

---

### P1: Statutory German Legal Disclosures ⭐ MVP

As a marketplace participant or regulatory authority,  
I want clear, easily accessible German statutory legal information,  
So that CampusMarkt satisfies § 5 DDG (Impressum), DSGVO (Datenschutzerklärung), and consumer protection marketplace rules.

#### Acceptance Criteria

- **WHEN** a visitor navigates to `/impressum`,  
  **THEN** the system displays the operator identity, contact email, university affiliation context, and legal liability disclaimers according to § 5 DDG.
- **WHEN** a visitor navigates to `/datenschutz`,  
  **THEN** the system displays the GDPR/DSGVO privacy policy detailing data controller details, legal bases (Art. 6 GDPR), retention policies, HMAC university email hashing practices (AD-008), and data subject rights.
- **WHEN** a visitor navigates to `/agb`,  
  **THEN** the system displays the marketplace terms of service clarifying peer-to-peer in-person pickup conditions, non-escrow payment boundaries, prohibited items, and moderation policies.
- **WHEN** the user views legal pages in English,  
  **THEN** the system provides full English translations with an explicit note referencing the German statutory texts as legally binding.

---

### P1: Security Headers & Production Hardening ⭐ MVP

As a platform security engineer and user,  
I want HTTP security headers enforced across all responses,  
So that the marketplace is protected against clickjacking, MIME sniffing, and cross-site scripting attacks.

#### Acceptance Criteria

- **WHEN** any HTTP request is processed by the application middleware,  
  **THEN** the system attaches strict security headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **WHEN** rendering cacheable or authenticated responses,  
  **THEN** the system attaches `Vary: Cookie, Accept-Language` and `Content-Language: <locale>` to prevent reverse-proxy cache poisoning.
- **WHEN** running security automated test suites,  
  **THEN** the system verifies that all static assets and API routes return the required security headers.

---

### P1: Disaster Recovery & Operational Readiness Runbook ⭐ MVP

As a DevOps engineer and marketplace administrator,  
I want verified database backup and restore scripts and comprehensive launch runbooks,  
So that the platform can recover from VPS hardware failures and manage beta incidents reliably.

#### Acceptance Criteria

- **WHEN** the automated backup verification script (`scripts/backup-verify.sh` / `scripts/backup-verify.ts`) is executed,  
  **THEN** the system creates a valid PostgreSQL dump, tests restore into an ephemeral database target, and verifies row count and schema integrity.
- **WHEN** the WCAG 2.1 AA automated accessibility audit is executed across core journeys (feed, listing detail, messaging, offers, and legal pages),  
  **THEN** the system verifies zero critical accessibility violations (proper landmark roles, accessible form labels, sufficient color contrast, and document language declaration).
- **WHEN** platform operators need guidance on incident response, backup schedules, or moderator assignments,  
  **THEN** the system documentation provides a complete, verified operational runbook in `docs/runbooks/launch-operations.md`.

---

## Requirement Traceability

| Requirement ID | Description | Acceptance Criteria | Target Layer | Status |
| --- | --- | --- | --- | --- |
| LOC-01 | Bilingual Core Navigation & Dictionary Parity | P1 Story 1: AC1, AC2, AC3, AC4 | Domain / Dictionaries / SSR | verified |
| LOC-02 | Interactive Language Switching & Locale Persistence | P1 Story 2: AC1, AC2, AC3 | UI Components / Middleware | verified |
| LOC-03 | Statutory German Legal Disclosures | P1 Story 3: AC1, AC2, AC3, AC4 | UI Pages / Legal Compliance | verified |
| LOC-04 | Security Headers & Production Hardening | P1 Story 4: AC1, AC2, AC3 | Next.js Middleware / Security | verified |
| LOC-05 | Disaster Recovery & Operational Readiness Runbook | P1 Story 5: AC1, AC2, AC3 | DevOps / Scripts / Runbooks | verified |
