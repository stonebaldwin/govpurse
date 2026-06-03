'use client';

import { useState } from 'react';
import { squarify } from '../../lib/chart';
import { resolveFormat, type NumberFormat } from '../../lib/format';
import { cn } from '../../lib/utils';
import { useElementWidth } from '../../lib/use-element-size';
import { chartColor } from './theme';

export interface TreemapDatum {
  label: string;
  value: number;
}

interface TreemapProps {
  data: TreemapDatum[];
  height?: number;
  format?: NumberFormat;
  className?: string;
}

/** Squarified treemap — budget composition where relative size carries meaning. */
export function Treemap({
  data,
  height = 280,
  format = 'compactCurrency',
  className,
}: TreemapProps) {
  const [ref, width] = useElementWidth(640);
  const [hover, setHover] = useState<number | null>(null);
  const valueFormat = resolveFormat(format);

  const rects = squarify(
    data.map((d) => d.value),
    0,
    0,
    width,
    height,
  );
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const active = hover !== null ? data[hover] : undefined;

  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height }}>
      <svg width={width} height={height} role="img" aria-label="Budget composition">
        {rects.map((r) => {
          const d = data[r.index]!;
          const pct = (d.value / total) * 100;
          const showLabel = r.width > 64 && r.height > 30;
          return (
            <g
              key={r.index}
              onMouseEnter={() => setHover(r.index)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                fill={chartColor(r.index)}
                opacity={hover === null || hover === r.index ? 1 : 0.6}
                stroke="var(--color-paper)"
                strokeWidth={2}
              />
              {showLabel ? (
                <>
                  <text x={r.x + 8} y={r.y + 18} fontSize={12} fill="#fff" className="font-medium">
                    {d.label}
                  </text>
                  <text
                    x={r.x + 8}
                    y={r.y + 34}
                    fontSize={11}
                    fill="rgba(255,255,255,0.85)"
                    className="font-mono tabular-nums"
                  >
                    {valueFormat(d.value)} · {pct.toFixed(1)}%
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>

      {active ? (
        <div className="border-line bg-surface text-ink shadow-card pointer-events-none absolute right-2 top-2 rounded-md border px-2.5 py-1.5 text-xs">
          <div className="font-medium">{active.label}</div>
          <div className="text-muted font-mono tabular-nums">
            {valueFormat(active.value)} · {((active.value / total) * 100).toFixed(1)}%
          </div>
        </div>
      ) : null}
    </div>
  );
}
