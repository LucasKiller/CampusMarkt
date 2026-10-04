# Inbox Repair Validation

**Status:** PASS for local implementation, with deployment and database proof pending.

**Implementation commit:** `81ab75f` on `development`. An independent reviewer inspected the implementation, the migration, the acceptance criteria, and the follow-up read-state fixes. The reviewer confirmed the user-token boundary, participant check, pagination, locale, responsive design, read-receipt reconciliation, and mark-read race guard by code inspection.

| Criterion | Evidence | Local result |
| --- | --- | --- |
| INBOX-01 | User-token client and mismatch tests; messaging route tests; listing-owner tests; reviewer inspected SQL participant guard | Pass by code inspection and local tests |
| INBOX-02 | Repository and service pagination tests; browser tests for multi-page catch-up, read receipts, failed-send draft; reviewer inspected cursor and retry behavior | Pass for specified latest-page receipts |
| INBOX-03 | Inbox failure and locale tests; browser desktop/mobile review against `DESIGN.md`; reviewer inspected translations and styles | Pass |

## Executed checks

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test:unit` — 1,304 tests passed across 107 files.
- `npm run test:architecture` — 153 tests passed across 14 files.
- Focused messaging and route tests — 86 passed; focused follow-up tests — 63 passed, including the static messaging migration checks.
- Messaging browser suite — seven journeys exercised; the test-selector defect was corrected, and its rerun passed. Two additional browser tests for read receipts and multi-page catch-up passed.
- `npm run --workspace @campusmarkt/web build` — passed.
- Prettier check for changed files and `git diff --check` — passed.
- Playwright's temporary server exited; port 3100 was no longer listening.

## Limits and release check

- Docker was unavailable locally. The new `marketplace_api.get_messages` function and transaction-level 30-message/minute limit were inspected but not executed against PostgreSQL. Apply the migration only during an authorized deployment and verify with two real participants and a non-participant.
- This repair uses four-second polling and focus reconciliation. Feature 009's sub-second Supabase Realtime criterion remains open. Read receipts for older loaded history refresh when that history is loaded again; the live receipt refresh covers the latest 50-message page.
- No push, migration against a remote database, or Coolify deployment was performed for this feature.
