import { Bell } from 'lucide-react';
import {
  EmptyState,
  formatCompactCurrency,
  formatDate,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@govpurse/ui';
import { getRecentMatches } from '@/lib/dashboard';
import { requireUser } from '@/lib/session';

const TYPE_LABELS: Record<string, string> = {
  'vendor-payment': 'Vendor paid',
  'threshold-exceeded': 'Threshold exceeded',
  'spending-spike': 'Spending spike',
  'sole-source-pattern': 'Repeat sole-source',
};

export default async function AlertLogPage() {
  const user = await requireUser();
  const matches = await getRecentMatches(user.id, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Alert log</h1>
        <p className="text-muted mt-1">Every match we’ve delivered for your saved views.</p>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts delivered yet"
          description="When a saved view with alerts matches new data, it appears here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead numeric>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-muted whitespace-nowrap font-mono">
                  {formatDate(m.createdAt)}
                </TableCell>
                <TableCell>
                  {m.eventType ? (TYPE_LABELS[m.eventType] ?? m.eventType) : '—'}
                </TableCell>
                <TableCell className="text-muted">
                  {m.vendorName ?? m.category ?? m.jurisdictionId ?? '—'}
                </TableCell>
                <TableCell>
                  <span className={m.status === 'failed' ? 'text-spike' : 'text-down'}>
                    {m.status}
                  </span>
                </TableCell>
                <TableCell numeric>{formatCompactCurrency(m.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
