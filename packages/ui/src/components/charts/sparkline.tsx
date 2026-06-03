import { buildLinePath, linearScale } from '../../lib/chart';
import { chartColor } from './theme';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  colorIndex?: number;
  className?: string;
}

/** A tiny inline trend line — for stat cards and dense table rows. */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  colorIndex = 0,
  className,
}: SparklineProps) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const x = linearScale([0, Math.max(1, data.length - 1)], [1, width - 1]);
  const y = linearScale([min, max === min ? min + 1 : max], [height - 2, 2]);
  const points = data.map((value, i) => [x(i), y(value)] as [number, number]);
  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <path
        d={buildLinePath(points)}
        fill="none"
        stroke={chartColor(colorIndex)}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
