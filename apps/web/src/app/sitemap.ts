import type { MetadataRoute } from 'next';
import { listJurisdictions, listSitemapVendorIds } from '@/lib/data';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://govpurse.com';
  const [jurisdictions, vendorRows] = await Promise.all([
    listJurisdictions(),
    // Fits in a single sitemap (cap 50k URLs); shard with generateSitemaps if it grows.
    listSitemapVendorIds(0, 50000),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/search',
    '/jurisdictions',
    '/pricing',
    '/methodology',
    '/terms',
    '/privacy',
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.6,
  }));

  const jurisdictionRoutes: MetadataRoute.Sitemap = jurisdictions.map((j) => ({
    url: `${base}/jurisdictions/${j.id}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const vendorRoutes: MetadataRoute.Sitemap = vendorRows.map((v) => ({
    url: `${base}/vendors/${v.id}`,
    lastModified: v.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...jurisdictionRoutes, ...vendorRoutes];
}
