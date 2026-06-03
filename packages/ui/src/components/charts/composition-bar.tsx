'use client';

import { useState } from 'react';
import { resolveFormat, type NumberFormat } from '../../lib/format';
import { cn } from '../../lib/utils';
import { chartColor } from './theme';
import { Legend } from './legend';

export interface CompositionSegment {
  label: string;
  value: number;
}

interface CompositionBarProps {
  segments: CompositionSegment[];
  format?: NumberFormat;
  showLegend?: boolean;
  className?: string;
}

/** A single 100%-stacked bar — budget composition (by fund / category). */
export function CompositionBar({
  segments,
  format = 'compactCurrency',
  showLegend = true,
  className,
}: CompositionBarProps) {
  const [hover, setHover] = useState<number | null>(null);
  const valueFormat = resolveFormat(format);
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="border-line flex h-8 w-full overflow-hidden rounded-md border">
        {segments.map((segment, i) => {
          const pct = (segment.value / total) * 100;
          return (
            <div
              key={segment.label}
              title={`${segment.label}: ${valueFormat(segment.value)} (${pct.toFixed(1)}%)`}
              className="h-full transition-opacity"
              style={{
                width: `${pct}%`,
                backgroundColor: chartColor(i),
                opacity: hover === null || hover === i ? 1 : 0.55,
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </div>
      {showLegend ? (
        <Legend
          items={segments.map((s, i) => ({
            label: s.label,
            value: valueFormat(s.value),
            colorIndex: i,
          }))}
        />
      ) : null}
    </div>
  );
}
