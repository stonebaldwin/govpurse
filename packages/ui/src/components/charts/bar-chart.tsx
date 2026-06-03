'use client';

import { useState } from 'react';
import { resolveFormat, type NumberFormat } from '../../lib/format';
import { cn } from '../../lib/utils';
import { chartColor } from './theme';

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  format?: NumberFormat;
  /** Use the categorical palette per bar (vs. a single institutional primary). */
  colorByIndex?: boolean;
  /** Cap the number of bars shown (data should be pre-sorted by the caller). */
  maxBars?: number;
  className?: string;
}

/**
 * Horizontal ranked breakdown — top departments / vendors / categories. Built
 * with flex/`div`s (no measuring needed) so it's responsive and accessible.
 */
export function BarChart({
  data,
  format = 'compactCurrency',
  colorByIndex = false,
  maxBars,
  className,
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const valueFormat = resolveFormat(format);
  const rows = maxBars ? data.slice(0, maxBars) : data;
  const max = Math.max(1, ...rows.map((d) => d.value));

  return (
    <div className={cn('w-full space-y-2', className)}>
      {rows.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = colorByIndex ? chartColor(i) : 'var(--color-primary-500)';
        return (
          <div
            key={d.label}
            className="grid grid-cols-[minmax(7rem,10rem)_1fr_auto] items-center gap-3"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="text-muted truncate text-sm" title={d.label}>
              {d.label}
            </span>
            <div className="bg-surface-subtle h-6 w-full overflow-hidden rounded">
              <div
                className="h-full rounded transition-[width] duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  opacity: hover === null || hover === i ? 1 : 0.5,
                }}
              />
            </div>
            <span className="text-ink w-24 text-right font-mono text-sm tabular-nums">
              {valueFormat(d.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
