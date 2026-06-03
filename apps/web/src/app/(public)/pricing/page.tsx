import type { Metadata } from 'next';
import { PricingPlans } from '@/components/pricing-plans';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Free to search. Pro and Business plans add alerts, exports, watchlists, and API access.',
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-ink text-3xl font-semibold tracking-tight">
          Simple, self-serve pricing
        </h1>
        <p className="text-muted mx-auto mt-3 max-w-xl">
          Free to search. Upgrade for alerts, exports, watchlists, and API access. No sales calls —
          manage everything yourself.
        </p>
      </div>

      <PricingPlans />

      <p className="text-faint mt-10 text-center text-xs">
        Public financial records are free to view. Paid plans fund coverage and the analytics
        engine.
      </p>
    </main>
  );
}
