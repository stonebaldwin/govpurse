import Link from 'next/link';
import { ArrowRight, BarChart3, Bell, Building2, Search, TrendingUp } from 'lucide-react';
import { Button, Card, CardContent, formatCompactCurrency } from '@govpurse/ui';
import { SearchBox } from '@/components/search-box';
import { listJurisdictions } from '@/lib/data';

export const revalidate = 3600;

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

export default async function HomePage() {
  const jurisdictions = await listJurisdictions();

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
        <h1 className="text-ink text-4xl font-semibold tracking-tight sm:text-5xl">
          See exactly where your local government spends its money.
        </h1>
        <p className="text-muted mx-auto mt-5 max-w-2xl text-lg">
          Govpurse aggregates transaction-level checkbook spending, budgets, and contracts across
          jurisdictions — searchable, visual, with watchdog-grade analytics and alerts.
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBox />
        </div>
        <p className="text-faint mt-3 text-sm">
          Free to search.{' '}
          {jurisdictions.length > 0
            ? `${jurisdictions.length} jurisdictions and counting.`
            : 'New jurisdictions added regularly.'}
        </p>
      </section>

      {/* How it works */}
      <section className="border-line bg-surface/40 border-t">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-14 sm:grid-cols-3">
          {[
            {
              icon: Search,
              label: 'Search',
              body: 'Find a jurisdiction, vendor, department, or category.',
            },
            {
              icon: BarChart3,
              label: 'Visualize',
              body: 'See spend over time, top vendors, and concentration.',
            },
            {
              icon: Bell,
              label: 'Get alerted',
              body: 'Be emailed when your city pays a vendor or spending spikes.',
            },
          ].map((step, i) => (
            <div key={step.label} className="flex gap-4">
              <div className="border-line bg-surface text-primary-500 flex size-10 shrink-0 items-center justify-center rounded-full border font-mono text-sm">
                {i + 1}
              </div>
              <div>
                <div className="text-ink flex items-center gap-2 font-medium">
                  <step.icon className="size-4" /> {step.label}
                </div>
                <p className="text-muted mt-1 text-sm">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-ink text-2xl font-semibold tracking-tight">Killer use cases</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {USE_CASES.map((uc) => (
            <Card key={uc.title}>
              <CardContent className="pt-6">
                <uc.icon className="text-primary-500 size-5" />
                <h3 className="text-ink mt-3 font-medium">{uc.title}</h3>
                <p className="text-muted mt-1 text-sm">{uc.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Covered jurisdictions teaser */}
      {jurisdictions.length > 0 ? (
        <section className="border-line border-t">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="flex items-end justify-between">
              <h2 className="text-ink text-2xl font-semibold tracking-tight">
                Covered jurisdictions
              </h2>
              <Link
                href="/jurisdictions"
                className="text-primary-500 inline-flex items-center gap-1 text-sm hover:underline"
              >
                View all <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jurisdictions.slice(0, 6).map((j) => (
                <Link key={j.id} href={`/jurisdictions/${j.id}`}>
                  <Card className="hover:border-line-strong transition-colors">
                    <CardContent className="flex items-center justify-between pt-6">
                      <div>
                        <p className="text-ink font-medium">{j.name}</p>
                        <p className="text-faint text-xs uppercase">{j.state}</p>
                      </div>
                      {j.total > 0 ? (
                        <span className="text-muted font-mono text-sm tabular-nums">
                          {formatCompactCurrency(j.total)}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Audience */}
      <section className="border-line bg-surface/40 border-t">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-ink text-2xl font-semibold tracking-tight">
            Built for the people who follow the money
          </h2>
          <p className="text-muted mt-3 max-w-2xl">
            Journalists, researchers, government-affairs professionals, advocacy groups, and
            residents — anyone who wants to know where the money goes, who wins repeatedly, and what
            changed. Self-serve and affordable, not a sales process.
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-ink text-2xl font-semibold tracking-tight">
          Transparency, not accusation
        </h2>
        <p className="text-muted mt-3">
          Govpurse presents public records and clearly-labeled computed analysis — it never asserts
          wrongdoing. Every figure links to the underlying transactions and the official source so
          you can verify.
        </p>
        <div className="mt-6 flex justify-center gap-3">
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
