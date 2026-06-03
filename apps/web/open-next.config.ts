import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

/**
 * OpenNext → Cloudflare adapter config.
 *
 * The Next.js incremental cache (ISR for the public jurisdiction / vendor /
 * search pages) is stored in the R2 bucket bound as `NEXT_INC_CACHE_R2_BUCKET`
 * in wrangler.jsonc.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
