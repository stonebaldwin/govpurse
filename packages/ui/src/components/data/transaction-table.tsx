'use client';

import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { formatCurrency, formatDate } from '../../lib/format';
import { Button } from '../button';
import {
  SortableTableHead,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SortDirection,
} from '../table';

export interface TransactionRow {
  id: string;
  date: string | Date;
  vendor: string;
  department: string;
  category?: string;
  amount: number;
}

type SortKey = 'date' | 'vendor' | 'department' | 'amount';

interface TransactionTableProps {
  rows: TransactionRow[];
  pageSize?: number;
  className?: string;
}

/**
 * Data-dense, sortable, paginated transaction explorer.
 *
 * NOTE: pagination keeps the DOM small for the design-system review. When wired
 * to real query volume in Phase 3, swap the page slice for row virtualization
 * (`@tanstack/react-virtual`) over a windowed/streamed result set.
 */
export function TransactionTable({ rows, pageSize = 10, className }: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  function toggle(key: SortKey) {
    if (sortKey === key) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDir(key === 'amount' || key === 'date' ? 'desc' : 'asc');
    }
    setPage(0);
  }

  const dirFor = (key: SortKey): SortDirection => (sortKey === key ? dir : false);

  return (
    <div className={cn('space-y-3', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead sort={dirFor('date')} onSort={() => toggle('date')}>
              Date
            </SortableTableHead>
            <SortableTableHead sort={dirFor('vendor')} onSort={() => toggle('vendor')}>
              Vendor
            </SortableTableHead>
            <SortableTableHead sort={dirFor('department')} onSort={() => toggle('department')}>
              Department
            </SortableTableHead>
            <TableHead>Category</TableHead>
            <SortableTableHead numeric sort={dirFor('amount')} onSort={() => toggle('amount')}>
              Amount
            </SortableTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-muted whitespace-nowrap font-mono">
                {formatDate(r.date)}
              </TableCell>
              <TableCell className="font-medium">{r.vendor}</TableCell>
              <TableCell className="text-muted">{r.department}</TableCell>
              <TableCell className="text-muted">{r.category ?? '—'}</TableCell>
              <TableCell numeric>{formatCurrency(r.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted font-mono tabular-nums">
          {sorted.length.toLocaleString('en-US')} transactions
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-muted font-mono text-xs tabular-nums">
            Page {clampedPage + 1} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
