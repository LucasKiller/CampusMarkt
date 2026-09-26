# CampusMarkt

CampusMarkt is a responsive, local-first marketplace for physical goods in Braunschweig. Anyone can browse; registered users can list, favorite, negotiate, message, arrange local pickup, report, and block. Optional university verification is a trust signal, not an access requirement.

> Buy. Sell. Give away. Find what you need.

## Current Status

The V1 feature set has been implemented locally across Features 001–013. Feature 014 is reconciling release documentation, deployment identity, and the annual university-verification policy. The application is **not yet declared ready for private beta**: focused authentication/RPC, offer-concurrency, and disaster-recovery hardening remains recorded in [.specs/STATE.md](.specs/STATE.md).

No deployment or public production availability is implied by this repository status.

## V1 Scope

- German and English responsive web application.
- `SELL`, `GIVE_AWAY`, and `WANTED` listings for physical goods.
- Braunschweig discovery, categories, full-text search, filters, and private favorites.
- Structured purchase intent, offers, reservations, private messaging, and in-person pickup.
- Optional pseudonymous university verification, renewed every twelve calendar months.
- Reporting, bidirectional blocking, moderator workflows, and safe-meeting guidance.
- No platform-held funds, shipping, auctions, services, housing, jobs, or native mobile app in V1.

## Architecture

CampusMarkt is a TypeScript modular monolith:

- Next.js hosts the responsive web UI and same-origin Backend-for-Frontend.
- Framework-independent domain rules live in `packages/domain`.
- Self-hosted Supabase provides PostgreSQL, Auth, Storage, and Realtime.
- PostgreSQL migrations, Row Level Security, explicit grants, and transactional RPCs enforce data-boundary rules.
- Docker Compose runs the complete local stack behind Caddy and is also the production deployment model.

```text
apps/web/              Next.js UI, route handlers, and application adapters
packages/domain/       framework-independent product rules and contracts
supabase/migrations/   additive PostgreSQL schema, RLS, grants, and RPCs
supabase/tests/        persistence and authorization tests
infra/                 Compose, Caddy, Supabase, and operational configuration
tests/                 architecture and integration suites
docs/                  product knowledge and operational runbooks
.specs/features/       specifications, atomic tasks, and validation evidence
```

Versioned runtime requirements are Node.js 24 and npm 11. Container images and JavaScript dependencies are pinned in the repository.

## Local Development

Prerequisites: Node.js 24, npm 11, Docker with Compose v2, OpenSSL, and a POSIX shell such as Git Bash or WSL on Windows.

Install dependencies, copy `infra/supabase/.env.example` to an ignored root `.env`, and generate unique local secrets:

```console
npm ci
sh infra/supabase/utils/generate-keys.sh --update-env
sh infra/supabase/utils/add-new-auth-keys.sh --update-env
```

Set `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8080` and copy the generated `SUPABASE_PUBLISHABLE_KEY` into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Then validate and start the full stack:

```console
npm run env:validate
docker compose config --quiet
docker compose up --detach --wait
```

The application is available through Caddy at `http://localhost:8080`. Stop every local stack after use without deleting its named data volumes:

```console
docker compose down
```

See [Local development](docs/operations/local-development.md) for the complete setup and smoke-test procedure. Production configuration starts from `infra/compose/production.env.example`; its current editable hostname example is `campusmarkt.inovv.co`.

## Quality Gates

```console
npm run check             # typecheck, lint, format, unit, architecture, secret and docs checks
npm run build             # production Next.js build
npm run test:integration  # integration contracts
npm run test:db           # PostgreSQL migration/RLS/RPC tests
npm run verify            # complete build, stack, operations, and browser gate
```

Some complete gates require Docker. Do not leave development servers, watchers, databases, or test processes running after a check.

## Product and Delivery Documentation

Cross-feature product decisions live in:

1. [Product Vision](docs/product/00-product-vision.md)
2. [Domain Model](docs/product/01-domain-model.md)
3. [MVP Scope](docs/product/02-mvp-scope.md)
4. [Marketplace Policy](docs/product/03-marketplace-policy.md)
5. [Roadmap](docs/product/04-roadmap.md)
6. [Future Capabilities](docs/product/05-future-capabilities.md)

CampusMarkt uses the TLC spec-driven flow: approved requirements lead to atomic tasks and commits, requirement-derived tests, and independent validation. Read [AGENTS.md](AGENTS.md) before changing the product and consult [.specs/STATE.md](.specs/STATE.md) for active decisions, handoff state, and blockers.
