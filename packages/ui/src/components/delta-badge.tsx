import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatPercent } from '../lib/format';

interface DeltaBadgeProps {
  /** A fraction: 0.124 → "+12.4%", -0.08 → "−8.0%". */
  value: number;
  showIcon?: boolean;
  className?: string;
}

/**
 * Year-over-year / period-over-period change.
 *
 * Colors are DIRECTIONAL, not evaluative — an increase is not styled as "bad".
 * Govpurse presents the change and lets the user draw conclusions.
 */
export function DeltaBadge({ value, showIcon = true, className }: DeltaBadgeProps) {
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const tone = {
    up: 'bg-up-bg text-up',
    down: 'bg-down-bg text-down',
    flat: 'bg-surface-subtle text-muted',
  }[direction];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums',
        tone,
        className,
      )}
    >
      {showIcon ? <Icon className="size-3" aria-hidden="true" /> : null}
      {formatPercent(value, { signed: true })}
    </span>
  );
}
