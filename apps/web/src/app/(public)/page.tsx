import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, Bell, Building2, Search, TrendingUp } from 'lucide-react';
import {
  AnalysisBadge,
  Button,
  Card,
  CardContent,
  formatCompactCurrency,
  formatNumber,
} from '@govpurse/ui';
import { SearchBox } from '@/components/search-box';
import { getPlatformStats, listJurisdictions } from '@/lib/data';

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  description:
    'See exactly where your local government spends its money — search transaction-level vendor payments across jurisdictions, with watchdog-grade analytics. Free to search.',
};

const USE_CASES = [
  {
    icon: Search,
    title: 'Track a vendor',
    body: 'See every payment a government made to a company — totals, timing, and which departments.',
  },
  {
    icon: TrendingUp,
    title: 'Spot spending spikes',
    body: 'Find months or categories where spending jumped well above its trailing baseline.',
  },
  {
    icon: Building2,
    title: 'Follow a department',
    body: 'Watch a department’s spend over time, its top vendors, and budget-vs-actual.',
  },
];

const STEPS = [
  { icon: Search, label: 'Search', body: 'Find a jurisdiction, vendor, department, or category.' },
  { icon: BarChart3, label: 'Visualize', body: 'See spend over time, top vendors, and concentration.' },
  { icon: Bell, label: 'Get alerted', body: 'Be emailed when your city pays a vendor or spending spikes.' },
];

function monthLabel(period: string | null): string | null {
  if (!period) return null;
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function HomePage() {
  const [stats, jurisdictions] = await Promise.all([getPlatformStats(), listJurisdictions()]);
  const flagship = jurisdictions[0];
  const through = monthLabel(stats.latestPeriod);
  const heroStats =
    stats.payments > 0
      ? [
          { value: formatCompactCurrency(stats.totalSpend), label: 'in payments tracked' },
          { value: formatNumber(stats.payments), label: 'payments' },
          { value: formatNumber(stats.vendors), label: 'vendors' },
          {
            value: String(stats.months),
            label: through ? `months · through ${through}` : 'months tracked',
          },
        ]
      : [];

  return (
    <main>
      {/* Hero */}
      <section className="border-line relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(ellipse 75% 60% at 50% 30%, #000 35%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 75% 60% at 50% 30%, #000 35%, transparent 100%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-14 pt-20 text-center">
          <p className="text-primary-700 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em]">
            Local government spending · in the open
          </p>
          <h1 className="text-ink mt-4 text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl">
            See exactly where your local government spends its money.
          </h1>
          <p className="text-muted mx-auto mt-6 max-w-2xl text-lg leading-relaxed">
            Govpurse aggregates transaction-level checkbook spending into one searchable, visual
            record — with watchdog-grade analytics and alerts. Every figure links back to the
            official source.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <SearchBox />
          </div>
          {flagship ? (
            <p className="text-faint mt-3 text-sm">
              Free to search.{' '}
              <Link
                href={`/jurisdictions/${flagship.id}`}
                className="text-primary-700 font-medium hover:underline"
              >
                Explore {flagship.name}, {flagship.state} →
              </Link>
            </p>
          ) : (
            <p className="text-faint mt-3 text-sm">Free to search. New jurisdictions added regularly.</p>
          )}
        </div>

        {/* By the numbers */}
        {heroStats.length > 0 ? (
          <div className="border-line relative mx-auto grid max-w-4xl grid-cols-2 gap-px border-t bg-[var(--color-line)] sm:grid-cols-4">
            {heroStats.map((s) => (
              <div key={s.label} className="bg-paper px-4 py-5 text-center">
                <div className="text-ink font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                  {s.value}
                </div>
                <div className="text-muted mt-1 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* How it works */}
      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex gap-4">
            <div className="bg-primary-500 text-paper flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold shadow-sm">
              {i + 1}
            </div>
            <div>
              <div className="text-ink flex items-center gap-2 font-semibold">
                <step.icon className="text-primary-600 size-4" /> {step.label}
              </div>
              <p className="text-muted mt-1 text-sm leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Use cases */}
      <section className="border-line bg-surface/50 border-y">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-ink text-3xl tracking-tight">Killer use cases</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {USE_CASES.map((uc) => (
              <Card key={uc.title} className="shadow-card overflow-hidden">
                <div className="bg-primary-500 h-1 w-full" />
                <CardContent className="pt-6">
                  <uc.icon className="text-primary-600 size-5" />
                  <h3 className="text-ink mt-3 font-semibold">{uc.title}</h3>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">{uc.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Now tracking — flagship spotlight */}
      {flagship ? (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-end justify-between">
            <h2 className="text-ink text-3xl tracking-tight">Now tracking</h2>
            <Link
              href="/jurisdictions"
              className="text-primary-700 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              All jurisdictions <ArrowRight className="size-4" />
            </Link>
          </div>
          <Link href={`/jurisdictions/${flagship.id}`} className="group mt-6 block">
            <Card className="hover:border-primary-300 hover:shadow-lift transition-all">
              <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-faint font-mono text-xs uppercase tracking-wider">
                    {flagship.state} · {flagship.type}
                  </p>
                  <p className="text-ink group-hover:text-primary-700 mt-1 text-2xl font-semibold transition-colors">
                    {flagship.name}
                  </p>
                  <p className="text-muted mt-1 text-sm">
                    Vendor payments · {through ? `through ${through}` : 'updated regularly'}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-ink font-mono text-3xl font-semibold tabular-nums">
                    {formatCompactCurrency(flagship.total)}
                  </div>
                  <div className="text-muted text-xs">total payments tracked</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      ) : null}

      {/* Audience */}
      <section className="border-line bg-surface/50 border-y">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-ink text-3xl tracking-tight">Built for the people who follow the money</h2>
          <p className="text-muted mt-4 max-w-2xl leading-relaxed">
            Journalists, researchers, government-affairs professionals, advocacy groups, and
            residents — anyone who wants to know where the money goes, who wins repeatedly, and what
            changed. Self-serve and affordable, not a sales process.
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="flex justify-center">
          <AnalysisBadge kind="analysis" />
        </div>
        <h2 className="text-ink mt-5 text-3xl tracking-tight">Transparency, not accusation</h2>
        <p className="text-muted mx-auto mt-4 max-w-2xl leading-relaxed">
          Govpurse presents public records and clearly-labeled computed analysis — it never asserts
          wrongdoing. Every figure links to the underlying transactions and the official source so
          you can verify.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/search">Start searching</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
