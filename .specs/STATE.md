# CampusMarkt State

## Decisions

### AD-001
- **Decision**: CampusMarkt will use `.specs/` as its only feature-delivery system and `docs/` as its durable product knowledge base.
- **Reason**: The TLC workflow provides specification, design, task, validation, memory, and traceability artifacts without maintaining a second SDD framework in parallel.
- **Trade-off**: The repository will not use the previously suggested Spec Kit `.specify/` and `specs/` structure.
- **Scope**: All product and engineering work.
- **Date**: 2026-09-14
- **Status**: active

### AD-002
- **Decision**: The first client will be a responsive Next.js web application backed by Supabase Auth, PostgreSQL, Storage, and Realtime where a feature requires it.
- **Reason**: This stack supports a fast web launch with authentication, relational data, media, and realtime messaging while keeping infrastructure small.
- **Trade-off**: The product accepts managed-platform coupling and must track Supabase API changes.
- **Scope**: Web, authentication, data, media, and messaging features.
- **Date**: 2026-09-14
- **Status**: active

### AD-003
- **Decision**: Marketplace rules will live outside page components behind application and domain boundaries that a future mobile client can reuse.
- **Reason**: The roadmap moves from responsive web to PWA and later to Expo/React Native without rewriting core rules.
- **Trade-off**: The initial repository has more explicit package boundaries than a single Next.js application.
- **Scope**: Listings, offers, reservations, transactions, verification, messaging, and moderation.
- **Date**: 2026-09-14
- **Status**: active

### AD-004
- **Decision**: CampusMarkt will own marketplace and transaction state, while a future regulated marketplace-payment provider will own payment processing and custody.
- **Reason**: This preserves a safe legal and architectural boundary for protected payments.
- **Trade-off**: Provider-specific payment behavior remains undecided until the protected-payment feature is specified.
- **Scope**: Offers, reservations, transactions, protected payment, handover, refunds, and disputes.
- **Date**: 2026-09-14
- **Status**: active

### AD-005
- **Decision**: Future verticals, listing types, payment states, and meetup capabilities will be documented but will not appear as dormant production code or unreachable database states.
- **Reason**: The architecture must evolve without speculative implementation.
- **Trade-off**: Each future capability requires an explicit schema and domain change when approved.
- **Scope**: All schemas, APIs, domain models, and user interfaces.
- **Date**: 2026-09-14
- **Status**: active

### AD-006
- **Decision**: CampusMarkt will start as a TypeScript modular monolith in which Next.js hosts the responsive UI and server-side application layer, while a self-hosted Supabase stack provides PostgreSQL, Auth, Storage, and Realtime; Docker Compose will coordinate the complete deployable stack behind an HTTPS reverse proxy.
- **Reason**: A single language and deployment unit reduce MVP complexity, preserve explicit domain boundaries for a future mobile client, and allow the existing VPS to run the application and its supporting services reproducibly.
- **Trade-off**: Self-hosting avoids dependence on the managed Supabase service but makes CampusMarkt responsible for updates, hardening, SMTP, monitoring, backups, recovery, and VPS capacity.
- **Scope**: Repository structure, application runtime, local development, production deployment, data, authentication, media, and realtime features.
- **Date**: 2026-09-14
- **Status**: active

## Handoff

- **Feature**: project-foundation / `.specs/features/project-foundation/`
- **Phase / Task**: Complete; third independent verification passed
- **Completed**: T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12
- **In-progress** (file:line): none
- **Next step**: Specify `001-web-supabase-foundation` before creating application code or runtime directories.
- **Blockers**: none; final validation is PASS
- **Uncommitted files**: none after the validation closure commit
- **Branch**: main
