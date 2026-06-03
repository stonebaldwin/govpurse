import { ShieldCheck } from 'lucide-react';
import {
  EmptyState,
  formatPercent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@govpurse/ui';
import { getReviewQueue } from '@/lib/admin-data';

export default async function ReviewQueuePage() {
  const rows = await getReviewQueue();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Vendor resolution review</h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          Vendors that were fuzzy-merged below full confidence. Resolution is tuned conservatively —
          a false merge of two different vendors is worse than a miss — so this queue should stay
          short. Verify the variants look like the same entity.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing to review"
          description="No low-confidence vendor merges right now."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead numeric>Confidence</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Variants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.canonicalName}</TableCell>
                <TableCell numeric>{formatPercent(v.matchConfidence)}</TableCell>
                <TableCell className="text-muted">{v.state ?? '—'}</TableCell>
                <TableCell className="text-muted">{v.variants.join(' · ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
