# Coolify Deployment Specification

**Status:** Approved by the operator on 2026-10-02; owner progress deployment verified on 2026-10-03. Beta readiness remains pending.

## Problem Statement

The production branch is configured in Coolify, but its parser only discovers services in the root Compose file. Included Supabase services, their variables, and deployment isolation need an explicit integration before CampusMarkt can run on the VPS.

## Goals

- [x] Deploy the existing V1 application from `production` on the existing Coolify resource.
- [x] Keep all database, administration, and storage services private.
- [x] Use the operator's Google SMTP configuration without exposing credentials.

## Out of Scope

| Feature | Reason |
| --- | --- |
| New marketplace functionality | This request concerns installation only. |
| Development deployment on the VPS | Only production was requested. |
| Paid external services | No purchase was authorized. |
| Off-host backup provisioning | Deferred for progress review; required before real-user beta. |
| Production-readiness PASS | Existing hardening and recovery blockers remain. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Branches | `development` is the default; the existing VPS resource deploys `production`. | Operator confirmed the existing resource is production. | yes |
| Hostname | `campusmarkt.inovv.co` | Existing repository hostname resolves to the VPS. | assumed |
| Supabase | Isolated self-hosted services using the vendored release. | Operator explicitly requested the complete isolated stack. | yes |
| SMTP | Existing Google SMTP values in Coolify, TLS on port 465. | Operator supplied the configuration in the panel. | yes |
| Storage | Private on-VPS S3-compatible backend with a persistent volume. | Operator requested provisioning; no external storage account exists. | assumed |
| Backup | Defer external backup while the owner reviews progress. | Operator asked to configure it later; this does not establish beta readiness. | yes |
| Source generation | Generate a flattened deployment artifact from the upstream Compose model, without editing vendored files. | Coolify cannot discover the included services. | yes |

**Open questions:** none; deployment defaults are explicit above.

## User Stories

### P1: Reproducible Coolify configuration

**User Story:** As the operator, I want Coolify to discover the complete existing platform so that production deployments remain reproducible from Git.

**Acceptance Criteria:**

1. WHEN the deployment artifact is generated THEN the system SHALL include web, Caddy, database, Auth, REST, Realtime, Storage, the API gateway, and the migration gate.
2. The deployment artifact SHALL contain no `include` sections and SHALL preserve the vendored configuration files unchanged.
3. The deployment artifact SHALL publish no database, Studio, gateway, or object-storage host ports.
4. The deployment artifact SHALL use a resource-scoped network and volumes without globally fixed Supabase container names.
5. WHEN the web service starts THEN the system SHALL wait for the migration gate to complete successfully.
6. The deployment artifact SHALL keep database, SMTP, service-role, and object-storage secrets out of browser variables and tracked files.

**Independent Test:** Generate the artifact without interpolation, render it with Docker Compose, and inspect its services, dependencies, networks, ports, and credential references.

### P1: Owner progress deployment

**User Story:** As the owner, I want the production branch installed on the existing VPS so that I can review the current implementation.

**Acceptance Criteria:**

1. WHEN the deployment finishes THEN the system SHALL serve `/`, `/health/live`, and `/health/ready` over valid HTTPS with HTTP 200 responses.
2. WHEN SMTP authentication is checked THEN the system SHALL report only success or a bounded redacted failure.
3. The system SHALL persist PostgreSQL data and uploaded objects in distinct named volumes.
4. WHILE off-host backup is absent THEN the release record SHALL identify the deployment as owner progress review with beta readiness pending.
5. WHEN a diagnostic terminal session finishes THEN the operator SHALL disconnect that session without stopping the intended deployed services.

**Independent Test:** Observe successful Coolify deployment, check HTTPS and readiness, authenticate to SMTP without sending email, and inspect persistent volumes and the release record.

## Edge Cases

- IF a referenced bind file is absent THEN deployment verification SHALL fail rather than report the stack healthy.
- IF required generated secrets are missing THEN configuration verification SHALL fail before startup.
- IF a required service is unhealthy THEN the deployment SHALL remain incomplete in the release record.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DEPLOY-01 | Reproducible Coolify configuration | Execute | Verified |
| DEPLOY-02 | Owner progress deployment | Validate | Verified |

## Success Criteria

- [x] Complete Compose artifact and requirement-derived checks pass.
- [x] Independent verification of the repository adaptation passes.
- [x] The production VPS serves the application and its readiness endpoint over HTTPS.
- [x] External backup and beta-hardening gaps are explicitly retained.


