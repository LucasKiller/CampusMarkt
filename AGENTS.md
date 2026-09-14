# CampusMarkt Agent Guide

CampusMarkt uses spec-driven development. This file is a map, not the complete product specification.

## Read Before Changing the Product

1. Read the relevant file under `docs/product/`.
2. Read active project decisions in `.specs/STATE.md`.
3. Read the active feature's `spec.md`, `context.md`, `design.md`, and `tasks.md` under `.specs/features/`.
4. Implement only approved tasks. Trace tests to acceptance criteria.
5. Run the task gate, update task and requirement status, and commit that task atomically.
6. After the last task, require independent validation and a passing `validation.md`.

An approved spec authorizes local implementation and local commits only. It does not authorize pushes, deployments, remote database changes, or other externally visible operations.

## Sources of Truth

- [Product vision](docs/product/00-product-vision.md)
- [Domain model](docs/product/01-domain-model.md)
- [MVP scope](docs/product/02-mvp-scope.md)
- [Marketplace policy](docs/product/03-marketplace-policy.md)
- [Roadmap](docs/product/04-roadmap.md)
- [Future capabilities](docs/product/05-future-capabilities.md)
- [Project decisions and handoff](.specs/STATE.md)

An approved feature specification is authoritative for that feature. If it conflicts with a general product document, follow the feature spec and create a reconciliation task for the product document.

## Current Product Boundary

CampusMarkt V1 is a responsive, local-first marketplace for physical goods in Braunschweig.

- Anyone can browse.
- Registered users can participate in supported marketplace interactions.
- University verification is optional and acts only as a trust signal.
- Supported listing types are `SELL`, `GIVE_AWAY`, and `WANTED`.
- V1 transactions use in-person pickup without platform-held funds.

Do not implement future capabilities until an approved feature spec introduces them. This includes `SWAP`, services, housing, jobs, protected payments, handover tokens, CampusMarkt Meetup Spots, shipping, PWA-only functionality, and native mobile applications.

Do not add unused tables, columns, enum values, endpoints, feature flags, placeholder services, or unreachable UI for deferred capabilities.

## Engineering Constraints

- Keep business rules outside UI components so future web and mobile clients can share them.
- Enforce authentication, ownership, and authorization at the server or data boundary, never only in the browser.
- Enable RLS and define explicit grants and policies for every table exposed through Supabase APIs.
- Never expose secret or service-role keys in client code.
- Never commit credentials, tokens, private keys, or production configuration values.
- Keep university and primary account email addresses private.
- Use requirement-derived tests. Never weaken, delete, or skip a test to make a gate pass.

## Terminal Lifecycle

Whenever you start a terminal process to run or test code, stop it immediately after the check finishes. Do not leave development servers, watchers, local databases, or test processes running.
