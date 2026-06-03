import { createDb, type Database } from '@govpurse/db';
import type { Env } from './env';

export function getDb(env: Env): Database {
  return createDb(env.DATABASE_URL);
}

export type { Database };
