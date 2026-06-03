import { eq } from 'drizzle-orm';
import { subscriptions } from '@govpurse/db';
import { tryGetDb } from './db';
import { planForPrice } from './plans';
import type { SessionUser } from './session';
import { type Stripe, stripe } from './stripe';

type SubStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid';

function mapStatus(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'unpaid':
      return 'unpaid';
    default:
      return 'incomplete'; // incomplete, paused, …
  }
}

/**
 * Read the current-period-end without coupling to a specific Stripe API version
 * (it moved from the subscription to its items in the 2025 API).
 */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const s = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const unix = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return typeof unix === 'number' ? new Date(unix * 1000) : null;
}

/** Find or create the Stripe customer for a user and persist the id. */
export async function ensureStripeCustomer(user: SessionUser): Promise<string | null> {
  if (!stripe) return null;
  const db = tryGetDb();
  if (!db) return null;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  if (existing) {
    await db
      .update(subscriptions)
      .set({ stripeCustomerId: customer.id })
      .where(eq(subscriptions.userId, user.id));
  } else {
    await db
      .insert(subscriptions)
      .values({ userId: user.id, stripeCustomerId: customer.id, plan: 'free', status: 'active' })
      .onConflictDoNothing();
  }
  return customer.id;
}

/** Idempotently sync a Stripe subscription into our `subscriptions` table. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const db = tryGetDb();
  if (!db) return;

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price.id ?? null;
  const status = mapStatus(sub.status);
  const plan = status === 'canceled' ? 'free' : planForPrice(priceId);
  const fields = {
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    plan,
    status,
    currentPeriodEnd: periodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  };

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set(fields)
      .where(eq(subscriptions.stripeCustomerId, customerId));
  } else {
    const userId = typeof sub.metadata?.userId === 'string' ? sub.metadata.userId : undefined;
    if (userId) {
      await db
        .insert(subscriptions)
        .values({ userId, stripeCustomerId: customerId, ...fields })
        .onConflictDoNothing();
    }
  }
}
