'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { subscriptions } from '@govpurse/db';
import { ensureStripeCustomer } from './billing-sync';
import { tryGetDb } from './db';
import { type Interval, priceFor } from './plans';
import { getUser } from './session';
import { appUrl, stripe } from './stripe';

/** Create a Stripe Checkout session for a plan upgrade and redirect to it. */
export async function createCheckoutSession(formData: FormData): Promise<void> {
  const user = await getUser();
  const plan = String(formData.get('plan') ?? '');
  const interval: Interval = String(formData.get('interval')) === 'annual' ? 'annual' : 'monthly';

  if (!user) redirect(`/login?next=${encodeURIComponent('/pricing')}`);
  if (!stripe) redirect('/pricing?error=billing-unavailable');
  const priceId = priceFor(plan, interval);
  if (!priceId) redirect('/pricing?error=price-unavailable');

  const customerId = await ensureStripeCustomer(user);
  if (!customerId) redirect('/pricing?error=billing-unavailable');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/dashboard/account?upgraded=1`,
    cancel_url: `${appUrl()}/pricing`,
    client_reference_id: user.id,
    subscription_data: { metadata: { userId: user.id, plan } },
    allow_promotion_codes: true,
  });

  redirect(session.url ?? '/pricing');
}

/** Open the Stripe Billing customer portal for self-serve plan management. */
export async function openBillingPortal(): Promise<void> {
  const user = await getUser();
  if (!user) redirect('/login?next=/dashboard/account');
  if (!stripe) redirect('/pricing');
  const db = tryGetDb();
  if (!db) redirect('/pricing');

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);
  if (!sub?.stripeCustomerId) redirect('/pricing');

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl()}/dashboard/account`,
  });
  redirect(session.url);
}
