'use client';

import { useState } from 'react';
import { buildAreaPath, buildLinePath, linearScale, niceMax, niceTicks } from '../../lib/chart';
import { resolveFormat, type NumberFormat } from '../../lib/format';
import { cn } from '../../lib/utils';
import { useElementWidth } from '../../lib/use-element-size';
import { AXIS_COLOR, chartColor } from './theme';
import { ChartTooltip } from './chart-frame';

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  height?: number;
  colorIndex?: number;
  area?: boolean;
  format?: NumberFormat;
  className?: string;
}

/** Spend-over-time line/area chart. Responsive (measured) with hover crosshair. */
export function TimeSeriesChart({
  data,
  height = 260,
  colorIndex = 0,
  area = true,
  format = 'compactCurrency',
  className,
}: TimeSeriesChartProps) {
  const [ref, width] = useElementWidth(640);
  const [hover, setHover] = useState<number | null>(null);
  const valueFormat = resolveFormat(format);

  const margin = { top: 16, right: 16, bottom: 28, left: 60 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const maxValue = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const yTicks = niceTicks(0, maxValue, 5);
  const baselineY = margin.top + innerH;
  const yScale = linearScale([0, maxValue], [baselineY, margin.top]);
  const xAt = (i: number) =>
    margin.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);

  const points = data.map((d, i) => [xAt(i), yScale(d.value)] as [number, number]);
  const color = chartColor(colorIndex);
  const xLabelEvery = Math.max(1, Math.ceil(data.length / 6));
  const slot = innerW / Math.max(1, data.length);

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      <svg width={width} height={height} role="img" aria-label="Spend over time">
        {yTicks.map((tick) => {
          const gy = yScale(tick);
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={gy}
                y2={gy}
                stroke={AXIS_COLOR.grid}
                strokeWidth={1}
              />
              <text
                x={margin.left - 8}
                y={gy}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill={AXIS_COLOR.tick}
                className="font-mono tabular-nums"
              >
                {valueFormat(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) =>
          i % xLabelEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.label}
              x={xAt(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize={11}
              fill={AXIS_COLOR.tick}
            >
              {d.label}
            </text>
          ) : null,
        )}

        {area ? <path d={buildAreaPath(points, baselineY)} fill={color} opacity={0.1} /> : null}
        <path
          d={buildLinePath(points)}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => {
          const px = xAt(i);
          const py = yScale(d.value);
          return (
            <g key={d.label}>
              {hover === i ? (
                <>
                  <line
                    x1={px}
                    x2={px}
                    y1={margin.top}
                    y2={baselineY}
                    stroke={AXIS_COLOR.axis}
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={px}
                    cy={py}
                    r={3.5}
                    fill={color}
                    stroke="var(--color-surface)"
                    strokeWidth={1.5}
                  />
                </>
              ) : null}
              <rect
                x={px - slot / 2}
                y={margin.top}
                width={Math.max(6, slot)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>

      {hover !== null && data[hover] ? (
        <ChartTooltip x={xAt(hover)} y={yScale(data[hover]!.value)}>
          <div className="font-medium">{data[hover]!.label}</div>
          <div className="text-muted font-mono tabular-nums">{valueFormat(data[hover]!.value)}</div>
        </ChartTooltip>
      ) : null}
    </div>
  );
}
