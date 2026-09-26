# University Verification Operations Runbook

This runbook defines operational guidance, policy boundaries, institutional domain maintenance, and incident recovery procedures for Feature 003: University Verification.

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize external deployment or database changes. No VPS deployment, database migration, or direct user data modification may occur without separate, explicit user authorization.

---

## Policy & Security Boundaries

1. **Supported Institutions**:
   - Initial supported university: **TU Braunschweig** (`tu-braunschweig.de`, `tu-bs.de`).
   - Domain matching is case-insensitive, normalized, and strictly allowlisted in `@campusmarkt/validation` and `@campusmarkt/domain`.

2. **Data Minimization & Privacy**:
   - Institutional email addresses are discarded immediately after confirmation.
   - The database stores only the pseudonymous HMAC-SHA-256 fingerprint generated with `IDENTITY_HASH_PEPPER`.
   - Plaintext institutional emails and verification tokens are never logged, never returned in API payloads, and never exposed on public profiles.

3. **Validity & Token Lifecycle**:
   - **Verification Validity**: Exactly 12 calendar months from the confirmation timestamp.
   - **Verification Token Expiration**: Exactly 24 hours from initiation. Tokens are single-use and invalidated immediately upon confirmation.
   - **Query-Time Expiration Check**: Public profiles evaluate verification validity dynamically (`status = 'verified' AND expires_at > transaction_timestamp()`). Expired verifications are automatically omitted from public badges without background worker lag.

4. **1:1 Uniqueness & Abuse Prevention**:
   - Each institutional email can be linked to at most one active account at any time.
   - Rate limits enforce a maximum of 3 initiation attempts per account per hour and 30 per IP per hour.
   - Bounded 503 response returned on SMTP delivery failure without creating orphan verified states.

---

## Preflight and Configuration Validation

Operators must ensure required environment variables are set and validated prior to deployment:

```console
$ npm run preflight
```

### Required Configuration

- `IDENTITY_HASH_PEPPER`: Secret pepper for HMAC-SHA-256 email hashing (must be at least 32 characters, non-placeholder).
- `IDENTITY_ACTION_BASE_URL`: Base URL for verification action links, matching `SITE_URL` in production.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: SMTP credentials for verification link delivery.

---

## Domain Maintenance Procedure

To update or expand supported institutional domains:

1. Update the domain policy allowlist in `packages/domain/src/identity/university.ts`.
2. Update the domain validation regex and lookup map in `packages/validation/src/identity/university/index.ts`.
3. Update transport DTO badge types in `packages/types/src/identity/university.ts`.
4. Run the regression test suite to ensure all architectural boundary checks pass:

```console
$ npm run check
```

---

## Incident Response & Recovery

### 1. SMTP Delivery Failure
- **Symptom**: Initiation returns HTTP 503 `DEPENDENCY_UNAVAILABLE`.
- **Impact**: Verification email is not sent; no verified state is created.
- **Action**: Check SMTP relay connectivity and credentials. Users can retry once SMTP connectivity is restored.

### 2. Institutional Email Collision (409 Conflict)
- **Symptom**: User receives HTTP 409 `CONFLICT` when initiating verification.
- **Root Cause**: The institutional email hash is already actively linked to another account.
- **Action**: Explain 1:1 policy to user. If previous account was deleted, ensure deletion purge has completed to release the institutional email hash.

### 3. Verification Expiry
- **Symptom**: Trust badge disappears from the public profile after 12 calendar months.
- **Action**: Normal behavior. The user can initiate reverification in Account Settings to renew the badge for another 12 calendar months.
