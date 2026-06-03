import { syncSubscription } from '@/lib/billing-sync';
import { Stripe, stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * Stripe webhook. Verifies the signature against the RAW request body (required —
 * any reserialization breaks the signature) using the SubtleCrypto provider so
 * it works on the Workers runtime, then idempotently syncs subscription state.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return new Response('Stripe is not configured', { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return new Response(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : 'error'}`,
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subRef = session.subscription;
        if (subRef) {
          const subId = typeof subRef === 'string' ? subRef : subRef.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] handler error', err);
    return new Response('Webhook handler error', { status: 500 });
  }

  return Response.json({ received: true });
}
