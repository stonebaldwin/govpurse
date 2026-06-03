import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * The distinctive Govpurse component (analogous to a status badge).
 *
 * Every derived/watchdog figure is tagged with one of these so it reads as
 * **computed analysis, never an official finding or accusation**. The default
 * `title` reinforces that on hover. This bakes the product's #1 credibility rule
 * into the design system itself.
 */
export type AnalysisKind = 'analysis' | 'spike' | 'concentration' | 'sole-source';

const CONFIG: Record<AnalysisKind, { label: string; dot: string; className: string }> = {
  analysis: {
    label: 'Computed analysis',
    dot: 'bg-analysis',
    className: 'bg-analysis-bg text-analysis border-analysis-border',
  },
  spike: {
    label: 'Spending spike',
    dot: 'bg-spike',
    className: 'bg-spike-bg text-spike border-spike-border',
  },
  concentration: {
    label: 'Vendor concentration',
    dot: 'bg-concentration',
    className: 'bg-concentration-bg text-concentration border-concentration-border',
  },
  'sole-source': {
    label: 'Repeat sole-source',
    dot: 'bg-spike',
    className: 'bg-spike-bg text-spike border-spike-border',
  },
};

interface AnalysisBadgeProps {
  kind?: AnalysisKind;
  /** Override the default label. */
  children?: ReactNode;
  title?: string;
  className?: string;
}

export function AnalysisBadge({
  kind = 'analysis',
  children,
  title,
  className,
}: AnalysisBadgeProps) {
  const config = CONFIG[kind];
  return (
    <span
      title={
        title ??
        'Computed analysis — not an official finding. Open the underlying transactions to verify.'
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', config.dot)} aria-hidden="true" />
      {children ?? config.label}
    </span>
  );
}

export { CONFIG as ANALYSIS_CONFIG };
