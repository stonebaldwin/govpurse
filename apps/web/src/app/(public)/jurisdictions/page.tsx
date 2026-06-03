import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Card, CardContent, EmptyState, formatCompactCurrency } from '@govpurse/ui';
import { listJurisdictions } from '@/lib/data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Covered jurisdictions',
  description: 'Browse local and state governments whose spending Govpurse has aggregated.',
};

export default async function JurisdictionsPage() {
  const jurisdictions = await listJurisdictions();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-ink text-3xl font-semibold tracking-tight">Covered jurisdictions</h1>
      <p className="text-muted mt-2">Pick a government to explore its spending.</p>

      {jurisdictions.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Building2}
            title="No jurisdictions yet"
            description="Connect a database and run `pnpm db:seed`, or configure a spend dataset to begin."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jurisdictions.map((j) => (
            <Link key={j.id} href={`/jurisdictions/${j.id}`}>
              <Card className="hover:border-line-strong h-full transition-colors">
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="text-ink font-medium">{j.name}</p>
                    <p className="text-faint text-xs uppercase">
                      {j.state} · {j.type}
                    </p>
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
      )}
    </main>
  );
}
