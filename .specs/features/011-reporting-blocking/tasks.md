# Tasks: Feature 011-reporting-blocking

## Test Coverage Matrix

| Requirement | Acceptance Criteria | Test File | Test Type |
| --- | --- | --- | --- |
| REP-01 | P1 Story 1: AC1, AC2, AC3, AC4, AC5 | `packages/validation/src/listings/safety.test.ts`<br>`tests/integration/safety/reports-routes.test.ts`<br>`apps/web/tests/marketplace-reporting-blocking.spec.ts` | Unit / Integration / E2E |
| REP-02 | P1 Story 2: AC1, AC2, AC3 | `tests/architecture/safety-boundary.test.ts`<br>`supabase/tests/marketplace-safety-persistence.test.ts`<br>`tests/integration/safety/reports-routes.test.ts` | Architecture / Database / Integration |
| REP-03 | P1 Story 3: AC1, AC2, AC3, AC4 | `packages/domain/src/listings/safety.test.ts`<br>`supabase/tests/marketplace-safety-persistence.test.ts`<br>`apps/web/tests/marketplace-reporting-blocking.spec.ts` | Unit / Database / E2E |
| REP-04 | P1 Story 4: AC1, AC2, AC3 | `apps/web/src/modules/safety/application/safety.test.ts`<br>`tests/integration/safety/blocks-routes.test.ts`<br>`apps/web/tests/marketplace-reporting-blocking.spec.ts` | Unit / Integration / E2E |
| REP-05 | P1 Story 5: AC1, AC2, AC3 | `apps/web/src/app/account/blocked-users/page.test.tsx`<br>`tests/integration/safety/blocks-routes.test.ts`<br>`apps/web/tests/marketplace-reporting-blocking.spec.ts` | Component / Integration / E2E |

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

#### T1: Define reporting and blocking DTOs and type predicates
**What**: Define `ReportReason`, `ReportTargetType`, `CreateReportRequest`, `ReportConfirmationDTO`, `UserBlockDTO`, and type predicates.
**Where**: `packages/types/src/listings/safety.ts`
**Depends on**: None
**Requirement**: REP-01, REP-03, REP-05
**Done when**:
- [x] DTO interfaces and enums defined for reports and blocks.
- [x] Type predicates `isCreateReportRequest` and `isUserBlockDTO` implemented.
- [x] Re-exported from `packages/types/src/index.ts`.
- [x] Unit tests pass in `safety.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): define reporting and blocking dtos and type predicates`

#### T2: Implement report and block validation schemas
**What**: Implement input validation for report submissions ($\le 1000$ chars details) and block requests.
**Where**: `packages/validation/src/listings/safety.ts`
**Depends on**: T1
**Requirement**: REP-01, REP-03
**Done when**:
- [x] `validateCreateReportInput` checks reason enum, details length, targetId.
- [x] `validateBlockUserInput` checks blockedId UUID.
- [x] Re-exported from `packages/validation/src/index.ts`.
- [x] Unit tests pass in `safety.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): implement report and block validation schemas`

#### T3: Implement safety domain invariants and helpers
**What**: Implement domain invariant helpers preventing self-reporting and self-blocking.
**Where**: `packages/domain/src/listings/safety.ts`
**Depends on**: T2
**Requirement**: REP-01, REP-03
**Done when**:
- [x] `assertCanReport(reporterId, targetId)` rejects self-reporting.
- [x] `assertCanBlock(blockerId, blockedId)` rejects self-blocking.
- [x] Re-exported from `packages/domain/src/index.ts`.
- [x] Unit tests pass in `safety.test.ts`.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): implement safety domain invariants and helpers`

#### T4: Add architectural boundary tests for reporting and blocking
**What**: Add DDD boundary rules ensuring reporter privacy and isolating safety mechanisms from public catalog.
**Where**: `tests/architecture/safety-boundary.test.ts`
**Depends on**: T3
**Requirement**: REP-02, REP-04
**Done when**:
- [x] Boundaries enforce that target users cannot access report tables.
- [x] Prohibits reporter PII leakage in public feeds or search responses.
- [x] All architectural boundary tests pass.
**Tests**: architecture
**Gate**: Quick
**Commit**: `test(safety): add architectural boundary tests for reporting and blocking`

---

### Phase 2: Database Layer, RPCs and Persistence

#### T5: Add reports and user_blocks tables migration
**What**: Create `marketplace.reports` and `marketplace.user_blocks` tables with bidirectional composite indexes and RLS.
**Where**: `supabase/migrations/20260925220000_marketplace_reporting_and_blocking.sql`
**Depends on**: T4
**Requirement**: REP-01, REP-02, REP-03
**Done when**:
- [x] `marketplace.reports` table created with unique pending index.
- [x] `marketplace.user_blocks` created with bidirectional indexes `(blocker_id, blocked_id)` and `(blocked_id, blocker_id)`.
- [x] RLS policies enforce reporter-only insert and target-blind select.
**Tests**: db
**Gate**: Database
**Commit**: `feat(safety): add reports and user_blocks tables migration`

#### T6: Implement submit_report RPC with self report check
**What**: Implement `marketplace_api.submit_report` with target validation, duplicate check, and self-report prevention.
**Where**: `supabase/migrations/20260925221000_marketplace_safety_report_rpc.sql`
**Depends on**: T5
**Requirement**: REP-01, REP-02
**Done when**:
- [x] Verifies caller authentication.
- [x] Rejects self-reporting on user or owned listing.
- [x] Rejects duplicate pending report for same target.
- [x] Returns report confirmation receipt.
**Tests**: db
**Gate**: Database
**Commit**: `feat(safety): implement submit_report rpc with self report check`

#### T7: Implement block and unblock user RPCs
**What**: Implement `marketplace_api.block_user`, `unblock_user`, and `get_blocked_users`.
**Where**: `supabase/migrations/20260925222000_marketplace_safety_block_rpcs.sql`
**Depends on**: T6
**Requirement**: REP-03, REP-05
**Done when**:
- [x] `block_user` enforces no self-block and idempotently records block.
- [x] `unblock_user` deletes active block.
- [x] `get_blocked_users` returns list of blocked users for caller.
**Tests**: db
**Gate**: Database
**Commit**: `feat(safety): implement block and unblock user rpcs`

#### T8: Add database persistence and RLS tests for safety
**What**: Add tests verifying report duplicate constraints, self-action rejections, RLS target blindness, and block queries.
**Where**: `supabase/tests/marketplace-safety-persistence.test.ts`
**Depends on**: T7
**Requirement**: REP-01, REP-02, REP-03
**Done when**:
- [x] Verifies reported target has zero SELECT visibility on reports table.
- [x] Verifies duplicate pending report rejection.
- [x] Verifies self-block and self-report rejections.
- [x] All database persistence tests pass.
**Tests**: db
**Gate**: Database
**Commit**: `test(safety): add database persistence and rls tests for safety`

---

### Phase 3: Server Services and HTTP Routes

#### T9: Implement MarketplaceSafetyRepository
**What**: Implement repository adapter calling reporting and blocking RPCs and mapping typed DTOs.
**Where**: `apps/web/src/modules/safety/server/safety-repository.ts`
**Depends on**: T8
**Requirement**: REP-01, REP-03, REP-05
**Done when**:
- [x] Repository methods for submitReport, blockUser, unblockUser, getBlockedUsers.
- [x] Maps raw database records to typed DTOs.
- [x] Repository unit tests pass with mock Supabase client.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): implement marketplace safety repository`

#### T10: Implement MarketplaceSafetyService
**What**: Implement application service coordinating validation, self-action checks, rate limiting (10/min), and telemetry.
**Where**: `apps/web/src/modules/safety/application/safety.ts`
**Depends on**: T9
**Requirement**: REP-01, REP-03, REP-04
**Done when**:
- [x] Enforces 10 actions/min rate limit per user.
- [x] Coordinates reporting and blocking flows.
- [x] Application service unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): implement marketplace safety application service`

#### T11: Implement submit report API route handler
**What**: Implement `POST /api/marketplace/reports`.
**Where**: `apps/web/src/app/api/marketplace/reports/route.ts`
**Depends on**: T10
**Requirement**: REP-01, REP-02
**Done when**:
- [x] Handles report submissions with CSRF origin guards.
- [x] Returns HTTP 201 on success.
- [x] Returns HTTP 400 on self-reporting and HTTP 409 on duplicate pending.
- [x] Integration tests verify route handlers.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(safety): implement submit report api route handler`

#### T12: Implement user blocks and unblock API routes
**What**: Implement `GET /api/marketplace/blocks`, `POST /api/marketplace/blocks`, and `DELETE /api/marketplace/blocks/[id]`.
**Where**: `apps/web/src/app/api/marketplace/blocks/route.ts`
**Depends on**: T11
**Requirement**: REP-03, REP-05
**Done when**:
- [x] `GET /api/marketplace/blocks` lists blocked users.
- [x] `POST /api/marketplace/blocks` blocks user.
- [x] `DELETE /api/marketplace/blocks/[id]` unblocks user.
- [x] Integration tests verify all outcomes.
**Tests**: integration
**Gate**: Integration
**Commit**: `feat(safety): implement user blocks and unblock api routes`

---

### Phase 4: UI Components and User Journeys

#### T13: Implement report modal component
**What**: Implement accessible modal for reporting listings or users with reason taxonomy and character counter.
**Where**: `apps/web/src/components/marketplace/safety/report-modal.tsx`
**Depends on**: T12
**Requirement**: REP-01, REP-02
**Done when**:
- [x] Modal displays reason options, optional details textarea ($\le 1000$ chars), and submit button.
- [x] Displays confirmation on success reassuring reporter confidentiality.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): implement report modal component`

#### T14: Implement block user modal component
**What**: Implement confirmation dialog for blocking user explaining mutual exclusion effects.
**Where**: `apps/web/src/components/marketplace/safety/block-modal.tsx`
**Depends on**: T13
**Requirement**: REP-03, REP-04
**Done when**:
- [x] Dialog explains bidirectional blocking consequences.
- [x] Confirmation triggers block API and provides immediate visual feedback.
- [x] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): implement block user modal component`

#### T15: Implement blocked users management page
**What**: Implement `/account/blocked-users` page displaying list of blocked users with unblock action.
**Where**: `apps/web/src/app/account/blocked-users/page.tsx`
**Depends on**: T14
**Requirement**: REP-05
**Done when**:
- [ ] Displays list of blocked users with avatar, display name, date, and unblock button.
- [ ] Accessible empty state when no users are blocked.
- [ ] Component unit tests pass.
**Tests**: unit
**Gate**: Quick
**Commit**: `feat(safety): implement blocked users management page`

#### T16: Prove end-to-end reporting and blocking journeys
**What**: Implement Playwright E2E tests proving reporting, blocking, content exclusion, and add operational runbook.
**Where**: `apps/web/tests/marketplace-reporting-blocking.spec.ts`
**Depends on**: T15
**Requirement**: REP-01, REP-02, REP-03, REP-04, REP-05
**Done when**:
- [ ] Playwright E2E tests prove:
  - User reports listing with confidential confirmation.
  - User blocks another user.
  - Blocked user's listings disappear from feed and search.
  - Messaging and offers between blocked users are rejected.
  - Unblocking restores visibility.
- [ ] Operational runbook added to `docs/operations/marketplace/reporting-blocking.md`.
- [ ] All tests pass.
**Tests**: e2e
**Gate**: Full
**Commit**: `test(safety): prove e2e reporting and blocking journeys`
