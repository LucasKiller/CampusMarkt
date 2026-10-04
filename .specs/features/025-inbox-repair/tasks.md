# Inbox Repair Tasks

**Status:** Approved by the operator's 2026-10-04 request.

| Task | Requirements | Gate | Status |
| --- | --- | --- | --- |
| T1: Repair authenticated messaging, history, error states, listing entry point, and inbox/thread design | INBOX-01, INBOX-02, INBOX-03 | Focused unit/integration tests, responsive browser checks, typecheck, lint, formatting check, build, independent validation | Implemented locally; validation pending |

Commit T1 atomically. Then request independent validation and record `validation.md`. The database migration cannot be exercised locally while Docker is unavailable; production application must wait for a separate deployment authorization.
