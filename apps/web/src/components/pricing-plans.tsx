'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@govpurse/ui';
import { createCheckoutSession } from '@/lib/billing-actions';

type Interval = 'monthly' | 'annual';

interface Tier {
  name: string;
  planKey?: 'pro' | 'business';
  monthly: number;
  annual: number;
  blurb: string;
  cta: string;
  href?: string;
  featured: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    monthly: 0,
    annual: 0,
    blurb: 'Search and visualize covered spending.',
    cta: 'Get started',
    href: '/search',
    featured: false,
    features: [
      'Search & browse all covered jurisdictions',
      'Spend charts & vendor profiles',
      'A few saved views',
      'Concentration & spike analysis (view)',
    ],
  },
  {
    name: 'Pro',
    planKey: 'pro',
    monthly: 15,
    annual: 144,
    blurb: 'For journalists, researchers, and individuals.',
    cta: 'Start Pro',
    featured: true,
    features: [
      'Everything in Free',
      'Alerts: vendor paid, category spike, threshold',
      'Unlimited saved views',
      'Year-over-year analytics',
      'CSV exports',
    ],
  },
  {
    name: 'Business',
    planKey: 'business',
    monthly: 49,
    annual: 468,
    blurb: 'For gov-affairs teams, firms, and newsrooms.',
    cta: 'Start Business',
    featured: false,
    features: [
      'Everything in Pro',
      'Multi-jurisdiction watchlists',
      'Team seats',
      'API access',
      'Advanced anomaly analytics',
      'Bulk export & priority coverage',
    ],
  },
];

export function PricingPlans() {
  const [interval, setInterval] = useState<Interval>('monthly');

  return (
    <div className="mt-10">
      <div className="border-line bg-surface mx-auto flex w-fit items-center gap-1 rounded-full border p-1 text-sm">
        {(['monthly', 'annual'] as const).map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => setInterval(iv)}
            className={`rounded-full px-3 py-1 capitalize transition-colors ${
              interval === iv ? 'bg-primary-500 text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {iv}
            {iv === 'annual' ? ' · save ~20%' : ''}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const price = interval === 'monthly' ? tier.monthly : tier.annual;
          const unit = interval === 'monthly' ? '/mo' : '/yr';
          return (
            <Card
              key={tier.name}
              className={tier.featured ? 'border-primary-500 ring-primary-500/20 ring-2' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.featured ? <Badge>Most popular</Badge> : null}
                </div>
                <p className="text-muted text-sm">{tier.blurb}</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-ink font-mono text-3xl font-semibold tabular-nums">
                    ${price}
                  </span>
                  <span className="text-faint text-sm">{tier.planKey ? unit : 'forever'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {tier.planKey ? (
                  <form action={createCheckoutSession}>
                    <input type="hidden" name="plan" value={tier.planKey} />
                    <input type="hidden" name="interval" value={interval} />
                    <Button
                      type="submit"
                      className="w-full"
                      variant={tier.featured ? 'primary' : 'secondary'}
                    >
                      {tier.cta}
                    </Button>
                  </form>
                ) : (
                  <Button asChild className="w-full" variant="secondary">
                    <Link href={tier.href ?? '/search'}>{tier.cta}</Link>
                  </Button>
                )}
                <ul className="space-y-2 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="text-muted flex items-start gap-2">
                      <Check className="text-primary-500 mt-0.5 size-4 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
