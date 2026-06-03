import * as React from 'react';
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="border-line w-full overflow-x-auto rounded-lg border">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-line [&_tr]:border-b', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-line hover:bg-surface-subtle/60 border-b transition-colors', className)}
      {...props}
    />
  );
}

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-align for numeric columns (money, counts). */
  numeric?: boolean;
}

export function TableHead({ className, numeric, ...props }: ThProps) {
  return (
    <th
      scope="col"
      className={cn(
        'text-muted h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  );
}

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableCell({ className, numeric, ...props }: TdProps) {
  return (
    <td
      className={cn(
        'text-ink px-3 py-2.5 align-middle',
        numeric && 'text-right font-mono tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

export type SortDirection = 'asc' | 'desc' | false;

interface SortableHeadProps extends Omit<ThProps, 'onClick'> {
  sort: SortDirection;
  onSort: () => void;
}

export function SortableTableHead({
  sort,
  onSort,
  numeric,
  className,
  children,
  ...props
}: SortableHeadProps) {
  const Icon = sort === 'asc' ? ChevronUp : sort === 'desc' ? ChevronDown : ChevronsUpDown;
  return (
    <TableHead
      numeric={numeric}
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'}
      className={cn('p-0', className)}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'text-muted hover:text-ink flex h-10 w-full items-center gap-1 px-3 text-xs font-medium uppercase tracking-wide',
          numeric && 'justify-end',
        )}
      >
        {children}
        <Icon className={cn('size-3.5', sort ? 'text-ink' : 'text-faint')} aria-hidden="true" />
      </button>
    </TableHead>
  );
}
