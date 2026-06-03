import type { MetadataRoute } from 'next';
import { listJurisdictions } from '@/lib/data';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const jurisdictions = await listJurisdictions();

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/search',
    '/jurisdictions',
    '/pricing',
    '/methodology',
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const jurisdictionRoutes: MetadataRoute.Sitemap = jurisdictions.map((j) => ({
    url: `${base}/jurisdictions/${j.id}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticRoutes, ...jurisdictionRoutes];
}
