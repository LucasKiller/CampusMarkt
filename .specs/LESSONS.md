# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Run whitespace checks against the full feature commit range, not only the working tree.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `documentation` · harmful: 0
- features: project-foundation
- evidence: .specs/features/project-foundation/validation.md:72 (documentation)
- last seen: 2026-09-14T19:32:07Z

### L-002 - Reconcile the project handoff with git and task state after the final task.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `sdd-memory` · harmful: 0
- features: project-foundation
- evidence: .specs/features/project-foundation/validation.md:115 (sdd-memory)
- last seen: 2026-09-14T19:32:07Z

### L-003 - Verify every conjunct in a task's done-when criteria against each repeated document section.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `documentation` · harmful: 0
- features: project-foundation
- evidence: .specs/features/project-foundation/validation.md:126 (documentation)
- last seen: 2026-09-14T19:45:14Z

### L-004 - Maintain one canonical feature ID registry and reference it instead of independently renumbering roadmaps.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `product-planning` · harmful: 0
- features: project-foundation
- evidence: .specs/features/project-foundation/validation.md:127 (product-planning)
- last seen: 2026-09-14T19:45:14Z

### L-005 - Allocate integration-test ingress ports through the publishing runtime instead of assuming a host-selected port can be bound by Docker.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `integration-stack` · harmful: 0
- features: 001-web-supabase-foundation
- evidence: tests/integration/stack/foundation-stack.test.ts:38-50 (integration-stack)
- last seen: 2026-09-15T00:57:46Z

### L-006 - Negative dependency probes must assert the final readiness boolean and CLI exit code, not only diagnostic strings.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `production-readiness` · harmful: 0
- features: 001-web-supabase-foundation
- evidence: validation.md sensor M3 (production-readiness)
- last seen: 2026-09-15T00:57:47Z

### L-007 - Validate complete S3 authentication in readiness fixtures instead of matching an access-key substring.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `production-readiness` · harmful: 0
- features: 001-web-supabase-foundation
- evidence: tests/integration/config/production-probes.test.ts:114-118 (production-readiness)
- last seen: 2026-09-15T00:57:55Z

### L-008 - Public readiness must probe every required service named by the startup contract.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `health-readiness` · harmful: 0
- features: 001-web-supabase-foundation
- evidence: apps/web/src/modules/foundation/readiness.ts:13-27 (health-readiness)
- last seen: 2026-09-15T00:57:55Z

### L-009 - Execute the real readiness CLI for every negative dependency class because object-level tests do not prove process exit behavior.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `production-readiness` · harmful: 0
- features: 001-web-supabase-foundation
- evidence: validation.md sensor M14-M15 (production-readiness)
- last seen: 2026-09-15T02:16:47Z

### L-010 - Every external dependency probe needs an unreachable or timeout fixture in addition to an authentication failure fixture.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `production-readiness` · harmful: 0
- features: 001-web-supabase-foundation
- evidence: validation.md sensor M16 (production-readiness)
- last seen: 2026-09-15T02:16:48Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
