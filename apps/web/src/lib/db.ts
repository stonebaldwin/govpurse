import { getDb, type Database } from '@govpurse/db';

/** True when a database connection string is configured. */
export const DB_CONFIGURED = Boolean(process.env.DATABASE_URL);

/**
 * Get a DB client, or null when `DATABASE_URL` is unset. The data layer uses
 * this to degrade gracefully (empty results + honest empty states) so the app
 * builds and renders before a database is connected.
 */
export function tryGetDb(): Database | null {
  if (!process.env.DATABASE_URL) return null;
  try {
    return getDb(process.env.DATABASE_URL);
  } catch {
    return null;
  }
}

/** Coerce a Postgres `numeric` (returned as a string) to a number. */
export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
