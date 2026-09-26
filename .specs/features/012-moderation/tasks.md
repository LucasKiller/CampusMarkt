# Tasks: Feature 012-moderation

## Test Coverage Matrix

| Requirement | Acceptance Criteria | Test File | Test Type |
| --- | --- | --- | --- |
| MOD-01 | P1 Story 1: AC1, AC2, AC3, AC4 | `tests/architecture/moderation-boundary.test.ts`<br>`apps/web/src/modules/moderation/application/moderation.test.ts`<br>`apps/web/tests/marketplace-moderation.spec.ts` | Architecture / Unit / E2E |
| MOD-02 | P1 Story 2: AC1, AC2, AC3 | `apps/web/src/modules/moderation/application/moderation.test.ts`<br>`tests/integration/moderation/queue-routes.test.ts`<br>`apps/web/tests/marketplace-moderation.spec.ts` | Unit / Integration / E2E |
| MOD-03 | P1 Story 3: AC1, AC2, AC3 | `packages/domain/src/listings/moderation.test.ts`<br>`supabase/tests/marketplace-moderation-persistence.test.ts`<br>`apps/web/tests/marketplace-moderation.spec.ts` | Unit / Database / E2E |
| MOD-04 | P1 Story 4: AC1, AC2 | `packages/validation/src/listings/moderation.test.ts`<br>`tests/integration/moderation/actions-routes.test.ts`<br>`apps/web/tests/marketplace-moderation.spec.ts` | Unit / Integration / E2E |
| MOD-05 | P1 Story 5: AC1, AC2, AC3 | `supabase/tests/marketplace-moderation-persistence.test.ts`<br>`tests/integration/moderation/actions-routes.test.ts`<br>`apps/web/tests/marketplace-moderation.spec.ts` | Database / Integration / E2E |

---

## Gate Check Commands

- **Quick gate**: `cmd.exe /c "npm run check"`
- **Database gate**: `cmd.exe /c "npm run check && npm run test:db"`
- **Integration gate**: `cmd.exe /c "npm run check && npm run test:integration"`
- **Full gate**: `cmd.exe /c "npm run check && npm run test:integration && npm run test:db"`

---

## Execution Plan

### Phase 1: Contracts and Domain Foundation
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Database Layer, RPCs and Persistence
```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Server Services and HTTP Routes
```text
T9 -> T10 -> T11 -> T12
```

### Phase 4: UI Components and User Journeys
```text
T13 -> T14 -> T15 -> T16
```

---

## Task Breakdown

### Phase 1: Contracts and Domain Foundation

#### T1: Define moderation DTOs and type predicates
**What**: Define `ModerationActionType`, `ModerationQueueItemDTO`, `ModerationActionDTO`, `ExecuteModerationActionRequest`, and type predicates.
**Where**: `packages/types/src/listings/moderation.ts`
**Depends on**: None
**Requirement**: MOD-01, MOD-02, MOD-05
**Done when**:
- [x] DTO interfaces and types defined for queue items, actions, and audit logs.
- [x] Type predicates `isExecuteModerationActionRequest` and `isModerationActionDTO` implemented.
- [x] Re-exported from `packages/types/src/index.ts`.
- [x] Unit tests pass in `moderation.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): define moderation dtos and type predicates`

#### T2: Implement moderation action validation schemas
**What**: Implement input validation for moderation actions ($\le 1000$ chars justification note, action type, UUIDs).
**Where**: `packages/validation/src/listings/moderation.ts`
**Depends on**: T1
**Requirement**: MOD-02, MOD-03, MOD-04
**Done when**:
- [x] `validateExecuteModerationActionInput` checks action type enum, mandatory reason, UUID targets.
- [x] Re-exported from `packages/validation/src/index.ts`.
- [x] Unit tests pass in `moderation.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): implement moderation action validation schemas`

#### T3: Implement moderation domain invariants and status helpers
**What**: Implement moderator authority assertion, listing status `removed` domain helpers, and cascade rules.
**Where**: `packages/domain/src/listings/moderation.ts`
**Depends on**: T2
**Requirement**: MOD-01, MOD-03, MOD-04
**Done when**:
- [x] `assertCanModerate(isModerator)` enforces RBAC.
- [x] Domain helpers for listing status `removed` (Marketplace Invariant 9) and reservation cascades.
- [x] Re-exported from `packages/domain/src/index.ts`.
- [x] Unit tests pass in `moderation.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): implement domain invariants and status helpers`

#### T4: Add architectural boundary tests for moderation module
**What**: Add DDD boundary rules ensuring moderation actions remain restricted and audit log immutability is enforced.
**Where**: `tests/architecture/moderation-boundary.test.ts`
**Depends on**: T3
**Requirement**: MOD-01, MOD-05
**Done when**:
- [x] Boundaries enforce that non-moderator roles cannot access moderation RPCs or views.
- [x] Prohibits modification of audit log records.
- [x] All architectural boundary tests pass.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(moderation): add architectural boundary tests for moderation module`

---

### Phase 2: Database Layer, RPCs and Persistence

#### T5: Add moderator_assignments and audit tables migration
**What**: Add `removed` status to `listing_status`, create `moderator_assignments`, `user_suspensions`, `moderation_actions` tables.
**Where**: `supabase/migrations/20260926040000_marketplace_moderation.sql`
**Depends on**: T4
**Requirement**: MOD-01, MOD-05
**Done when**:
- [x] Tables created with foreign keys and unique constraints.
- [x] `UPDATE` and `DELETE` on `moderation_actions` revoked at engine level (AD-017).
- [x] RLS policies restrict management of moderator roles to `service_role`.
**Tests**: db
**Gate**: Database
**Commit**: `feat(moderation): add moderator assignments and audit tables migration`

#### T6: Implement get_moderation_queue RPC
**What**: Implement `marketplace_api.get_moderation_queue` and `marketplace_api.is_moderator`.
**Where**: `supabase/migrations/20260926041000_marketplace_moderation_queue_rpc.sql`
**Depends on**: T5
**Requirement**: MOD-01, MOD-02
**Done when**:
- [x] `is_moderator` checks active assignment.
- [x] `get_moderation_queue` returns pending reports with target snippets for moderators.
- [x] Rejects non-moderators with HTTP 403 `FORBIDDEN`.
**Tests**: db
**Gate**: Database
**Commit**: `feat(moderation): implement get_moderation_queue rpc`

#### T7: Implement dismiss, remove_listing, and suspend_user RPCs
**What**: Implement privileged moderation action RPCs with atomic audit logging.
**Where**: `supabase/migrations/20260926042000_marketplace_moderation_action_rpcs.sql`
**Depends on**: T6
**Requirement**: MOD-02, MOD-03, MOD-04, MOD-05
**Done when**:
- [x] `dismiss_report` marks report `dismissed` and logs action.
- [x] `remove_listing_moderator` sets listing `removed`, cancels active reservations, and logs action.
- [x] `suspend_user_moderator` records suspension, removes active listings, and logs action.
- [x] `get_moderation_audit_log` returns paginated audit records for moderators.
**Tests**: db
**Gate**: Database
**Commit**: `feat(moderation): implement moderation action and audit rpcs`

#### T8: Add database persistence and RBAC tests
**What**: Add tests verifying RBAC authorization, audit log immutability, atomic cascades, and suspension enforcement.
**Where**: `supabase/tests/marketplace-moderation-persistence.test.ts`
**Depends on**: T7
**Requirement**: MOD-01, MOD-03, MOD-05
**Done when**:
- [x] Verifies non-moderator calls fail with FORBIDDEN.
- [x] Verifies UPDATE/DELETE on audit table throws permission denied.
- [x] Verifies listing removal cancels active reservation atomically.
- [x] All database persistence tests pass.
**Tests**: db
**Gate**: Database
**Commit**: `test(moderation): add database persistence and rbac tests`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplaceModerationRepository
**What**: Implement repository adapter calling moderation RPCs and mapping typed DTOs.
**Where**: `apps/web/src/modules/moderation/server/moderation-repository.ts`
**Depends on**: T8
**Requirement**: MOD-01, MOD-02, MOD-05
**Done when**:
- [x] Repository wraps `getModerationQueue`, `dismissReport`, `removeListing`, `suspendUser`, `getAuditLog`.
- [x] Maps database records to typed DTOs.
- [x] Repository unit tests pass with mock Supabase client.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): implement marketplace moderation repository`

#### T10: Implement MarketplaceModerationService
**What**: Implement application service coordinating validation, RBAC checks, and telemetry.
**Where**: `apps/web/src/modules/moderation/application/moderation.ts`
**Depends on**: T9
**Requirement**: MOD-01, MOD-02, MOD-03, MOD-04
**Done when**:
- [x] Verifies caller moderator role before dispatching actions.
- [x] Coordinates dismissal, listing removal, and user suspension.
- [x] Application service unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): implement marketplace moderation application service`

#### T11: Implement moderation queue and status API routes
**What**: Implement `GET /api/moderation/queue` and `GET /api/moderation/status`.
**Where**: `apps/web/src/app/api/moderation/queue/route.ts`
**Depends on**: T10
**Requirement**: MOD-01, MOD-02
**Done when**:
- [x] `GET /api/moderation/queue` returns pending reports for authorized moderators.
- [x] `GET /api/moderation/status` returns moderator flag.
- [x] Rejects non-moderators with HTTP 403 `FORBIDDEN`.
- [x] Integration tests verify route handlers.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(moderation): implement moderation queue and status api routes`

#### T12: Implement moderation action and audit API routes
**What**: Implement `POST /api/moderation/actions` and `GET /api/moderation/audit`.
**Where**: `apps/web/src/app/api/moderation/actions/route.ts`
**Depends on**: T11
**Requirement**: MOD-02, MOD-03, MOD-04, MOD-05
**Done when**:
- [x] `POST /api/moderation/actions` executes dismissal, listing removal, or suspension with CSRF check.
- [x] `GET /api/moderation/audit` returns chronological audit records.
- [x] Integration tests verify all action branches.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(moderation): implement moderation action and audit api routes`

---

### Phase 4: UI Components and User Journeys

#### T13: Implement moderation action modal and report card
**What**: Implement report card showing target context and action modal requiring mandatory justification note.
**Where**: `apps/web/src/components/marketplace/moderation/moderation-action-modal.tsx`
**Depends on**: T12
**Requirement**: MOD-02, MOD-03, MOD-04
**Done when**:
- [x] Report card displays target type, snippet, policy reason, and action triggers.
- [x] Accessible modal captures mandatory justification note ($\le 1000$ chars).
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): implement moderation action modal and report card`

#### T14: Implement moderation review queue page
**What**: Implement `/moderation` workspace page displaying review queue with tab navigation.
**Where**: `apps/web/src/app/moderation/page.tsx`
**Depends on**: T13
**Requirement**: MOD-01, MOD-02
**Done when**:
- [x] Gated to authorized moderators; non-moderators see 403/redirect.
- [x] Queue lists pending reports with dismiss, remove listing, and suspend user actions.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): implement moderation review queue page`

#### T15: Implement moderation audit log page
**What**: Implement `/moderation/audit` displaying immutable append-only audit trail.
**Where**: `apps/web/src/app/moderation/audit/page.tsx`
**Depends on**: T14
**Requirement**: MOD-05
**Done when**:
- [x] Displays chronological audit log with moderator ID, action badge, target, reason, and date.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(moderation): implement moderation audit log page`

#### T16: Prove end-to-end moderation journeys and add runbook
**What**: Implement Playwright E2E tests proving moderation workflows and add operational runbook.
**Where**: `apps/web/tests/marketplace-moderation.spec.ts`
**Depends on**: T15
**Requirement**: MOD-01, MOD-02, MOD-03, MOD-04, MOD-05
**Done when**:
- [x] Playwright E2E tests prove:
  - Non-moderator cannot access `/moderation`.
  - Moderator triages report and dismisses with note.
  - Moderator removes listing, verifying listing moves to `removed` and reservation is cancelled.
  - Moderator suspends user, verifying user cannot perform mutations.
  - Audit log records actions immutably.
- [x] Operational runbook added to `docs/operations/marketplace/moderation.md`.
- [x] All tests pass.
**Tests**: e2e
**Gate**: Full
**Commit**: `test(moderation): prove e2e moderation journeys and add runbook`
