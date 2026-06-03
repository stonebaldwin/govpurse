import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not auto-load .env; pull DATABASE_URL from the nearest one.
for (const candidate of ['.env', '../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
