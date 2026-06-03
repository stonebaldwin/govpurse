import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;

/**
 * Stripe client configured for the Cloudflare Workers runtime: a fetch-based
 * HTTP client (Workers can't use Node's http) and the SubtleCrypto provider for
 * async webhook signature verification. Null when no key is configured, so the
 * app builds and runs without Stripe.
 */
export const stripe = key ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }) : null;

export { Stripe };

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
