import { Activity } from 'lucide-react';
import {
  EmptyState,
  formatCompactCurrency,
  formatDate,
  formatNumber,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@govpurse/ui';
import { getDatasetHealth, getVolumeMetrics } from '@/lib/admin-data';

function statusColor(status: string, anomalous: boolean): string {
  if (status === 'failed') return 'text-spike';
  if (anomalous || status === 'partial') return 'text-spike';
  return 'text-down';
}

export default async function AdminHealthPage() {
  const [health, vol] = await Promise.all([getDatasetHealth(), getVolumeMetrics()]);

  return (
    <div className="space-y-8">
      <h1 className="text-ink text-2xl font-semibold tracking-tight">Ingestion health</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Jurisdictions" value={formatNumber(vol.jurisdictions)} />
        <StatCard label="Vendors" value={formatNumber(vol.vendors)} />
        <StatCard label="Transactions" value={formatNumber(vol.transactions)} />
        <StatCard label="Total spend" value={formatCompactCurrency(vol.totalSpend)} />
      </div>

      {health.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No ingestion runs yet"
          description="Sync runs appear here once the ingest worker has run against a dataset."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dataset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead numeric>Rows</TableHead>
              <TableHead numeric>Map errs</TableHead>
              <TableHead>Last run</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {health.map((h) => (
              <TableRow key={`${h.jurisdictionId}:${h.datasetId ?? ''}`}>
                <TableCell className="font-medium">
                  {h.jurisdictionId}
                  {h.datasetId ? <span className="text-faint"> / {h.datasetId}</span> : null}
                </TableCell>
                <TableCell>
                  <span className={statusColor(h.status, h.anomalous)}>
                    {h.status}
                    {h.anomalous ? ' ⚠' : ''}
                  </span>
                </TableCell>
                <TableCell numeric>{formatNumber(h.rowsSeen)}</TableCell>
                <TableCell numeric>{formatNumber(h.mappingErrors)}</TableCell>
                <TableCell className="text-muted whitespace-nowrap font-mono">
                  {formatDate(h.finishedAt)}
                </TableCell>
                <TableCell
                  className="text-muted max-w-xs truncate"
                  title={h.anomalyReasons.join('; ')}
                >
                  {h.anomalyReasons.join('; ') || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
