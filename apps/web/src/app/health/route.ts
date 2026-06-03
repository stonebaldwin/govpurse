import { pingDb } from '@govpurse/db';

/** Always run live — this is a connectivity check, not a cached page. */
export const dynamic = 'force-dynamic';

/**
 * Health endpoint. Confirms the web Worker is up and can read the shared Neon
 * database. Returns only a COARSE status — never the underlying driver error
 * message, which can leak infrastructure detail to an unauthenticated caller.
 */
export async function GET(): Promise<Response> {
  const time = new Date().toISOString();
  let db: { status: 'connected' | 'unconfigured' | 'error' } = { status: 'unconfigured' };

  if (process.env.DATABASE_URL) {
    try {
      await pingDb(process.env.DATABASE_URL);
      db = { status: 'connected' };
    } catch (err) {
      console.error('[health] database ping failed', err);
      db = { status: 'error' };
    }
  }

  return Response.json({ ok: db.status !== 'error', service: 'govpurse-web', db, time });
}
