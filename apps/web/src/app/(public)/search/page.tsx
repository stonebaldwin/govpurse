import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Download, ExternalLink, SearchX } from 'lucide-react';
import {
  Button,
  EmptyState,
  formatCurrency,
  formatDate,
  formatNumber,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@govpurse/ui';
import { CoverageRequestForm } from '@/components/coverage-request-form';
import { getFacets, searchTransactions, type SearchParams } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Search spending',
  description:
    'Search transaction-level local-government spending by vendor, department, and amount.',
};

type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s !== '' ? s : undefined;
}

function buildQuery(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | number | undefined>,
): string {
  const merged = { ...base, ...overrides };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `/search?${qs}` : '/search';
}

const fieldClass =
  'border-line-strong bg-surface text-ink h-10 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const current: Record<string, string | undefined> = {
    q: one(sp.q),
    jurisdiction: one(sp.jurisdiction),
    department: one(sp.department),
    category: one(sp.category),
    min: one(sp.min),
    max: one(sp.max),
    start: one(sp.start),
    end: one(sp.end),
    sort: one(sp.sort),
    dir: one(sp.dir),
  };

  const params: SearchParams = {
    q: current.q,
    jurisdictionId: current.jurisdiction,
    department: current.department,
    category: current.category,
    minAmount: current.min ? Number(current.min) : undefined,
    maxAmount: current.max ? Number(current.max) : undefined,
    startDate: current.start,
    endDate: current.end,
    sort: (current.sort as SearchParams['sort']) ?? 'date',
    dir: (current.dir as SearchParams['dir']) ?? 'desc',
    page: one(sp.page) ? Number(one(sp.page)) : 1,
  };

  const [result, facets] = await Promise.all([searchTransactions(params), getFacets()]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const jurName = new Map(facets.jurisdictions.map((j) => [j.id, j.name]));

  function SortHeader({
    label,
    col,
    numeric,
  }: {
    label: string;
    col: 'date' | 'vendor' | 'amount';
    numeric?: boolean;
  }) {
    const active = (params.sort ?? 'date') === col;
    const nextDir = active && params.dir === 'desc' ? 'asc' : 'desc';
    const href = buildQuery(current, { sort: col, dir: nextDir, page: undefined });
    const ariaSort = active
      ? params.dir === 'asc'
        ? ('ascending' as const)
        : ('descending' as const)
      : ('none' as const);
    return (
      <TableHead numeric={numeric} aria-sort={ariaSort}>
        <Link
          href={href}
          aria-label={`Sort by ${label.toLowerCase()}${active ? `, currently ${params.dir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
          className={`hover:text-ink inline-flex items-center gap-1 ${numeric ? 'justify-end' : ''}`}
        >
          {label}
          {active ? (
            params.dir === 'asc' ? (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            )
          ) : null}
        </Link>
      </TableHead>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-primary-700 font-mono text-xs font-medium uppercase tracking-[0.18em]">
        Search
      </p>
      <h1 className="text-ink mt-2 text-4xl tracking-tight">Search spending</h1>
      <p className="text-muted mt-3">
        Filter transaction-level payments across covered jurisdictions.
      </p>

      {/* Filters — native GET form, no client JS required. */}
      <form
        method="get"
        className="border-line bg-surface mt-6 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          name="q"
          defaultValue={current.q}
          placeholder="Vendor contains…"
          className={`${fieldClass} sm:col-span-2`}
          aria-label="Vendor search"
        />
        <select
          name="jurisdiction"
          defaultValue={current.jurisdiction ?? ''}
          className={fieldClass}
          aria-label="Jurisdiction"
        >
          <option value="">All jurisdictions</option>
          {facets.jurisdictions.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
        <select
          name="department"
          defaultValue={current.department ?? ''}
          className={fieldClass}
          aria-label="Department"
        >
          <option value="">All departments</option>
          {facets.departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          name="min"
          type="number"
          defaultValue={current.min}
          placeholder="Min $"
          className={fieldClass}
          aria-label="Minimum amount"
        />
        <input
          name="max"
          type="number"
          defaultValue={current.max}
          placeholder="Max $"
          className={fieldClass}
          aria-label="Maximum amount"
        />
        <input
          name="start"
          type="date"
          defaultValue={current.start}
          className={fieldClass}
          aria-label="Start date"
        />
        <input
          name="end"
          type="date"
          defaultValue={current.end}
          className={fieldClass}
          aria-label="End date"
        />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit">Apply filters</Button>
          <Button asChild variant="ghost">
            <Link href="/search">Reset</Link>
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-muted font-mono text-sm tabular-nums">
          {formatNumber(result.total)} transactions
        </p>
        <Button asChild variant="secondary" size="sm" title="Exporting is a Pro feature">
          <Link href="/pricing">
            <Download className="size-4" /> Export CSV · Pro
          </Link>
        </Button>
      </div>

      {result.rows.length === 0 ? (
        <div className="mt-6 space-y-6">
          <EmptyState
            icon={SearchX}
            title="No transactions found"
            description="No payments match these filters. Try widening the date or amount range — or request a jurisdiction we don't cover yet."
          />
          <div className="border-line bg-surface rounded-lg border p-4">
            <p className="text-ink text-sm font-medium">Don’t see your city or county?</p>
            <p className="text-muted mb-3 text-sm">Request it and we’ll prioritize adding it.</p>
            <CoverageRequestForm />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Date" col="date" />
                  <SortHeader label="Vendor" col="vendor" />
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Department</TableHead>
                  <SortHeader label="Amount" col="amount" numeric />
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted whitespace-nowrap font-mono">
                      {formatDate(t.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.vendorId ? (
                        <Link href={`/vendors/${t.vendorId}`} className="hover:text-primary-500">
                          {t.vendor}
                        </Link>
                      ) : (
                        t.vendor
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/jurisdictions/${t.jurisdictionId}`}
                        className="text-muted hover:text-primary-500"
                      >
                        {jurName.get(t.jurisdictionId) ?? t.jurisdictionId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted">{t.department ?? '—'}</TableCell>
                    <TableCell numeric>{formatCurrency(t.amount)}</TableCell>
                    <TableCell>
                      {t.sourceUrl ? (
                        <a
                          href={t.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open official source for ${t.vendor} (opens in new tab)`}
                          className="text-faint hover:text-primary-500 inline-flex"
                          title={
                            t.retrievedAt
                              ? `Retrieved ${formatDate(t.retrievedAt)}`
                              : 'Official source'
                          }
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted font-mono text-xs tabular-nums">
              Page {result.page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm" disabled={result.page <= 1}>
                <Link href={buildQuery(current, { page: result.page - 1 })}>Previous</Link>
              </Button>
              <Button asChild variant="secondary" size="sm" disabled={result.page >= totalPages}>
                <Link href={buildQuery(current, { page: result.page + 1 })}>Next</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
