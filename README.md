# CampusMarkt

CampusMarkt is a local-first marketplace for buying, selling, giving away, and finding physical goods in Braunschweig. It starts with the student community around TU Braunschweig and remains open to everyone: visitors can browse, registered users can participate, and optional university verification adds a trust signal.

> Buy. Sell. Give away. Find what you need.

## Project Status

The repository is in its product-foundation stage. Product decisions, boundaries, and delivery rules are documented. Application source code, database migrations, and remote infrastructure have not been created yet; they will be delivered feature by feature from approved specifications.

## V1 at a Glance

- Responsive web application in German and English.
- Physical goods with `SELL`, `GIVE_AWAY`, and `WANTED` listings.
- Local discovery across Braunschweig, categories, search, filters, and favorites.
- Structured purchase intent and offers, reservations, messaging, and local pickup.
- Optional university verification using an institutional email separate from the primary account email.
- Reporting, blocking where specified, basic moderation, and safe-meeting guidance.
- No platform-held funds, shipping, auctions, services, housing, jobs, or native mobile app in V1.

## Product Documentation

Read these documents in order when making cross-feature product decisions:

1. [Product Vision](docs/product/00-product-vision.md)
2. [Domain Model](docs/product/01-domain-model.md)
3. [MVP Scope](docs/product/02-mvp-scope.md)
4. [Marketplace Policy](docs/product/03-marketplace-policy.md)
5. [Roadmap](docs/product/04-roadmap.md)
6. [Future Capabilities](docs/product/05-future-capabilities.md)

Project-wide architectural decisions and the latest handoff live in [.specs/STATE.md](.specs/STATE.md). The current foundation feature is defined in [.specs/features/project-foundation/spec.md](.specs/features/project-foundation/spec.md).

## Delivery Model

CampusMarkt uses the TLC spec-driven flow:

```text
Product knowledge
      |
      v
Feature specification -> Context -> Design -> Atomic tasks
                                             |
                                             v
                                      Code and tests
                                             |
                                             v
                                  Independent validation
```

Significant behavior is never implemented directly from an informal request. Each feature receives acceptance criteria, requirement IDs, tests derived from those criteria, atomic local commits, and a persisted validation report.

## Target Architecture

The planned first client is a responsive Next.js web application. Supabase will provide PostgreSQL, Auth, Storage, and Realtime where an approved feature needs them. Application and domain rules stay outside page components so a later Expo/React Native client can reuse the same capabilities.

Exact framework and package versions will be selected from current official documentation and pinned when the first code feature begins.

```text
apps/
  web/                  Next.js responsive web client
packages/
  domain/               framework-independent marketplace rules
  validation/           shared input and contract schemas
  api-client/           client-facing application contracts
  types/                shared transport types when justified
supabase/                local configuration and migrations, when introduced
docs/product/            durable cross-feature product knowledge
.specs/features/         feature specifications and delivery evidence
```

These code directories are a target shape, not empty scaffolding. They will be created only when an approved task needs them.

## Contributing

Start with [AGENTS.md](AGENTS.md). It defines the repository reading order, scope guardrails, security baseline, local-only implementation authority, and terminal lifecycle rule.
