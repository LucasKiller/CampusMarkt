# Context: 014-prelaunch-reconciliation

## Background and Purpose

Features 001 through 013 delivered the CampusMarkt V1 implementation, but a pre-beta review found three repository-truth gaps that must be reconciled before release preparation continues:

1. `README.md` still describes the repository as product-foundation-only even though the application, migrations, tests, and operational tooling now exist.
2. Public legal contact addresses contain a fixed deployment hostname. The current intended hostname is `campusmarkt.inovv.co`, but deployment identity must remain configurable without source changes.
3. Product documentation says university verification lasts twelve months while Feature 003 and the implementation use 180 days.

The same review found separate beta-hardening risks in authenticated marketplace RPC composition, offer authorization/concurrency, and disaster-recovery proof. Those findings are release blockers to be specified and fixed separately; they are deliberately not hidden inside this reconciliation feature.

## Approved Decisions

- The provisional public hostname is `campusmarkt.inovv.co`.
- The public hostname and legal contact addresses are deployment configuration, not source-code constants.
- University verification is valid for twelve calendar months from confirmation.
- Existing active verification records are recalculated from their original `verified_at` timestamp under the twelve-month policy.
- Historical validation reports remain unchanged; Feature 014 supplies the new evidence.

## In Scope

- Rewrite the repository README so it accurately describes the implemented MVP, architecture, setup, checks, and current release status.
- Reconcile unchecked high-level goals in already verified specs with their validation evidence.
- Configure public legal contact addresses through server-only environment variables and provide `campusmarkt.inovv.co` production examples.
- Replace 180-day university verification behavior with twelve calendar months in domain rules, database behavior, public wording, tests, and current product documentation.
- Record the pre-beta review findings and the resulting release boundary in `.specs/STATE.md`.

## Out of Scope

- Selecting or asserting the final legal operator name, postal address, or legal advice.
- Deploying to a VPS, changing DNS, pushing commits, or mutating a remote database.
- Repairing the separately identified marketplace authentication/authorization/concurrency defects.
- Replacing the backup-verification implementation with a true ephemeral restore drill.
- Broad architectural refactoring or migration away from the TypeScript modular monolith and self-hosted Supabase stack.

## Architectural References

- `AGENTS.md`
- `docs/product/00-product-vision.md`
- `docs/product/01-domain-model.md`
- `docs/product/02-mvp-scope.md`
- `.specs/STATE.md` (AD-002, AD-006, AD-007, AD-008, AD-018)
- `.specs/features/003-university-verification/`
- `.specs/features/013-localization-launch-hardening/`

