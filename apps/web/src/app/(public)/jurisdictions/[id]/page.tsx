import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  AnalysisBadge,
  BarChart,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DeltaBadge,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatMonth,
  formatNumber,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TimeSeriesChart,
  type BarDatum,
  type TimeSeriesPoint,
} from '@govpurse/ui';
import { getJurisdictionOverview, listJurisdictions } from '@/lib/data';
import { JsonLd } from '@/components/json-ld';

export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const jurisdictions = await listJurisdictions();
  return jurisdictions.map((j) => ({ id: j.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const overview = await getJurisdictionOverview(id);
  if (!overview) return { title: 'Jurisdiction not found' };
  const { jurisdiction, totalSpend } = overview;
  return {
    title: `${jurisdiction.name} spending`,
    description: `Explore ${jurisdiction.name} (${jurisdiction.state}) government spending — ${formatCompactCurrency(
      totalSpend,
    )} across vendors, departments, and categories.`,
    alternates: { canonical: `/jurisdictions/${id}` },
  };
}

export default async function JurisdictionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const overview = await getJurisdictionOverview(id);
  if (!overview) notFound();

  const {
    jurisdiction,
    totalSpend,
    txnCount,
    spendByPeriod,
    topDepartments,
    topVendors,
    biggestPayments,
    budgetByDepartment,
  } = overview;

  const series: TimeSeriesPoint[] = spendByPeriod.map((p) => ({
    label: formatMonth(`${p.period}-01`),
    value: p.total,
  }));
  const deptBars: BarDatum[] = topDepartments.map((d) => ({ label: d.label, value: d.total }));

  // Headline month-over-month delta.
  const last = spendByPeriod[spendByPeriod.length - 1];
  const prev = spendByPeriod[spendByPeriod.length - 2];
  const momDelta =
    last && prev && prev.total !== 0 ? (last.total - prev.total) / Math.abs(prev.total) : null;

  // Budget-vs-actual (match by normalized department name).
  const actualByDept = new Map(topDepartments.map((d) => [d.key, d.total]));
  const budgetVsActual = budgetByDepartment
    .map((b) => ({
      department: b.department,
      budgeted: b.budgeted,
      actual: actualByDept.get(b.department) ?? 0,
    }))
    .slice(0, 6);

  const site = process.env.NEXT_PUBLIC_APP_URL ?? 'https://govpurse.com';
  const pageUrl = `${site}/jurisdictions/${jurisdiction.id}`;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'GovernmentOrganization',
      name: jurisdiction.name,
      address: { '@type': 'PostalAddress', addressRegion: jurisdiction.state, addressCountry: 'US' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${jurisdiction.name} government spending`,
      description: `Transaction-level checkbook spending for ${jurisdiction.name}, ${jurisdiction.state} — ${formatNumber(
        txnCount,
      )} payments totaling ${formatCompactCurrency(totalSpend)}.`,
      creator: { '@type': 'Organization', name: 'Govpurse', url: site },
      isAccessibleForFree: true,
      url: pageUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Jurisdictions', item: `${site}/jurisdictions` },
        { '@type': 'ListItem', position: 2, name: jurisdiction.name, item: pageUrl },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <JsonLd data={structuredData} />
      <nav className="text-faint mb-4 text-xs">
        <Link href="/jurisdictions" className="hover:text-primary-700">
          Jurisdictions
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-muted">{jurisdiction.name}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary-700 font-mono text-xs font-medium uppercase tracking-[0.18em]">
            {jurisdiction.state} · {jurisdiction.type}
          </p>
          <h1 className="text-ink mt-2 text-4xl tracking-tight">{jurisdiction.name}</h1>
          <p className="text-muted mt-2 text-sm">
            <span className="text-ink font-mono font-medium tabular-nums">
              {formatNumber(txnCount)}
            </span>{' '}
            payments ·{' '}
            <span className="text-ink font-mono font-medium tabular-nums">
              {formatCompactCurrency(totalSpend)}
            </span>{' '}
            total tracked
          </p>
        </div>
        <Button asChild>
          <Link href={`/login?alert=jurisdiction:${jurisdiction.id}`}>
            <Bell className="size-4" /> Set an alert
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total spend"
          value={formatCompactCurrency(totalSpend)}
          delta={momDelta !== null ? <DeltaBadge value={momDelta} /> : undefined}
          caption={momDelta !== null ? 'vs. prior month' : undefined}
        />
        <StatCard label="Transactions" value={formatNumber(txnCount)} />
        <StatCard
          label="Top vendor"
          value={topVendors[0] ? formatCompactCurrency(topVendors[0].total) : '—'}
          caption={topVendors[0]?.label}
        />
        <StatCard
          label="Departments"
          value={formatNumber(topDepartments.length)}
          caption="with recorded spend"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spend over time</CardTitle>
          </CardHeader>
          <CardContent>
            {series.length > 1 ? (
              <TimeSeriesChart data={series} format="compactCurrency" />
            ) : (
              <p className="text-muted text-sm">Not enough data to chart yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-1">
            <div className="flex w-full items-center justify-between">
              <CardTitle>Top vendors</CardTitle>
              <AnalysisBadge
                kind="analysis"
                title="Computed analysis — operational vendor spend, excluding debt service, payroll-clearing & pension transfers."
              >
                Operational
              </AnalysisBadge>
            </div>
            <p className="text-faint text-xs">
              Excludes debt service, payroll &amp; pension transfers
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {topVendors.length === 0 ? (
              <p className="text-muted text-sm">No vendor data.</p>
            ) : (
              topVendors.slice(0, 6).map((v) => (
                <div key={v.key} className="flex items-center justify-between gap-2 text-sm">
                  {v.vendorId ? (
                    <Link
                      href={`/vendors/${v.vendorId}`}
                      className="text-ink hover:text-primary-500 truncate"
                    >
                      {v.label}
                    </Link>
                  ) : (
                    <span className="text-ink truncate">{v.label}</span>
                  )}
                  <span className="text-muted shrink-0 font-mono tabular-nums">
                    {formatCompactCurrency(v.total)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by department</CardTitle>
          </CardHeader>
          <CardContent>
            {deptBars.length ? (
              <BarChart data={deptBars} format="compactCurrency" colorByIndex />
            ) : (
              <p className="text-muted text-sm">No department data.</p>
            )}
          </CardContent>
        </Card>

        {budgetVsActual.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Budget vs. actual (FY)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead numeric>Budgeted</TableHead>
                    <TableHead numeric>Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetVsActual.map((b) => (
                    <TableRow key={b.department}>
                      <TableCell className="font-medium">{b.department}</TableCell>
                      <TableCell numeric>{formatCompactCurrency(b.budgeted)}</TableCell>
                      <TableCell numeric>{formatCompactCurrency(b.actual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Biggest recent payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Department</TableHead>
                <TableHead numeric>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {biggestPayments.map((t) => (
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
                  <TableCell className="text-muted">{t.department ?? '—'}</TableCell>
                  <TableCell numeric>{formatCurrency(t.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-faint mt-3 text-xs">
            Figures are computed from public records retrieved from the official portal. Amounts
            shown as published.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
