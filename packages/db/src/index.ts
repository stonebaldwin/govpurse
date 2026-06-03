import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Create a Drizzle client bound to a Neon database over HTTP.
 *
 * The neon-http driver runs over HTTPS (fetch), which is the only Postgres
 * access pattern available on the Cloudflare Workers runtime — Workers cannot
 * open raw TCP sockets.
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema, casing: 'snake_case' });
}

export type Database = ReturnType<typeof createDb>;

/** Read `DATABASE_URL` without requiring Node types (works under Workers types). */
function envDatabaseUrl(): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.DATABASE_URL;
}

let cached: Database | undefined;

/**
 * Convenience accessor that lazily builds (and memoises per isolate) a client
 * from `process.env.DATABASE_URL`. Prefer `createDb(env.DATABASE_URL)` in
 * Workers handlers where the binding is passed explicitly.
 */
export function getDb(databaseUrl: string | undefined = envDatabaseUrl()): Database {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!cached) {
    cached = createDb(databaseUrl);
  }
  return cached;
}

/**
 * Connectivity check — runs `select 1` against the database. Throws if the URL
 * is missing or the database is unreachable. Keeps `drizzle-orm` encapsulated in
 * this package so consumers (e.g. the web app's health route) don't depend on it.
 */
export async function pingDb(databaseUrl: string | undefined = envDatabaseUrl()): Promise<void> {
  const db = getDb(databaseUrl);
  await db.execute(sql`select 1 as ok`);
}

export * from './schema';
export { schema };
