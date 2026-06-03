# Deploying to Cloudflare

Two Workers: `govpurse-web` (the Next.js app via OpenNext) and `govpurse-ingest` (the cron runner).
Both use the Neon database.

## Prerequisites

- `wrangler login`
- A Neon Postgres database (pooled connection string)
- A Resend account + Stripe account (for full functionality)

## 1. Database

```bash
cp .env.example .env
# set DATABASE_URL (pooled) in .env
pnpm db:migrate     # apply the schema
pnpm db:seed        # optional: demo data so pages render
```

## 2. Web app (`govpurse-web`)

```bash
# one-time: R2 bucket for the Next.js incremental (ISR) cache
wrangler r2 bucket create govpurse-inc-cache

# build + preview locally in the real Workers runtime
pnpm --filter @govpurse/web preview

# deploy
pnpm --filter @govpurse/web deploy
```

Set production secrets against the `govpurse-web` Worker:

```bash
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put RESEND_API_KEY
# plus STRIPE_PRICE_* and OPERATOR_EMAILS as needed
```

Point the Stripe webhook at `https://<your-domain>/api/stripe/webhook` and copy its signing
secret into `STRIPE_WEBHOOK_SECRET`.

## 3. Ingest worker (`govpurse-ingest`)

```bash
cd apps/ingest
wrangler secret put DATABASE_URL
wrangler secret put SOCRATA_APP_TOKEN     # optional, raises SODA limits
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM_EMAIL
wrangler secret put OPERATOR_ALERT_EMAIL
wrangler secret put APP_URL
pnpm --filter @govpurse/ingest deploy
```

The cron (daily) is configured in `wrangler.jsonc`; per-dataset `cadence` gates actual runs. To
enable JS-rendered (`browser`) portals, provision a Queue and Browser Rendering binding (see the
commented config in `apps/ingest/wrangler.jsonc`; requires the Workers Paid plan).

## Notes

- Everything is fronted by Cloudflare's edge; public jurisdiction/vendor/search pages are
  ISR-cached and served from pre-aggregated `spend_aggregates` rollups, never recomputed per
  request.
- `compatibility_date` and `nodejs_compat` are pinned in each `wrangler.jsonc`. Re-check the
  current OpenNext + Cloudflare docs when bumping the adapter.
