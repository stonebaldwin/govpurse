import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { magicLink, organization } from 'better-auth/plugins';
import {
  accounts,
  createDb,
  invitations,
  members,
  organizations,
  sessions,
  users,
  verifications,
} from '@govpurse/db';
import { sendMagicLinkEmail } from './email';

// A placeholder URL keeps `createDb` from throwing at build when DATABASE_URL is
// unset; `neon()` doesn't connect until a query runs (only at request time).
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
const db = createDb(databaseUrl);

/**
 * Better Auth server instance — email/password + magic link, on the Workers
 * Node runtime (Better Auth uses Web-standard Request/Response + Web Crypto, so
 * it runs on Workers). Our schema exports are plural; Better Auth's models are
 * singular, so we remap the keys here.
 */
export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-placeholder-secret-change-in-production',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      organization: organizations,
      member: members,
      invitation: invitations,
    },
  }),
  emailAndPassword: { enabled: true },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    organization(),
    nextCookies(), // must be last
  ],
});

export type Session = typeof auth.$Infer.Session;
