# Tasks: Feature 014-prelaunch-reconciliation

## Test Coverage Matrix

| Requirement | Acceptance criteria | Evidence | Type |
| --- | --- | --- | --- |
| RECON-01 | README accuracy; completed markers; release boundary | `README.md`, completed feature specs, `.specs/STATE.md`, docs checks | Documentation / structural |
| RECON-02 | Required valid contact config; configured legal pages; provisional examples; local fallback | `scripts/config/validate-env.test.ts`, legal-page tests, Compose tests | Unit / integration |
| RECON-03 | Calendar-month calculation; migration recalculation; current wording; badge semantics | Domain identity tests, Supabase migration tests, legal-page tests | Unit / database / integration |
| RECON-04 | Traceability; preserved historical evidence; superseding decision | Git diff, spec validators, independent `validation.md` | Structural / independent validation |
| RECON-05 | Text-backed removed status; fresh migration chain | Moderation persistence test, isolated PostgreSQL database suite | Unit / database |
| RECON-06 | JWT-derived owner read/update; bounded university/avatar lookups; revoked-session and wrong-version rejection; private-schema isolation | Repository contracts, PostgreSQL privilege/session/version tests, live-stack journey | Integration / database / stack |

## Gate Check Commands

- **Quick:** `cmd.exe /c "npm run check"`
- **Integration:** `cmd.exe /c "npm run check && npm run test:integration"`
- **Database:** `cmd.exe /c "npm run test:db"`
- **Feature validators:** `python C:\Users\INOVV\.codex\skills\tlc-spec-driven\scripts\validate_spec.py .specs/features/014-prelaunch-reconciliation/spec.md` and `python C:\Users\INOVV\.codex\skills\tlc-spec-driven\scripts\validate_tasks.py .specs/features/014-prelaunch-reconciliation/tasks.md`
- **State validator:** `python C:\Users\INOVV\.codex\skills\tlc-spec-driven\scripts\validate_state.py`

## Execution Plan

```text
T1 -> T2 -> T3 -> T4 -> T5 -> independent validation
```

## Task Breakdown

### T1: Reconcile repository and completed-feature documentation

**What:** Rewrite the README for the implemented MVP, reconcile high-level goal markers in features with passing validation evidence, and record the pre-beta hardening boundary.
**Where:** `README.md`, `.specs/features/{003,007,008,009,010}-*/spec.md`, `.specs/STATE.md`
**Depends on:** None
**Requirement:** RECON-01, RECON-04
**Done when:**
- [x] README describes the actual implementation, setup, checks, and release status.
- [x] Only goals backed by passing feature validations are marked complete.
- [x] Historical `validation.md` files are unchanged.
- [x] STATE no longer claims the system is ready for launch with zero blockers.
**Tests:** documentation and structural checks
**Gate:** Quick
**Commit:** `docs(project): reconcile MVP status and feature records`

### T2: Make public deployment identity configurable

**What:** Add validated server-only public contact configuration, render it on legal pages, and provide provisional production examples for `campusmarkt.inovv.co`.
**Where:** `apps/web`, `scripts/config`, `infra/compose`, `docs/runbooks`
**Depends on:** T1
**Requirement:** RECON-02
**Done when:**
- [x] Production preflight requires and validates both public contact addresses.
- [x] Legal pages use configuration with safe local fallbacks and contain no fixed legacy hostname.
- [x] Production Compose passes the variables only to the web service.
- [x] Examples and runbooks use configurable values with `campusmarkt.inovv.co` as the current example.
- [x] Focused unit and integration tests pass.
**Tests:** unit and integration
**Gate:** Integration
**Commit:** `fix(config): make public site identity configurable`

### T3: Repair the clean database migration path

**What:** Correct the Feature 012 moderation migration's invalid enum assumption so a fresh database can reach Feature 014.
**Where:** `supabase/migrations/20260926040000_marketplace_moderation.sql`, moderation persistence test, Feature 012 design amendment
**Depends on:** T2
**Requirement:** RECON-05
**Done when:**
- [x] The moderation migration extends the actual text-backed listing status constraint with `removed`.
- [x] Its structural test rejects the nonexistent-enum implementation.
- [x] A fresh isolated PostgreSQL database applies the complete migration chain.
- [x] Test containers and volumes are removed after the gate.
- [x] The two live PostgreSQL suites execute in separate Vitest processes so their isolated Compose lifecycles cannot contaminate each other.
**Tests:** unit and database
**Gate:** Quick + Database
**Commit:** `fix(database): repair moderation migration chain`

### T4: Apply the twelve-calendar-month university policy

**What:** Replace the 180-day rule in domain logic and PostgreSQL through an additive migration, recalculate existing rows, and reconcile all current policy wording and tests.
**Where:** `packages/domain`, `supabase/migrations`, `supabase/tests`, `apps/web`, `docs/product`, Feature 003 amendment, `.specs/STATE.md`
**Depends on:** T3
**Requirement:** RECON-03, RECON-04
**Done when:**
- [x] Domain expiry uses UTC calendar-month arithmetic and covers leap/month-end cases.
- [x] A new additive migration updates existing rows and replaces confirmation behavior with `interval '12 months'`.
- [x] Database tests prove both migration recalculation and new confirmation expiry.
- [x] Current product/UI wording says twelve months; historical validation remains untouched.
- [x] AD-008 is superseded by a new active decision.
- [x] Quick, integration, and database gates pass.
**Tests:** unit, integration, database
**Gate:** Quick + Integration + Database
**Commit:** `fix(identity): extend university verification to twelve months`

### T5: Repair private identity API boundaries

**What:** Replace direct PostgREST access to the private `identity` schema with JWT-derived or service-bounded RPC composition after live-stack validation exposed broken owner-profile and university-status paths.
**Where:** `apps/web/src/modules/identity`, additive Supabase migration, repository/database/stack tests
**Depends on:** T4
**Requirement:** RECON-06
**Done when:**
- [x] Owner reads derive identity and active session from the JWT and return only allowlisted profile fields.
- [x] Display-name updates use the existing authenticated RPC rather than direct private-table access.
- [x] University status uses a bounded service-only RPC that omits email and token hashes.
- [x] Avatar media resolution uses a bounded service-only RPC and requires the exact public ID, active account state, and immutable version.
- [x] The new projection RPC is granted only to `authenticated`, uses `SECURITY DEFINER`, and pins `search_path`.
- [x] Repository, live PostgreSQL, and full-stack tests prove the boundary and revoked-session failure.
- [x] Quick, integration, database, and focused stack gates pass.
**Tests:** integration, database, stack
**Gate:** Quick + Integration + Database + focused Stack
**Commit:** `fix(identity): restore owner profile boundary`

## Final Validation

After T5, an independent verifier must create `validation.md`, trace every acceptance criterion and edge case to fresh evidence, run the required gates, and execute a discrimination sensor. Feature 014 is complete only with a PASS verdict and a clean state validator.
