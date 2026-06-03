# Adding a platform adapter

You only need a new adapter for a new **platform** (a new kind of source), not a new
jurisdiction. Today the Core ships `socrata`, `opengov`, `csv`, and a `browser` stub.

## 1. Implement `SourceAdapter`

In `packages/core/src/adapters/`, create a class implementing the interface
(`packages/core/src/adapters/types.ts`):

```ts
export class MyAdapter implements SourceAdapter {
  readonly id = 'my-platform';
  readonly platform = 'my-platform';
  readonly method = 'api'; // 'api' | 'csv' | 'browser'

  async fetchRaw(config: DatasetConfig, options?: FetchOptions): Promise<RawRow[]> {
    // Fetch + page the source into raw rows. Use resilientFetch() for timeouts,
    // retries, and typed errors. Throw PortalShapeChangedError when the source
    // shape no longer matches config (renamed columns, moved dataset) — the
    // health monitor surfaces that loudly.
  }

  normalize(raw: RawRow, config: DatasetConfig, ctx?: NormalizeContext): CanonicalRecord {
    return normalizeRecord(raw, config, ctx); // reuse the shared field-mapping normalizer
  }
}
```

Keep `fetchRaw` resilient: timeouts, bounded retries with backoff, polite rate-limiting
(`createRateLimiter`), and clear typed errors from `packages/core/src/errors.ts`.

## 2. Register it

- Add the platform to the `Platform` union in `packages/core/src/types.ts` and the zod enum in
  `config.ts`.
- Add the platform to the `platformEnum` in `packages/db/src/schema.ts` (and generate a
  migration).
- Register the instance in `packages/core/src/adapters/registry.ts`.

## 3. Test it against fixtures

Add a unit test in `packages/core/test/` that drives `fetchRaw` with an injected `fetchImpl`
returning recorded fixtures — **including a broken/changed response** — and asserts the parse
and the `PortalShapeChangedError` path. Don't hit the network in unit tests; use the live smoke
script for that.

## Browser-rendered portals

For JS-rendered portals with no API/CSV, the `browser` platform dispatches jobs to a Cloudflare
Queue consumed by a Worker with a Browser Rendering (Puppeteer) binding (see the ingest
`wrangler.jsonc`). Implement the scrape in the queue consumer and feed rows through the same
`normalize` path.
