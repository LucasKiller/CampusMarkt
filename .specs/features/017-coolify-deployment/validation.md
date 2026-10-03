# Coolify Deployment Validation

## Validation: PASS

**Date**: 2026-10-02
**Spec**: `.specs/features/017-coolify-deployment/spec.md`
**Diff range**: `b50dec6..c68344a`
**Verifier**: independent sub-agent (author differs from verifier)
**Verdict**: PASS (local DEPLOY-01 adaptation only)
**Scope**: DEPLOY-01 repository adaptation only. DEPLOY-02 and T3 remain pending; this report makes no overall deployment or beta-readiness PASS claim.

## Task completion

T1 is implemented and its fresh-checkout defect was corrected in c68344a. T2 independent adaptation verification passes. T3 was not executed by this verifier.

## Spec-anchored acceptance criteria

All test references below are `tests/integration/compose/coolify-compose.test.ts`.

| DEPLOY-01 criterion | Exact assertion and independent source inspection | Result |
| --- | --- | --- |
| AC1 complete services | test:44 `expect(Object.keys(model.services)).toEqual(expect.arrayContaining([...]))` includes all nine specified services plus MinIO/bootstrap. Generator:6-23 renders the upstream Compose model with all profiles and no interpolation. | PASS |
| AC2 no includes, vendor unchanged | test:59 `expect(model.include).toBeUndefined()`; `git diff --name-only b50dec6..41bd39f -- infra/supabase` returns no files. Generated derivative and Caddy are outside vendored tree. | PASS |
| AC3 private host ports | test:63 `expect(service.ports, name).toBeUndefined()` for every service; generator:125 deletes upstream ports, including database/gateway/Studio. | PASS |
| AC4 scoped names/network/volumes | test:64 rejects container_name; test:65 checks only Caddy joins default ingress; test:69 checks `${STACK_ID:?}-private`; test:75-78 checks scoped PostgreSQL and object volumes. Generator:124-143 removes fixed names and scopes every inherited volume. | PASS |
| AC5 successful migration before web | test:93 asserts `web.depends_on['migration-gate'].condition` equals `service_completed_successfully`; compose.coolify.yaml:702-703 confirms exact dependency. | PASS |
| AC6 server-only credential references | test:102 asserts exact service-role reference; test:105 SMTP reference; test:106 MinIO password reference; test:112 excludes dangerous NEXT_PUBLIC names. compose.coolify.yaml:73,94,550,712 retain secret references; browser fields at :720-721 are public key and public URL. Tracked secret scanner passes. | PASS |

All six criteria pass. Independent re-verification at c68344a also generated the artifact from a fresh checkout without provisioned bind directories; formatted derivatives have zero diff from tracked artifacts.

## Edge cases and ingress

- Missing bind must fail: test:139 asserts every bind exists, and generator:135-136 throws on an absent bind. Both detect the real absent `./infra/supabase/volumes/snippets` in a fresh worktree at 41bd39f. The artifact references it at compose.coolify.yaml:621. The existing checkout masks this with an ignored directory. A fresh Git checkout fails generation and one of five tests before any mutation.
- Missing required secrets: test:132 asserts `missing.status !== 0` with empty environment file and reduced environment. Local focused suite passes.
- Unhealthy required services: runtime/release completeness is DEPLOY-02 and remains pending.
- Auth denial: test:153-156 compares the exact denial matcher/403 block with existing ingress. Caddyfile.coolify:11-30 retains denial; :42 and :49 route API and web, respectively. :5-6 trust private proxies with strict forwarding; only Caddy has ingress network membership. These are static configuration checks, not an HTTP runtime smoke test.

## Gates and test integrity

Independent local commands used `COMPOSE_DISABLE_ENV_FILE=true`:

- `npx vitest run tests/integration/compose/coolify-compose.test.ts`: 5 passed, 0 failed, 0 skipped.
- `docker compose -f compose.coolify.yaml config --no-interpolate --quiet`: exit 0.
- `npm run security:scan`: tracked-file secret scan passed.
- `npm run format:check`: all matched files pass.

New focused suite increases test count by five (absent before feature); no existing tests are changed in the diff. Author-reported broader gates were not claimed as independently rerun. No Docker daemon/container startup was available or performed; HTTP, SMTP and actual MinIO runtime compatibility remain remote verification obligations. All launched check processes completed; no server/watchers were started.

## Discrimination sensor

A detached disposable worktree at 41bd39f used a junction to existing node_modules. Real implementation and tests were never mutated. Its original baseline failed solely on missing Studio snippets. Creating only that directory inside the scratch made the unchanged suite pass 5/5; this fixture provisioning is explicitly separate from shipped implementation proof.

| Mutation | Evidence | Result |
| --- | --- | --- |
| Retain upstream host ports in generator | scratch generator:125 removes `delete service.ports`; regenerate; test:63 rejects Caddy published ports. | KILLED: 1 failed, 4 passed |
| Weaken web migration gate to service_started | scratch compose.coolify.yaml:703; test:93 reports expected service_completed_successfully, received service_started. | KILLED: 1 failed, 4 passed |
| Rename server service-role key into browser namespace | scratch compose.coolify.yaml web environment; test:102 detects missing exact server credential field. | KILLED: 1 failed, 4 passed |

Sensor depth: lightweight, 3/3 killed, zero survivors. Initial missing-bind failure was not counted as a killed mutant. Junction removed, scratch worktree removed, and real `git status --porcelain` remained identical to its empty pre-sensor baseline before writing this report.

## Code quality

Scope is limited to deployment configuration, its generator/tests, ingress and operating documentation. No business behavior/schema or vendored changes. No unrelated test weakening. Each of the five tests traces to DEPLOY-01, its bind/secret edge cases, or T1 migration/storage/routing deliverables. Resource isolation and secret referencing are directly asserted. Documentation preserves owner-review limits and beta blockers. Project guidelines: AGENTS.md and approved feature design/tasks. The initial reproducibility defect below is fixed and independently reverified.

## Resolved gap and fix history

1. **Major — fresh-checkout reproducibility**: compose.coolify.yaml:621 relies on ignored/untracked `infra/supabase/volumes/snippets`; generator:135-136 and test:139 fail on a clean checkout. Fix the deployment derivative to provision this writable Studio directory reproducibly (for example a scoped named volume), regenerate, then rerun generation and focused checks in a fresh scratch checkout. Do not modify vendor files or weaken bind existence assertions. Done when fresh checkout generation and 5/5 focused checks pass without creating ignored bind directories manually.

## Requirement traceability

DEPLOY-01: independently verified locally. DEPLOY-02: pending, no remote evidence. Report does not mark any overall feature completion or production-readiness approval. Off-host backup and existing beta security/recovery blockers remain deferred and unresolved.

## Independent re-verification of c68344a

A second detached fresh worktree had no `infra/supabase/volumes/snippets` directory. Generation succeeded without creating that directory, followed by Prettier YAML formatting and `git diff --exit-code` for both generated derivatives (zero diff). The unchanged focused suite passed 5/5 with no skips; Compose no-interpolation rendering and tracked-secret scan passed. No vendored files changed across the final diff.

A direct verifier assertion on the rendered model required Studio `/app/snippets` mount to have `type === 'volume'` and `source === 'studio-snippets'`, and required `model.volumes['studio-snippets'].name === '${STACK_ID:?}-studio-snippets'`; it passed. Source evidence: scripts/operations/generate-coolify-compose.ts:131-136 performs conversion before bind existence checks; :195 adds scoped volume; compose.coolify.yaml:620 sets mount source and :793 sets resource-scoped volume name. This proves persisted configuration, not runtime data retention across a restart.

The three earlier killed sensors remain valid because the fix changes only Studio snippets storage and leaves their targeted host-port, web migration-gate, and credential behavior unchanged. The fresh worktree was removed and real porcelain matched its baseline (only this untracked report).

Scratch-wide `npm run format:check` reported 458 files because Windows checkout produced CRLF across existing baseline files. It was not treated as an implementation failure: changed deployment implementation/tests pass a root `npx prettier --check compose.coolify.yaml scripts/operations/generate-coolify-compose.ts infra/caddy/Caddyfile.coolify tests/integration/compose/coolify-compose.test.ts --ignore-unknown`, and the earlier root full formatting gate passed. This checkout formatting limitation is recorded transparently. No tests or implementation files were changed by the verifier.

**Remaining gaps**: no unresolved local adaptation defect; DEPLOY-02 HTTPS, service health, SMTP authentication and actual volume persistence still require remote operational evidence. Beta security, backup and restoration blockers remain outside this adaptation PASS.
## Independent remote evidence review — 2026-10-02

This section supersedes the earlier statement that no remote evidence exists. The local DEPLOY-01 verdict remains PASS; **DEPLOY-02 is incomplete and the overall feature is not complete**. Installed revision is recorded as 6cd4fb203ac475dd7b9dfc0285d05d3fb227618d in release.md:7. This verifier did not access Coolify or host administration and cannot independently attest container inspection, deployed revision, volume inventory or prior diagnostic disconnects.

Independent read-only HTTPS requests used PowerShell Invoke-WebRequest with default certificate validation, no certificate bypass, 20-second timeout per request, zero redirects, and explicit HTTP 200 assertion. The check process completed and exited without leaving a terminal session or server running.

| DEPLOY-02 acceptance criterion | Evidence and assertion | Scoped status |
| --- | --- | --- |
| AC1 valid HTTPS and HTTP 200 for root/live/ready | Independently observed `/` HTTP 200 (23554 bytes), `/health/live` HTTP 200 with `{"status":"live"}`, `/health/ready` HTTP 200 with `{"status":"ready","unavailable":[]}`. Asserted `[int]$r.StatusCode -eq 200` for each bounded request. Matches release.md:18-20. | Independently verified |
| AC2 bounded/redacted SMTP check | release.md:27 records Google TLS reaching AUTH and rejection code 535, no mail sent, no credentials printed. No SMTP success is inferred; this verifier did not reauthenticate. release.md:44 and STATE.md:170-171 retain operator correction and pending T3. | Recorded bounded failure; successful authentication remains unresolved |
| AC3 distinct persistent PostgreSQL/object volumes | release.md:25-26 records scoped PostgreSQL and separate MinIO volumes; local exact configuration assertions at coolify-compose.test.ts:75-92 independently passed earlier. No host inspection or restart persistence test was repeated by this verifier. | Operator execution evidence reviewed, runtime persistence not independently repeated |
| AC4 owner progress review with beta pending while backup absent | release.md:3,46; STATE.md:172; docs/operations/production-readiness.md:59 consistently retain owner review, deferred off-host backup and beta security/recovery blockers. | Evidence consistent |
| AC5 diagnostic disconnect | release.md:28 records remote disconnections; independent HTTPS verifier process exited normally without starting or retaining a service. Prior remote sessions were not inspectable in this read-only review. | Execution record reviewed; verifier session lifecycle satisfied |

release.md:21-24 records healthy required running services, completed migration/bucket initialization and zero published host ports. release.md:30 explicitly notes Coolify attaches its scoped network alongside the backend; it does not silently equate deployed networks with the rendered list. release.md:32 distinguishes the successfully exited migration gate from a running unhealthy service. These observations are internally consistent with readiness being healthy, but are not fresh container inspection by this verifier.

Tasks remain correctly unchecked for T3 (tasks.md:70). STATE.md:168-172, release.md:44-46 and operations documentation preserve the SMTP and beta-readiness obligations. No contradictory overall PASS or production-preflight PASS claim was found.

**Remaining required action**: operator corrects SMTP credentials directly in Coolify, then a bounded, redacted authentication check must succeed before T3/DEPLOY-02 can close. Do not expose credentials or infer SMTP success from HTTPS/readiness. Off-host backup restoration and existing beta security blockers remain separate prerequisites before beta readiness.

## Final owner progress verification — 2026-10-03

This section supersedes the pending SMTP/T3 findings above. DEPLOY-02 is **PASS for the owner progress release**. This does not establish beta readiness.

| Criterion | New evidence | Result |
| --- | --- | --- |
| AC1 public HTTPS | Fresh independent HTTP requests with normal TLS certificate validation returned 200 for `/`, `/health/live`, and `/health/ready`. Each command exited after the check. | PASS |
| AC2 bounded SMTP result | A TLS SMTP session from the deployed web container returned authentication code 235. A single direct test message returned acceptance code 250 and appeared in the designated Gmail inbox. No credentials were printed. | PASS |
| AC3 persistence | Prior Coolify inspection recorded separate resource-scoped PostgreSQL and object-storage volumes; configuration assertions passed in the independent repository check. No destructive persistence test was performed. | PASS for configured persistence |
| AC4 owner review boundary | `release.md` and `STATE.md` retain off-host backup and beta security/recovery blockers. | PASS |
| AC5 diagnostic lifecycle | The Coolify terminal was explicitly exited after the SMTP check; no diagnostic shell was left running. | PASS |

The application email path was checked separately: `POST /api/identity/confirmation-resends` returned HTTP 200 with `status: accepted`, and the matching confirmation message appeared in the designated inbox. The confirmation token is intentionally omitted. Direct SMTP acceptance, inbox receipt, and application-path receipt provide separate observations; the earlier Google 535 failure is historical. The previously completed independent repository adaptation validation remains PASS. Remote container health and volume inventory rely on the prior operator execution record rather than a fresh independent host inspection. No production preflight PASS is claimed.

## T5 independent local validation — 2026-10-03

**Scoped verdict**: PASS for local Caddy healthcheck correction. T5 runtime completion remains pending deployment and observation; this section makes no overall feature or beta-readiness claim.

Approved tasks.md T5 and design.md specify local ingress GET readiness with five-second request timeout, ten-second interval, three retries and thirty-second grace. scripts/operations/generate-coolify-compose.ts:152 adds the healthcheck; compose.coolify.yaml:154 contains its derivative. tests/integration/compose/coolify-compose.test.ts:51 asserts the entire exact object by `expect(model.services.caddy.healthcheck).toEqual({...})`, including CMD wget arguments, `/health/ready`, 10s interval, 6s Docker outer timeout, three retries and 30s start_period. No existing dependency gate, host-port isolation or credential behavior changes.

Independent focused suite: 6/6 passed, zero skipped, COMPOSE_DISABLE_ENV_FILE=true. Compose no-interpolation rendering exited 0. Existing five assertions remain intact. Caddy catch-all routes local readiness to web:3000. apps/web/src/app/health/ready/route.ts:3 exports GET; :6 returns 200 when ready and 503 otherwise. No spider/HEAD flag is present.

Static command suitability: pinned service is Caddy Alpine (compose.coolify.yaml:126). The [official Caddy Alpine Dockerfile](https://raw.githubusercontent.com/caddyserver/caddy-docker/master/2.11/alpine/Dockerfile) uses wget. [BusyBox source](https://raw.githubusercontent.com/mirror/busybox/master/networking/wget.c) accepts -q/-O/-T/-t. BusyBox accepts but ignores -t, while -T limits network timeout; Docker's six-second process timeout establishes an overall bound. Local Docker daemon is absent. Author separately reports exact command execution in the existing deployed Caddy container: readiness exit 0, nonexistent endpoint exit 1, terminal exited. That is author runtime evidence rather than independently repeated pinned-image execution.

Sensor: disposable detached worktree with copied T5 implementation/tests passed 6/6 baseline. Changing only Caddy target from `/health/ready` to `/health/live` was killed by test:51 (1 failed, 5 passed). Scratch and node_modules junction removed. Real implementation/tests were never mutated. Porcelain did change concurrently because the author staged exactly the same five T5 paths (unstaged M to staged M), and fast-forwarded the branch; therefore the strict identical-porcelain sensor isolation gate is not claimed satisfied. The recorded mutant result is useful discrimination evidence, but formal isolation confirmation needs a quiet rerun if required. This is an orchestration limitation, not an implementation defect.

No terminal/server/watcher remains running. Deployment gate: observe deployed Caddy healthcheck healthy and public HTTPS readiness before closing T5.
