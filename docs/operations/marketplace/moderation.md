# Marketplace Moderation Operations Runbook

This runbook defines operational guidance, system boundaries, Role-Based Access Control (RBAC) governance, non-repudiation guarantees, and incident response procedures for Feature 012: Marketplace Moderation ("Marktplatz-Moderation und Prüfwarteschlange").

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 012 implements database-enforced moderation, privileged action orchestration, cascading removals, and an immutable audit trail for CampusMarkt V1:

- **Database-Enforced Role-Based Access Control (AD-017)**:
  - Moderation privileges are strictly tied to active records in `marketplace.moderator_assignments`.
  - Non-moderators are rejected at the database engine boundary with error `P0001 (FORBIDDEN)`.
  - To prevent self-elevation, `INSERT`, `UPDATE`, and `DELETE` on `marketplace.moderator_assignments` are explicitly revoked from `public`, `authenticated`, and `anon`, and restricted solely to `service_role`.
- **Atomic Cascading Actions (AD-017, Marketplace Invariant 9)**:
  - **Report Dismissal (`marketplace_api.dismiss_report`)**:
    - Marks pending report as `dismissed` and appends an immutable audit entry.
    - Rejects already-resolved reports with `REPORT_ALREADY_RESOLVED`.
  - **Listing Takedown (`marketplace_api.remove_listing_moderator`)**:
    - Sets listing status permanently to `removed`.
    - Atomically cancels active reservations with `cancellation_reason = 'moderation_removal'`.
    - Supersedes pending offers and marks any associated report as `actioned`.
  - **User Suspension (`marketplace_api.suspend_user_moderator`)**:
    - Records user suspension in `marketplace.user_suspensions`.
    - Takes down all active/reserved listings owned by the user (`removed`).
    - Cancels all active reservations involving the user as buyer or seller (`cancellation_reason = 'moderation_suspension'`).
    - Supersedes pending offers.
- **Mathematical Non-Repudiation & Append-Only Audit Trail (AD-017)**:
  - All moderation actions commit an atomic record to `marketplace.moderation_actions`.
  - Engine-level permissions explicitly revoke `UPDATE` and `DELETE` privileges from all non-superuser roles.
  - Audit rows capture `moderator_id`, `action_type`, `target_type`, `target_id`, `reason`, and `created_at`.
- **Mandatory Justification Notes**:
  - All moderation actions require a non-empty, non-whitespace justification note of up to 1000 characters.

---

## Preflight and Configuration Validation

Before deploying updates in production:

1. **Database Migrations & Tables**:
   - Verify `marketplace.moderator_assignments`, `marketplace.user_suspensions`, and `marketplace.moderation_actions` exist with RLS enabled.
   - Verify unique partial index `idx_active_moderator_assignment` on `marketplace.moderator_assignments (user_id) where revoked_at is null`.
   - Verify `REVOKE UPDATE, DELETE ON marketplace.moderation_actions` is in effect.
2. **RPC Function Grants**:
   - Ensure execute grants on `marketplace_api.is_moderator`, `marketplace_api.get_moderation_queue`, `marketplace_api.dismiss_report`, `marketplace_api.remove_listing_moderator`, `marketplace_api.suspend_user_moderator`, and `marketplace_api.get_moderation_audit_log` to `authenticated` and `service_role`.
3. **Boundary Verification**:
   - Ensure moderation pages and presentation components do not directly import infrastructure adapters or provider packages.

---

## Operational Verification

To verify that the moderation repository, application service, API routes, and components pass all quality gates:

```bash
npm run check
npm run test:integration
```

To run the Playwright end-to-end moderation workflows:

```bash
npx playwright test apps/web/tests/marketplace-moderation.spec.ts --config apps/web/playwright.config.mjs
```

---

## Incident Response & Recovery

### 1. Unauthorized Access Attempt (HTTP 403)
- **Symptom**: User receives HTTP 403 `FORBIDDEN` when accessing `/moderation` or executing an action.
- **Cause**: User is not listed in `marketplace.moderator_assignments` with an active (`revoked_at is null`) grant.
- **Action**: Expected behavior for regular users. If granting moderator privileges to trusted staff:
  ```sql
  -- Grant moderator role (service_role only)
  insert into marketplace.moderator_assignments (user_id, granted_by)
  values ('<TARGET_USER_UUID>', '<SUPERUSER_UUID>');
  ```

### 2. Already Resolved Report Conflict (HTTP 409)
- **Symptom**: Moderator receives HTTP 409 `REPORT_ALREADY_RESOLVED`.
- **Cause**: Another moderator already actioned or dismissed the report in concurrent triage.
- **Action**: Expected behavior. Refresh the queue to observe the current status.

### 3. Verification of Audit Trail Integrity
- **Diagnostic Query**:
  ```sql
  select id, moderator_id, action_type, target_type, target_id, reason, created_at
    from marketplace.moderation_actions
   order by created_at desc
   limit 50;
  ```
- **Immutability Guarantee**: Tampering attempts via `UPDATE` or `DELETE` statements will be rejected by PostgreSQL with permission denied.
