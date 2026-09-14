# Project Foundation Specification

## Problem Statement

CampusMarkt has a confirmed product direction, but its repository contains only a title and empty documentation files. The project needs a durable, navigable source of truth before application features are implemented so agents do not recreate decisions from conversational memory or introduce future scope prematurely.

## Goals

- [ ] Preserve every confirmed product, scope, safety, roadmap, and architecture decision from the planning conversation.
- [ ] Give contributors one clear route from repository entry point to product knowledge and feature specifications.
- [ ] Separate V1 behavior from future capabilities without creating speculative code.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Application source code | Each user-facing capability requires its own approved feature specification. |
| Database migrations | The foundation documents the domain; schema is introduced with the owning feature. |
| Supabase project creation | Remote infrastructure requires a later explicit implementation task. |
| Spec Kit scaffolding | TLC `.specs/` is the selected SDD system. |
| Empty feature folders | TLC artifacts are created lazily when a feature is specified. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Canonical documentation language | English | Product and code terminology already use English, and this keeps agent-facing artifacts consistent. | No, agent default |
| SDD directory convention | Use `.specs/`, not `.specify/` or `specs/` | The user explicitly selected the TLC skill for this project. | Yes |
| Technical versions | Pin current stable versions when the first code feature starts | Framework and Supabase APIs change; product documentation must not freeze stale versions. | No, agent default |
| Future feature representation | Document concepts and boundaries only | The conversation explicitly rejected unused tables, columns, states, endpoints, and interfaces. | Yes |
| Foundation boundary | Documentation and governance only | Building the whole marketplace as one feature would violate the agreed feature-by-feature SDD model. | Yes, derived from request |

**Open questions:** none - all unresolved choices are logged as explicit defaults above.

## User Stories

### P1: Understand the product and current scope

**User Story**: As a contributor, I want a complete product knowledge base so that I can make changes without relying on chat history.

**Why P1**: Every later feature depends on stable scope and domain language.

**Acceptance Criteria**:

1. WHEN a contributor opens the repository THEN the repository SHALL identify CampusMarkt, its current maturity, and the canonical documentation paths.
2. WHEN a contributor reads the product vision THEN the repository SHALL state the target users, Braunschweig focus, value proposition, access model, and local-first strategy.
3. WHEN a contributor reads the domain model THEN the repository SHALL distinguish current V1 concepts from documented future concepts.
4. WHEN a contributor reads the MVP scope THEN the repository SHALL distinguish included, deferred, and explicitly excluded capabilities.

**Independent Test**: A new contributor can explain who CampusMarkt serves, what V1 contains, and what must not be built by following links from the README.

### P1: Preserve marketplace safety and privacy decisions

**User Story**: As a product owner, I want policy and privacy boundaries recorded so that trust and safety are not treated as optional polish.

**Why P1**: Listings, accounts, verification, and local meetings all create safety and privacy obligations.

**Acceptance Criteria**:

1. WHEN a contributor reads the marketplace policy THEN the repository SHALL separate prohibited content from legitimate but unsupported content.
2. The repository SHALL state that university verification is optional, uses a separate institutional address, never exposes that address publicly, and does not control standard marketplace access.
3. The repository SHALL state that visitors can browse and that registered users can participate in supported marketplace interactions.
4. The repository SHALL state that V1 transactions use local pickup guidance without platform-held funds.

**Independent Test**: A reviewer can classify a proposed listing as allowed, prohibited, or unsupported and can explain the verification privacy boundary.

### P1: Preserve the delivery path

**User Story**: As a maintainer, I want an ordered roadmap and explicit future capability boundaries so that delivery remains incremental.

**Why P1**: The product intentionally anticipates mobile, protected payment, meetup spots, and new verticals without implementing them now.

**Acceptance Criteria**:

1. WHEN a maintainer reads the roadmap THEN the repository SHALL show the ordered path from product foundation through private beta, public beta, PWA, protected payments, and native mobile.
2. WHEN a maintainer reads future capabilities THEN the repository SHALL describe SERVICES, HOUSING, JOBS, SWAP, MOVING_OUT, CAMPUSMARKT_MEETUP_SPOTS, PROTECTED_PAYMENT, and handover confirmation as deferred.
3. The repository SHALL state that a future QR code and numeric code are two representations of one secure handover token.
4. The repository SHALL state that a future payment provider controls regulated money movement while CampusMarkt controls marketplace state.

**Independent Test**: A maintainer can place any discussed capability into the current MVP or a named later horizon without adding dormant code.

### P2: Guide future agents

**User Story**: As a coding agent, I want concise repository instructions so that I load only the relevant product and feature context.

**Why P2**: A small navigation guide reduces stale duplicated requirements.

**Acceptance Criteria**:

1. WHEN an agent reads `AGENTS.md` THEN the repository SHALL direct it to product documents, `.specs/STATE.md`, and the active feature artifacts.
2. The repository SHALL require spec-first delivery, requirement-linked tests, local-only implementation authority, and termination of test terminals or development processes after use.

**Independent Test**: An agent can identify the source of truth and the next required SDD action without reading the original conversation.

## Edge Cases

- IF a future capability is mentioned in a product document THEN the repository SHALL label it as deferred and SHALL prohibit speculative implementation.
- IF a product document conflicts with an approved feature specification THEN the repository SHALL define the approved feature specification as authoritative for that feature.
- IF a university verification expires THEN the repository SHALL state that only the badge is lost and standard account access remains unchanged.
- IF protected payment lacks an approved provider THEN the repository SHALL leave provider-specific behavior unspecified.

## Implicit Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation and bounds | N/A because this feature creates documentation only. |
| Failure and partial-failure states | Broken or empty documentation is rejected by the final integrity gate. |
| Idempotency, retry, and duplicate handling | Re-running validation is read-only and repeatable. |
| Auth boundaries and rate limits | Documented as product requirements; implementation belongs to later feature specs. |
| Concurrency and ordering | N/A because no runtime state is introduced. |
| Data lifecycle and expiry | University verification expiry and future token expiry are documented; exact implementation belongs to their features. |
| Observability | N/A because no runtime system is introduced. |
| External-dependency failure | Supabase and payment-provider failures are deferred to owning feature specs. |
| State-transition integrity | Current and future states are separated; exact transitions belong to listing, offer, reservation, and transaction specs. |

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PFND-01 | P2: Guide future agents | Implementing | Implementing |
| PFND-02 | P1: Understand product and scope | Implementing | Implementing |
| PFND-03 | P1: Understand product and scope | Implementing | Implementing |
| PFND-04 | P1: Understand product and scope | Implementing | Implementing |
| PFND-05 | P1: Preserve safety and privacy | Implementing | Implementing |
| PFND-06 | P1: Preserve delivery path | Implementing | Implementing |
| PFND-07 | P1: Preserve delivery path | Tasks | In Tasks |
| PFND-08 | P1: Understand product and scope | Implementing | Implementing |

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped.

## Success Criteria

- [ ] All eight required repository and product documents exist and contain substantive content.
- [ ] Every confirmed conversation decision appears in one authoritative document.
- [ ] The spec and task validators finish with zero errors.
- [ ] Repository Markdown passes whitespace and required-file integrity checks.
