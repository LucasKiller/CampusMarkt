# Feature Design: 013-localization-launch-hardening

## 1. Architectural Context & Decisions

CampusMarkt operates as a modular monolith (AD-006) on a single budget VPS, using Next.js App Router for frontend and BFF orchestration, and self-hosted PostgreSQL / Supabase for persistence, auth, and realtime channels.

### Key Architecture Decisions
- **AD-006**: Self-hosted modular monolith on single budget VPS.
- **AD-007**: Identity, cookie-based session management, and server-side data boundary.
- **AD-018**: Bilingual localization (German & English) and launch hardening architected as lightweight server-driven typed dictionaries with cookie/header locale resolution paired with a monorepo launch hardening suite.
  - No invasive URL subpath prefixing (`/[locale]/...`), keeping permalinks stable.
  - Zero FOIC via SSR `<html lang="...">` and server-rendered dictionary strings.
  - Strict compile-time TypeScript type parity between `de` and `en` dictionaries.
  - Strict HTTP security headers in Next.js middleware (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
  - Automated disaster-recovery backup verification script and comprehensive launch runbooks.
  - German statutory legal compliance pages (`/impressum`, `/datenschutz`, `/agb`).

---

## 2. Localization Architecture

### 2.1 Package & Module Layout
Localization is architected as a clean domain & application module:
```text
packages/domain/src/localization/
├── types.ts                     # SupportedLocale ('de' | 'en'), Dictionary interface
├── dictionaries/
│   ├── de.ts                    # Full German translations
│   └── en.ts                    # Full English translations
├── resolve-locale.ts            # Sanitization, cookie & Accept-Language parser
├── get-dictionary.ts            # Typed dictionary getter
└── index.ts                     # Public domain exports

apps/web/src/modules/localization/
├── components/
│   ├── LanguageProvider.tsx     # Client context provider for dynamic client components
│   └── LanguageSwitcher.tsx     # Accessible toggle button in header & footer
├── hooks/
│   └── useTranslation.ts        # Client hook for localized strings
├── server/
│   └── get-server-locale.ts     # Server component helper (reading cookies & headers)
└── index.ts
```

### 2.2 Compile-Time Parity Enforcement
```typescript
// packages/domain/src/localization/types.ts
export type SupportedLocale = 'de' | 'en';

export interface Dictionary {
  common: {
    appName: string;
    tagline: string;
    loading: string;
    save: string;
    cancel: string;
    confirm: string;
    back: string;
    close: string;
    error: string;
    success: string;
  };
  nav: {
    browse: string;
    createListing: string;
    inbox: string;
    favorites: string;
    myListings: string;
    reservations: string;
    moderation: string;
    signIn: string;
    signOut: string;
    profile: string;
    language: string;
  };
  listings: {
    typeSell: string;
    typeGiveAway: string;
    typeWanted: string;
    statusActive: string;
    statusReserved: string;
    statusSold: string;
    statusArchived: string;
    free: string;
    locationBraunschweig: string;
    pickupOnly: string;
  };
  messaging: {
    title: string;
    typeMessagePlaceholder: string;
    send: string;
    emptyInbox: string;
  };
  negotiation: {
    makeOffer: string;
    acceptOffer: string;
    declineOffer: string;
    withdrawOffer: string;
    reserve: string;
    cancelReservation: string;
    markCompleted: string;
  };
  safety: {
    report: string;
    block: string;
    blockedUsers: string;
    unblock: string;
  };
  moderation: {
    queue: string;
    auditLog: string;
    dismiss: string;
    removeListing: string;
    suspendUser: string;
  };
  legal: {
    impressum: string;
    datenschutz: string;
    agb: string;
    allRightsReserved: string;
    bindingGermanNotice: string;
  };
}
```
Both `de.ts` and `en.ts` implement `Dictionary` identically. An automated test asserts `deepEqual(Object.keys(de), Object.keys(en))` recursively, failing the build if any translation key is missing or undefined.

### 2.3 Locale Resolution & Cookie Negotiation
```typescript
export function resolveLocale(cookieValue?: string | null, acceptLanguage?: string | null): SupportedLocale {
  if (cookieValue && /^(de|en)$/.test(cookieValue)) {
    return cookieValue as SupportedLocale;
  }
  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
    if (primary?.startsWith('en')) {
      return 'en';
    }
  }
  return 'de';
}
```

---

## 3. Statutory German Legal Disclosures

### 3.1 Impressum (`/impressum`)
Complies with § 5 DDG (Telemediengesetz / Digitale-Dienste-Gesetz):
- Operator identity: CampusMarkt Initiative / Projektgruppe Braunschweig.
- Postal address in Braunschweig, Germany.
- Direct contact: server-configured `PUBLIC_CONTACT_EMAIL` (current production example: `kontakt@campusmarkt.inovv.co`).
- Authorized representatives and university context.
- Haftungsausschluss (Liability for contents and external links).
- Urheberrecht (Copyright notice).

### 3.2 Datenschutzerklärung (`/datenschutz`)
Complies with DSGVO / GDPR (Regulation EU 2016/679):
- Data Controller identity & contact.
- Categories of processed data: accounts, listings, messages, offers.
- Pseudonymized University Verification (AD-008): HMAC-SHA-256 with pepper, immediate discarding of institutional email addresses, 180-day validity window.
- Legal bases: Art. 6(1)(b) DSGVO (contract fulfillment for marketplace transactions), Art. 6(1)(f) DSGVO (legitimate interest for anti-abuse and moderation).
- Retention & Deletion: immediate cascading deletion upon account closure.
- Zero third-party trackers, zero advertising cookies.
- Data subject rights: Art. 15 (Information), Art. 16 (Rectification), Art. 17 (Erasure), Art. 77 (Complaint to LfD Niedersachsen).

### 3.3 Allgemeine Geschäftsbedingungen (`/agb`)
- Scope: Free peer-to-peer classifieds for physical goods in the Braunschweig campus region.
- Transactions: in-person cash handover; no payment escrow, no platform custody of funds (AD-004, AD-015).
- Prohibited goods list: weapons, hazardous materials, illegal drugs, academic ghostwriting, counterfeit goods.
- Moderation & Takedowns: operator right to remove listings and suspend accounts violating community policy (AD-017).

---

## 4. Security Hardening & Middleware

### 4.1 Security Headers Configuration
In `apps/web/src/middleware.ts`:
```typescript
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
```
Middleware sets these headers on all responses, alongside `Vary: Cookie, Accept-Language` and `Content-Language: <locale>`.

---

## 5. Disaster Recovery, Runbooks & Accessibility

### 5.1 Automated Backup & Restore Verification Script
Located at `scripts/backup-verify.ts`:
- Executes `pg_dump` against test/development database schema.
- Restores the dump into an ephemeral schema or verifies parse validity and non-empty table definitions.
- Asserts checksums on key tables: `marketplace.listings`, `marketplace.profiles`, `marketplace.moderation_actions`.
- Exits 0 on verified recovery, non-zero on failure.

### 5.2 Operational Runbook (`docs/runbooks/launch-operations.md`)
1. **Host & VPS Capacity**: CPU/RAM thresholds, Docker health checks, daily log rotations.
2. **Automated Backup Strategy**: Daily `cron` snapshot to off-host volume, 14-day retention.
3. **Disaster Recovery (RTO < 1h, RPO < 24h)**: Step-by-step restoration from snapshot.
4. **Moderator Onboarding & Offboarding**: SQL scripts to grant/revoke moderator assignments in `marketplace.moderator_assignments`.
5. **Security Incident Escalation**: Compromise containment, session invalidation, user lockout.

### 5.3 Automated Accessibility Audit (WCAG 2.1 AA)
- Comprehensive automated accessibility assertions in unit and E2E suites:
  - Valid document `lang` attribute matching active locale.
  - Proper heading hierarchy (`h1` through `h3`).
  - Color contrast ratio $\ge 4.5:1$ for normal text, $\ge 3:1$ for large text.
  - Interactive elements have accessible names and focus indicators.
  - Forms have explicit `<label>` or `aria-label` bindings.
