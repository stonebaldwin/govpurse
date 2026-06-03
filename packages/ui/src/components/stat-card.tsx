import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  /** Short uppercase label, e.g. "Total spend FY2025". */
  label: string;
  /** The figure — pass a pre-formatted string (tabular mono is applied here). */
  value: ReactNode;
  /** Optional trailing element, typically a <DeltaBadge />. */
  delta?: ReactNode;
  /** Optional caption under the figure, e.g. "vs. $1.1B in FY2024". */
  caption?: ReactNode;
  /** Optional slot under the figure, e.g. a <Sparkline />. */
  children?: ReactNode;
  className?: string;
}

/** KPI / stat card — the workhorse of a numbers-forward money product. */
export function StatCard({ label, value, delta, caption, children, className }: StatCardProps) {
  return (
    <div className={cn('border-line bg-surface shadow-card rounded-lg border p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted font-mono text-[0.7rem] font-medium uppercase tracking-wider">
          {label}
        </span>
        {delta}
      </div>
      <div className="text-ink mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {caption ? <p className="text-faint mt-1 text-xs">{caption}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
