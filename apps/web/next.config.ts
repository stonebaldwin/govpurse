import type { NextConfig } from 'next';

/**
 * Baseline security headers applied to every response. (CSP is intentionally
 * omitted here — a correct nonce-based policy for Next's inline runtime is a
 * follow-up; these cover the high-value clickjacking / sniffing / transport
 * protections without risk of breaking the app.)
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig: NextConfig = {
  // The Core, DB, and UI packages ship as TypeScript source, compiled by the app.
  transpilePackages: ['@govpurse/core', '@govpurse/db', '@govpurse/ui'],
  // Keep the Neon driver out of the server bundle (it's pulled in by the DB layer).
  serverExternalPackages: ['@neondatabase/serverless'],
  // Explicit, stable URL policy (sitemap/canonicals use no trailing slash).
  trailingSlash: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

// Enables access to the Cloudflare bindings (env, R2, KV, …) during `next dev`.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
void initOpenNextCloudflareForDev();
