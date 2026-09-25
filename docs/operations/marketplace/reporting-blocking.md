# Marketplace Reporting & Blocking Operations Runbook

This runbook defines operational guidance, system boundaries, confidentiality guarantees, telemetry, and incident response procedures for Feature 011: Reporting & Blocking ("Meldungen und Nutzer-Blockierung").

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 011 implements user-driven safety mechanisms, content reporting, and bidirectional user blocking for CampusMarkt V1:

- **Strict Reporter Confidentiality (AD-016)**:
  - Reports submitted via `marketplace_api.submit_report` are strictly confidential.
  - Reported targets have zero `SELECT` visibility on `marketplace.reports` across all API surfaces and PostgREST layers.
  - No notification, indicator, or telemetry exposes reporter identity to the target.
- **Bidirectional Mutual Exclusion (AD-016)**:
  - When User A blocks User B in `marketplace.user_blocks`, bidirectional exclusion applies:
    - User A cannot see User B's listings in public feed or search.
    - User B cannot see User A's listings in public feed or search.
    - Neither user can initiate conversations or send messages to the other (HTTP 403 `USER_BLOCKED`).
    - Neither user can submit offers or reservations to the other (HTTP 403 `USER_BLOCKED`).
  - Dual composite B-tree indexes (`(blocker_id, blocked_id)` and `(blocked_id, blocker_id)`) ensure high-performance anti-join filtering in database RPCs.
- **Self-Action Prevention**:
  - The database layer and application services reject self-reporting (`CANNOT_REPORT_SELF`) and self-blocking (`CANNOT_BLOCK_SELF`).
- **Duplicate Report Suppression**:
  - A unique partial index (`idx_one_pending_report_per_target`) prevents duplicate pending reports by the same reporter for the same target.
- **Abuse Controls & Rate Limiting**:
  - Users are limited to 10 safety actions (reports/blocks) per minute to prevent harassment or denial-of-service attempts.

---

## Preflight and Configuration Validation

Before deploying updates in production:

1. **Database Migrations & Tables**:
   - Verify `marketplace.reports` and `marketplace.user_blocks` exist with RLS enabled.
   - Verify indexes `idx_one_pending_report_per_target`, `idx_user_blocks_blocker`, and `idx_user_blocks_blocked`.
2. **RPC Function Grants**:
   - Ensure execute grants on `marketplace_api.submit_report`, `marketplace_api.block_user`, `marketplace_api.unblock_user`, and `marketplace_api.get_blocked_users` to `authenticated` and `service_role`.
3. **RPC Boundary Enforcement**:
   - Verify feed, search, messaging, and negotiation RPCs include active block anti-joins.

---

## Operational Verification

To verify that the safety repository, application service, API routes, and components pass all quality gates:

```bash
npm run check
npm run test:integration
```

To run the Playwright end-to-end reporting and blocking journeys:

```bash
npx playwright test apps/web/tests/marketplace-reporting-blocking.spec.ts --config apps/web/playwright.config.mjs
```

---

## Incident Response & Recovery

### 1. Blocked User Interaction Attempt (HTTP 403)
- **Symptom**: User receives HTTP 403 with code `USER_BLOCKED` when messaging or creating an offer.
- **Cause**: An active block exists between the caller and the target user (in either direction).
- **Action**: Expected behavior under mutual blocking. If the user wishes to resume contact, the blocking party must unblock the other party via `/account/blocked-users`.

### 2. Duplicate Report Submission (HTTP 409)
- **Symptom**: User receives HTTP 409 `REPORT_ALREADY_PENDING`.
- **Cause**: The reporter already has an unresolved pending report for this target.
- **Action**: Expected behavior to avoid spamming the moderation queue. The UI displays an appropriate message indicating the report is already under review.

### 3. Investigation of Reported Content
- **Diagnostic Query**:
  ```sql
  select id, target_type, target_id, reason, details, status, created_at
    from marketplace.reports
   where status = 'pending'
   order by created_at asc
   limit 50;
  ```
- **Confidentiality Reminder**: Never disclose reporter identity during moderation or dispute resolution.
