import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AnalysisBadge,
  BarChart,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatMonth,
  formatNumber,
  formatPercent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TimeSeriesChart,
  VendorProfile,
  type BarDatum,
  type TimeSeriesPoint,
} from '@govpurse/ui';
import { getVendorProfile } from '@/lib/data';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getVendorProfile(id);
  if (!data) return { title: 'Vendor not found' };
  return {
    title: `${data.vendor.canonicalName} — government payments`,
    description: `How much governments paid ${data.vendor.canonicalName}: ${formatCompactCurrency(
      data.totalPaid,
    )} across ${data.byJurisdiction.length} jurisdiction(s) and ${formatNumber(data.txnCount)} payments.`,
  };
}

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getVendorProfile(id);
  if (!data) notFound();

  const {
    vendor,
    totalPaid,
    txnCount,
    byJurisdiction,
    spendByPeriod,
    byDepartment,
    recentTransactions,
    concentration,
  } = data;

  const series: TimeSeriesPoint[] = spendByPeriod.map((p) => ({
    label: formatMonth(`${p.period}-01`),
    value: p.total,
  }));
  const deptBars: BarDatum[] = byDepartment.map((d) => ({ label: d.label, value: d.total }));
  const location = [vendor.city, vendor.state].filter(Boolean).join(', ');

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <VendorProfile
        name={vendor.canonicalName}
        meta={
          <>
            {location ? `${location} · ` : ''}resolved across {byJurisdiction.length} jurisdiction
            {byJurisdiction.length === 1 ? '' : 's'}
            {vendor.matchConfidence < 1
              ? ` · match confidence ${formatPercent(vendor.matchConfidence)}`
              : ''}
          </>
        }
        badges={
          concentration ? (
            <AnalysisBadge
              kind="concentration"
              title="Computed analysis — share of the jurisdiction's total spend."
            >
              {formatPercent(concentration.share)} of {concentration.jurisdictionName}
            </AnalysisBadge>
          ) : null
        }
        stats={[
          {
            label: 'Total paid',
            value: formatCompactCurrency(totalPaid),
            caption: 'all jurisdictions',
          },
          { label: 'Payments', value: formatNumber(txnCount) },
          { label: 'Jurisdictions', value: formatNumber(byJurisdiction.length) },
          {
            label: 'Top department',
            value: byDepartment[0] ? formatCompactCurrency(byDepartment[0].total) : '—',
            caption: byDepartment[0]?.label,
          },
        ]}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Paid over time</CardTitle>
            </CardHeader>
            <CardContent>
              {series.length > 1 ? (
                <TimeSeriesChart
                  data={series}
                  format="compactCurrency"
                  colorIndex={1}
                  height={220}
                />
              ) : (
                <p className="text-muted text-sm">Not enough data to chart yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By department</CardTitle>
            </CardHeader>
            <CardContent>
              {deptBars.length ? (
                <BarChart data={deptBars} format="compactCurrency" colorByIndex />
              ) : (
                <p className="text-muted text-sm">No department data.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {byJurisdiction.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>By jurisdiction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {byJurisdiction.map((j) => (
                <div key={j.jurisdictionId} className="flex items-center justify-between text-sm">
                  <Link
                    href={`/jurisdictions/${j.jurisdictionId}`}
                    className="text-ink hover:text-primary-500"
                  >
                    {j.name}
                  </Link>
                  <span className="text-muted font-mono tabular-nums">
                    {formatCompactCurrency(j.total)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead numeric>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted whitespace-nowrap font-mono">
                      {formatDate(t.date)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/jurisdictions/${t.jurisdictionId}`}
                        className="hover:text-primary-500"
                      >
                        {t.jurisdictionId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted">{t.department ?? '—'}</TableCell>
                    <TableCell numeric>{formatCurrency(t.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </VendorProfile>
    </main>
  );
}
