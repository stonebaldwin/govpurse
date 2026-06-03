import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Core, DB, and UI packages ship as TypeScript source, compiled by the app.
  transpilePackages: ['@govpurse/core', '@govpurse/db', '@govpurse/ui'],
  // Keep the Neon driver out of the server bundle (it's pulled in by the DB layer).
  serverExternalPackages: ['@neondatabase/serverless'],
};

export default nextConfig;

// Enables access to the Cloudflare bindings (env, R2, KV, …) during `next dev`.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
void initOpenNextCloudflareForDev();
