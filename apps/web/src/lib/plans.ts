import type { Plan } from './entitlements';

export type Interval = 'monthly' | 'annual';

const PRICE_IDS: Record<'pro' | 'business', Record<Interval, string | undefined>> = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
  },
};

/** Stripe price id for a paid plan + interval (undefined if not configured). */
export function priceFor(plan: string, interval: Interval): string | undefined {
  if (plan !== 'pro' && plan !== 'business') return undefined;
  return PRICE_IDS[plan][interval];
}

/** Reverse-map a Stripe price id to a plan (defaults to free). */
export function planForPrice(priceId: string | null | undefined): Plan {
  if (!priceId) return 'free';
  for (const plan of ['pro', 'business'] as const) {
    for (const interval of ['monthly', 'annual'] as const) {
      if (PRICE_IDS[plan][interval] === priceId) return plan;
    }
  }
  return 'free';
}

/** Display prices (USD). Annual ≈ 20% off. */
export const PRICING: Record<'pro' | 'business', { monthly: number; annual: number }> = {
  pro: { monthly: 15, annual: 144 },
  business: { monthly: 49, annual: 468 },
};
