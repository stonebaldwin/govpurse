# Govpurse

**[govpurse.com](https://govpurse.com)** — see exactly where your local government spends its money.

A self-serve SaaS that **aggregates local-government spending** — transaction-level
checkbook/vendor payments, budgets, and contracts — across jurisdictions and platforms, makes
it **searchable and visual**, computes **watchdog-grade analytics** (vendor concentration,
repeat sole-source winners, spending spikes, year-over-year trends), and sends **alerts**
("email me when my city pays vendor X, or when spending in category Y spikes").

Govpurse is one product of a public-data holding company. Its data-ingestion layer — **the
Core** — is built as a reusable engine so sibling products plug into the same backbone.

> **Transparency, not accusation.** Govpurse presents public financial records and clearly
> labeled **computed analysis** — it never asserts wrongdoing. Every record links back to its
> official portal with a retrieval timestamp; every derived figure (concentration, spike,
> "repeat sole-source") is labeled as analysis with the underlying transactions linked so users
> can verify. Positioned for the transparency/watchdog audience (journalists, researchers,
> gov-affairs, residents) — **not** the sell-to-government sales motion.

---

## Architecture

A **pnpm-workspace monorepo** with a deliberate split between the reusable engine and the
Govpurse product:

```
govpurse/
├── packages/
│   ├── core/  → "the Core": platform-agnostic, product-agnostic ingestion engine.
│   │           SourceAdapter framework, field-mapping, normalizer, vendor entity
│   │           resolution, spend analytics, change events, ingestion-health monitoring.
│   │           Knows NOTHING about Govpurse's UI or billing. ← siblings reuse this verbatim.
│   ├── db/    → Drizzle schema + typed Neon client. Shared by core, web, and ingest.
│   └── ui/    → the design system: tokens, primitives, and data-visualization components
│               (time-series, bar, composition/treemap, dense transaction table, vendor
│               profile). Shared by the web app and future siblings.
├── apps/
│   ├── web/   → the Govpurse Next.js app (App Router), deployed to Cloudflare Workers via
│   │           @opennextjs/cloudflare. Public jurisdiction/vendor/search pages are
│   │           edge-cached (ISR) and served from pre-aggregated rollups; the dashboard is
│   │           dynamic + authed.
│   └── ingest/→ Cloudflare Worker(s): Cron Triggers + Queues that run Core adapters on a
│               schedule, refresh rollups, and emit spend events.
└── tsconfig.base.json, eslint.config.mjs, .prettierrc  → shared tooling
```

**The boundary that matters:** `packages/core`, `packages/db`, and `packages/ui` contain no
Govpurse-specific business logic, so the next product reuses them and mostly builds new adapters
and a new front end.

## Stack

| Concern       | Choice                                                                          |
| ------------- | ------------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router) + TypeScript, **Node.js runtime**                       |
| Deployment    | Cloudflare Workers via `@opennextjs/cloudflare` (≥ 1.19)                        |
| Database      | Neon Postgres + Drizzle ORM (`drizzle-orm/neon-http`)                           |
| Auth          | Better Auth (email/password + magic link) — Phase 4                             |
| Payments      | Stripe (Checkout + Billing portal + webhooks) — Phase 5                         |
| Email         | Resend                                                                          |
| Ingestion     | Workers Cron Triggers + Queues + Browser Rendering (Puppeteer) — Phase 6        |
| Data sources  | Socrata SODA (key-less SoQL), OpenGov, generic CSV/portal                       |
| CDN / caching | Cloudflare edge in front of everything; aggressive ISR + pre-aggregated rollups |
| Styling       | Tailwind CSS v4 + a custom design system (`packages/ui`)                        |
| Charts        | Lightweight dependency-free SVG components themed on the design tokens          |

## Prerequisites

- Node.js ≥ 22, pnpm ≥ 11
- A Neon Postgres database (for DB-backed phases)
- A Cloudflare account + `wrangler login` (for preview/deploy)

## Getting started

```bash
pnpm install

# copy env templates
cp .env.example .env                 # used by db tooling (drizzle-kit)
cp .env.example apps/web/.env.local  # used by `next dev`

# run the web app (the /styleguide route needs no env or DB)
pnpm dev            # → http://localhost:3000  (try /styleguide)
```

### Common scripts (run from the repo root)

| Script                      | What it does                                 |
| --------------------------- | -------------------------------------------- |
| `pnpm dev`                  | Next.js dev server for `apps/web`            |
| `pnpm build`                | Build all packages + the web app             |
| `pnpm typecheck`            | Type-check every workspace package           |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                            |
| `pnpm test`                 | Run package tests (Vitest)                   |
| `pnpm db:generate`          | Generate a Drizzle migration from the schema |
| `pnpm db:migrate`           | Apply migrations to `DATABASE_URL`           |
| `pnpm db:studio`            | Open Drizzle Studio                          |
| `pnpm db:seed`              | Seed demo data                               |
| `pnpm --filter @govpurse/ingest bootstrap:real` | Ingest **real** Socrata spending (Kansas City, Cincinnati, Denver) |

### Deploying the web app to Cloudflare Workers

```bash
# one-time: create the R2 bucket used for the Next.js incremental (ISR) cache
wrangler r2 bucket create govpurse-inc-cache

# build + preview locally in the real Workers runtime
pnpm --filter @govpurse/web preview

# deploy
pnpm --filter @govpurse/web deploy
```

Set production secrets with `wrangler secret put DATABASE_URL` (and the others from
`.env.example`) against the `govpurse-web` Worker.

## Build status

All phases are built and verified (`pnpm typecheck`, `pnpm test`, `pnpm build`, and the
OpenNext Workers build all pass; the Socrata adapter is validated live against a real
open-checkbook portal).

0. ✅ Monorepo + design system + data-viz
1. ✅ The Core: SourceAdapter framework + field-mapping, normalizer, vendor entity resolution,
   spend analytics, change events, ingestion health (47 tests)
2. ✅ Database schema (Drizzle — 23 tables)
3. ✅ Public, cacheable front end (search + visualize + browse, SEO)
4. ✅ Auth (Better Auth) + user dashboard
5. ✅ Billing & entitlements (Stripe self-serve)
6. ✅ Scheduled ingestion + alert pipeline + admin health cockpit
7. ✅ Hardening, trust/compliance surfaces, docs

### What needs your accounts

The code builds and runs without them, degrading gracefully; wire them to go live:

- **Neon** `DATABASE_URL` — then `pnpm db:migrate`, then load data: `pnpm db:seed` (small demo) **or**
  `pnpm --filter @govpurse/ingest bootstrap:real` for **real** Socrata checkbook data (Kansas City MO,
  Cincinnati OH, Denver CO — ~500k payments). Use `INGEST_ONLY=` to pick jurisdictions.
- **Cloudflare** (`wrangler login`) — deploy both Workers; create the `govpurse-inc-cache` R2 bucket.
- **Stripe** — products/prices + webhook secret for billing.
- **Resend** — magic-link + alert emails.

## Docs

- [docs/deploying.md](docs/deploying.md) — Cloudflare + Neon deployment
- [docs/adding-a-jurisdiction.md](docs/adding-a-jurisdiction.md) — the recurring growth task (near-pure config)
- [docs/adding-an-adapter.md](docs/adding-an-adapter.md) — adding a new source platform

Adding a jurisdiction is **near-pure configuration**, not code: declare a `spend_datasets` row
(platform, portal base URL, dataset id, field mapping, cadence) and the cron / health / alert
plumbing picks it up. Prefer official APIs (Socrata SODA) over scraping; respect each portal's
ToS and rate limits.
