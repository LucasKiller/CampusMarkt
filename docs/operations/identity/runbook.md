# Identity and Accounts Operations Runbook

This runbook defines operational guidance, preflight boundaries, background worker management, and incident recovery procedures for Feature 002: Identity and Accounts.

> [!IMPORTANT]
> This documentation defines a deployable contract; it does not authorize deployment or account actions. No VPS deployment, database migration, worker scheduling, or user account modification may occur without separate, explicit user authorization.

---

## Launch Blockers

The following launch blockers must be formally cleared before releasing identity capabilities to production users:

1. **Legal Review Blocker**:
   - The self-declared 18+ adult age confirmation (`adultDeclared: true`) without date-of-birth collection is an MVP risk mitigation.
   - Formal legal review must confirm this self-declaration model complies with applicable German (BGB, JuSchG) and European contract and consumer protection legislation before public launch.
   - Terms of Service (`CURRENT_TERMS_VERSION`) and Privacy Policy (`CURRENT_PRIVACY_VERSION`) must be legally vetted and active.

2. **Future Feature Deletion-Participant Blocker**:
   - Feature 002 implements the core identity deletion lifecycle: immediate depublication and session revocation, followed by a 30-day asynchronous purge.
   - Every subsequent data-owning feature (listings, offers, transactions, messaging, reviews, university verifications) must implement a deletion-participant hook before deploying to production so that user-owned data is purged or anonymized consistently within the 30-day legal boundary.

---

## Preflight and Configuration Validation

Before starting or promoting an identity release in production, operators must execute the automated preflight check:

```console
$ npm run preflight
```

### Preflight Verification Boundaries

The preflight script verifies that:
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY` and `IDENTITY_HASH_PEPPER` are at least 32 characters long and contain no placeholder patterns (such as `change-me`, `replace`, etc.).
- **Origins**: `IDENTITY_ACTION_BASE_URL` uses `https://` in production and strictly matches `SITE_URL` origin to prevent cross-origin action-token leaks.
- **Session Timebox**: `GOTRUE_SESSIONS_TIMEBOX` is strictly bounded between `1h` and `720h` (maximum 30 days) to enforce absolute session expiration.
- **Worker Configuration**: `IDENTITY_WORKER_BATCH_SIZE` is bounded between `1` and `100`, and `IDENTITY_WORKER_ID` contains only alphanumeric characters, dashes, and underscores.
- **Redaction**: Preflight failure messages report variable names and error codes only; secret values, hashes, and passwords are never printed.

---

## Background Worker Management

The identity worker handles asynchronous maintenance and lifecycle jobs:
- **Avatar Cleanup Queue**: Purges superseded avatar versions and removes orphaned avatar files from Storage within 24 hours.
- **Deletion Purge Queue**: Permanently deletes Auth identities, profiles, consents, and avatar objects for accounts that have reached their 30-day purge deadline.
- **Maintenance Pruning**: Cleans expired action tokens (24h for confirmation, 30m for recovery), stale rate-limit buckets, and expired session assurance records (>10m).
- **Projection Reconciliation**: Idempotently synchronizes Supabase Auth confirmation states with the application identity projection.

### Manual Worker Execution

To trigger a single execution pass of the identity cleanup worker:

```console
$ npm run identity:worker
```

Or run via Docker Compose in the target environment:

```console
$ docker compose run --rm --no-deps identity-worker
```

### Worker Health and Monitoring

Check the status of the identity worker service and related containers:

```console
$ docker compose ps
```

- Worker execution claims jobs using leased locks with bounded durations.
- If a worker process terminates unexpectedly, outstanding leases automatically expire, allowing subsequent worker iterations to reclaim and process pending jobs safely.

---

## Incident Response & Recovery

### 1. Supabase Auth Outage
- **Symptom**: HTTP 503 `DEPENDENCY_UNAVAILABLE` on sign-in, session resolution, or reauthentication.
- **Impact**: Authenticated user actions are paused; public browsing remains available.
- **Action**: Verify Auth container health. Once Auth recovers, existing sessions remain valid until their absolute timebox.

### 2. SMTP Mail Outage
- **Symptom**: Registration and recovery requests return HTTP 503 or fail email delivery.
- **Impact**: Users cannot receive confirmation or password reset links.
- **Action**: Check SMTP relay credentials and TLS port. Once restored, users can request new tokens via the confirmation resend and password reset pages; expired or undelivered tokens do not create false account states.

### 3. Storage / Media Outage
- **Symptom**: Avatar uploads fail; avatar images return 404 or fail to load.
- **Impact**: UI automatically falls back to deterministic user initials without broken image icons.
- **Action**: Check Storage container and S3 connectivity. Profile data remains safe and functional.
