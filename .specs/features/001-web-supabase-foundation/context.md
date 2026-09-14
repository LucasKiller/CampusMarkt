# Web and Supabase Foundation Context

**Gathered:** 2026-09-14
**Spec:** `.specs/features/001-web-supabase-foundation/spec.md`
**Status:** Approved for implementation

---

## Feature Boundary

This feature creates the reproducible, secure, deployable foundation for later CampusMarkt features. It does not implement accounts, listings, marketplace workflows, or a remote VPS deployment.

---

## Implementation Decisions

### Application architecture

- Use TypeScript end to end.
- Start as a modular monolith.
- Next.js hosts both the responsive UI and its server-side application layer.
- Domain and application rules do not live in page components.
- Do not create a separate NestJS service for the MVP foundation.

### Infrastructure and deployment

- Self-host Supabase rather than requiring a managed Supabase account.
- Coordinate the web application, reverse proxy, database, Auth, REST, Realtime, Storage, and required support services through a root Docker Compose workflow.
- Target a single Linux VPS initially.
- Require HTTPS at the public production boundary.
- Keep internal database and service ports off the public interface.
- Vendor the pinned official Supabase self-hosted release under `infra/supabase/` and integrate it through CampusMarkt-owned Compose overrides instead of rewriting the upstream stack.

### Persistence and operations

- Use persistent Docker volumes locally.
- Treat volumes as persistence, not backups.
- Require backups to leave the primary VPS for production readiness.
- Keep external SMTP and S3-compatible Storage provider choices configurable and undecided.
- Pin compatible application dependencies and Supabase self-hosted releases.

### Agent's Discretion

- Exact supported current Node.js package versions, selected from official documentation during design and pinned in lockfiles.
- Exact workspace, test runner, lint, formatting, and reverse-proxy tools, provided they satisfy the specification and remain simple.
- Exact internal module names and health-check implementation.

### Declined / Undiscussed Gray Areas -> Assumptions

- Local development uses loopback HTTP; production requires HTTPS.
- A minimal bilingual-ready shell is enough; polished product visual design is deferred.
- The production contract supports external SMTP and S3-compatible Storage without choosing vendors in this feature.
- High availability, replicas, and multi-node orchestration are out of scope for the single-VPS MVP.

---

## Deferred Ideas

- A separately deployed TypeScript API if mobile, public API, job processing, or independent scaling creates evidence for it.
- Managed Supabase as a future operational alternative.
- Kubernetes or another multi-node orchestrator.
