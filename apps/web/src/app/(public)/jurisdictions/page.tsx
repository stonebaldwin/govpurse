import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';
import { Card, CardContent, EmptyState, formatCompactCurrency } from '@govpurse/ui';
import { listJurisdictions } from '@/lib/data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Covered jurisdictions',
  description: 'Browse local and state governments whose spending Govpurse has aggregated.',
};

export default async function JurisdictionsPage() {
  const jurisdictions = await listJurisdictions();
  const totalTracked = jurisdictions.reduce((sum, j) => sum + j.total, 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-primary-700 font-mono text-xs font-medium uppercase tracking-[0.18em]">
        Coverage
      </p>
      <h1 className="text-ink mt-2 text-4xl tracking-tight">Covered jurisdictions</h1>
      <p className="text-muted mt-3">
        {jurisdictions.length > 0 ? (
          <>
            <span className="text-ink font-mono font-medium tabular-nums">
              {jurisdictions.length}
            </span>{' '}
            governments ·{' '}
            <span className="text-ink font-mono font-medium tabular-nums">
              {formatCompactCurrency(totalTracked)}
            </span>{' '}
            in payments tracked. Pick one to explore.
          </>
        ) : (
          'Pick a government to explore its spending.'
        )}
      </p>

      {jurisdictions.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Building2}
            title="No jurisdictions yet"
            description="Connect a database and ingest a spend dataset to begin."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jurisdictions.map((j) => (
            <Link key={j.id} href={`/jurisdictions/${j.id}`} className="group">
              <Card className="hover:border-primary-300 hover:shadow-lift h-full overflow-hidden transition-all">
                <div className="bg-primary-500 h-1 w-full" />
                <CardContent className="flex h-full flex-col pt-6">
                  <p className="text-faint font-mono text-[0.7rem] uppercase tracking-wider">
                    {j.state} · {j.type}
                  </p>
                  <p className="text-ink group-hover:text-primary-700 mt-1 text-lg font-semibold transition-colors">
                    {j.name}
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <div className="text-ink font-mono text-xl font-semibold tabular-nums">
                        {j.total > 0 ? formatCompactCurrency(j.total) : '—'}
                      </div>
                      <div className="text-faint text-xs">tracked</div>
                    </div>
                    <ArrowRight className="text-faint group-hover:text-primary-600 size-4 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
