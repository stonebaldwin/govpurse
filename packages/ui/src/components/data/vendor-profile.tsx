import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { StatCard } from '../stat-card';

export interface VendorProfileStat {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  caption?: ReactNode;
}

interface VendorProfileProps {
  name: string;
  /** Location / vendor id line. */
  meta?: ReactNode;
  /** Trailing badges, typically <AnalysisBadge /> (concentration, sole-source). */
  badges?: ReactNode;
  stats: VendorProfileStat[];
  /** Charts, breakdowns, and the transactions table for this vendor. */
  children?: ReactNode;
  className?: string;
}

/**
 * Reusable vendor-profile scaffold: header + KPI strip + content slot. The
 * Phase 3 vendor page composes charts and a <TransactionTable /> into `children`.
 */
export function VendorProfile({
  name,
  meta,
  badges,
  stats,
  children,
  className,
}: VendorProfileProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-ink text-2xl font-semibold tracking-tight">{name}</h1>
          {badges}
        </div>
        {meta ? <p className="text-muted text-sm">{meta}</p> : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            delta={s.delta}
            caption={s.caption}
          />
        ))}
      </div>

      {children}
    </div>
  );
}
