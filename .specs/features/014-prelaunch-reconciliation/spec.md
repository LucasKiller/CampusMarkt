# Prelaunch Reconciliation Specification

**Status:** Approved

## Problem Statement

CampusMarkt's implemented V1 and its repository documentation no longer agree on project status, deployment identity, and university-verification duration. Continuing toward beta with those contradictions would make setup misleading, couple legal pages to one hostname, and apply a trust-badge policy different from the approved product rule.

## Goals

- [ ] Make the README accurately describe the implemented V1 and its verified local workflows.
- [ ] Make the public hostname and legal contact addresses configurable while documenting `campusmarkt.inovv.co` as the current production example.
- [ ] Enforce university-verification validity for twelve calendar months in every active behavior layer.
- [ ] Preserve historical validation evidence while reconciling completed-spec status markers.
- [ ] Record the focused hardening work still required before private beta.

## Out of Scope

| Item | Reason |
| --- | --- |
| Final legal operator identity or postal address | Requires operator confirmation and legal review, not a technical default. |
| VPS deployment, DNS changes, remote migrations, or push | Approved specs authorize local implementation and commits only. |
| Marketplace auth/RPC and offer-state hardening | Material behavior changes require their own acceptance criteria and validation. |
| Disaster-recovery redesign | A true restore drill is a separate operational-hardening feature. |
| Broad architecture rewrite | The review found a coherent, repairable architecture rather than a need to replace it. |

## Assumptions & Open Questions

| Decision | Chosen value | Rationale |
| --- | --- | --- |
| Provisional hostname | `campusmarkt.inovv.co` | Explicitly approved for current production examples, without making it immutable. |
| Public contact configuration | Server-only environment variables | Allows deployment changes without rebuilding source constants or exposing secrets. |
| Default production contacts | `kontakt@campusmarkt.inovv.co`, `datenschutz@campusmarkt.inovv.co` | Predictable role addresses on the approved provisional hostname. |
| Verification period | Twelve calendar months from `verified_at` | Matches the approved product policy and avoids treating a month as a fixed number of seconds. |
| Existing records | Recalculate `expires_at = verified_at + interval '12 months'` | Applies one consistent policy to current verification records. |
| Historical reports | Preserve them verbatim | They are evidence of the behavior validated at that point in time. |

**Open questions:** The final legal operator identity and postal address remain intentionally outside this feature and must be confirmed before public launch.

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --- | --- |
| Input validation and bounds | Production preflight rejects absent/invalid public contact emails; hostname remains validated through the existing URL/ingress rules. |
| Failure and partial-failure states | Local/test rendering has safe `.local` fallbacks; production must explicitly provide public contact configuration. |
| Idempotency and retry | Reapplying configuration is idempotent; the additive migration deterministically recalculates expiration from `verified_at`. |
| Authentication and authorization | No auth boundary changes are introduced by this feature. |
| Concurrency and ordering | The migration changes only the derived expiration timestamp; confirmation RPCs calculate the same policy atomically. |
| Data lifecycle and cascades | Existing verification rows are extended to twelve calendar months; account-deletion cascades remain unchanged. |
| Observability | Preflight errors name missing or invalid configuration keys without logging values. |
| Privacy boundary | Institutional emails remain discarded after confirmation; legal contacts are public role addresses, not private account addresses. |

## User Stories

### RECON-01: Repository Truth

As a contributor or operator, I want the repository entry point and status records to match the delivered system so that I do not make decisions from obsolete setup or release claims.

- **WHEN** a contributor opens `README.md`, **THEN** the document describes the implemented Next.js, TypeScript, and self-hosted Supabase architecture, the V1 boundaries, local setup, validation commands, and pre-beta status without claiming that source code is absent.
- **WHEN** a previously verified feature has a passing `validation.md` and all tasks are complete, **THEN** its high-level goal checkboxes reflect completion without modifying the historical validation report.
- **WHEN** release status is read from `.specs/STATE.md`, **THEN** it states that focused hardening remains before private beta and identifies the known blocker classes.

### RECON-02: Configurable Public Deployment Identity

As an operator, I want the public hostname and legal contact addresses supplied by deployment configuration so that a domain change does not require source edits.

- **WHEN** the production environment is validated, **THEN** missing or syntactically invalid `PUBLIC_CONTACT_EMAIL` and `PUBLIC_PRIVACY_EMAIL` values fail preflight with key-specific errors.
- **WHEN** the legal pages render, **THEN** their visible text and `mailto:` targets use the configured public role addresses and never contain a fixed `campusmarkt.tu-braunschweig.de` hostname.
- **WHEN** an operator copies the production environment example, **THEN** public URL and contact examples use `campusmarkt.inovv.co` while remaining editable environment values.
- **WHEN** local development or isolated tests omit production contact variables, **THEN** the pages render safe `@campusmarkt.local` role-address fallbacks.

### RECON-03: Twelve-Month University Verification

As a voluntarily verified user, I want my university trust badge to remain active for twelve calendar months so that re-verification follows the approved annual cadence.

- **WHEN** a university verification is confirmed, **THEN** domain and database behavior set its expiration to exactly twelve calendar months after confirmation.
- **WHEN** the interval crosses variable month lengths or a leap day, **THEN** expiration follows calendar-month arithmetic rather than a fixed 365-day duration.
- **WHEN** the additive migration is applied to an existing verification row, **THEN** its expiration is recalculated from its original `verified_at` value using `interval '12 months'`.
- **WHEN** current UI or documentation explains verification retention, **THEN** it says twelve months and contains no active 180-day or six-month policy claim.
- **WHILE** the verification has not expired, **THEN** the existing badge visibility rules remain unchanged; **WHEN** it expires, **THEN** query-time badge projection still removes it until re-verification.

### RECON-04: Evidence Preservation and Traceability

As a maintainer, I want the policy amendment proven without rewriting prior evidence so that the audit trail remains trustworthy.

- **WHEN** Feature 014 is completed, **THEN** its tasks and validation map each requirement to automated or documentary evidence.
- **WHEN** Feature 003 history is inspected, **THEN** its original `validation.md` remains unchanged and an amendment points to Feature 014 for the twelve-month policy.
- **WHEN** project decisions are inspected, **THEN** AD-008 is marked superseded and a new active decision records the twelve-calendar-month policy.

## Requirement Traceability

| Requirement | Description | Target evidence | Status |
| --- | --- | --- | --- |
| RECON-01 | Repository truth | README, completed goal markers, STATE review boundary | planned |
| RECON-02 | Configurable public deployment identity | Env validation tests, legal-page tests, Compose example | planned |
| RECON-03 | Twelve-month university verification | Domain tests, additive migration tests, documentation checks | planned |
| RECON-04 | Evidence preservation and traceability | Feature amendment, STATE decision, independent validation | planned |
