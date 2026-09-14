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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
