/**
 * Dependency-free chart math. Pure functions, no React, no DOM — so charts
 * render identically on the server and stay tiny in the Worker bundle.
 *
 * Why hand-rolled instead of a charting library: the design brief is a calm,
 * institutional, numbers-forward aesthetic with a fixed categorical palette and
 * a hard Worker bundle limit. Custom SVG primitives over these helpers give full
 * control of that look, trivial SSR-safety, and zero charting dependencies.
 */

export type Scale = (value: number) => number;

/** Map a numeric `domain` linearly onto a pixel `range`. */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  if (span === 0) return () => (r0 + r1) / 2;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

/**
 * "Nice" axis ticks covering [min, max] — rounded to 1/2/5 × 10ⁿ steps.
 * Classic Heckbert algorithm.
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const range = niceNum(max - min, false);
  const step = niceNum(range / Math.max(1, count - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Guard against floating-point drift producing a runaway loop.
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(Number(v.toFixed(10)));
    if (ticks.length > 1000) break;
  }
  return ticks;
}

function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}

/** Round a maximum up to a "nice" headroom value for a chart's y-domain. */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const ticks = niceTicks(0, max, 5);
  return ticks[ticks.length - 1] ?? max;
}

/** SVG path `d` for a polyline through `points` (already in pixel space). */
export function buildLinePath(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)},${round(y)}`).join(' ');
}

/** SVG path `d` for a filled area under `points`, closed to `baselineY`. */
export function buildAreaPath(
  points: ReadonlyArray<readonly [number, number]>,
  baselineY: number,
): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${buildLinePath(points)} L${round(last[0])},${round(baselineY)} L${round(first[0])},${round(baselineY)} Z`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TreemapRect {
  index: number;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk). Returns a rect per
 * input value, laid out within [x, y, width, height], ordered to keep tiles
 * close to square. Input values should be positive; non-positive are dropped.
 */
export function squarify(
  values: readonly number[],
  x: number,
  y: number,
  width: number,
  height: number,
): TreemapRect[] {
  const items = values
    .map((value, index) => ({ value, index }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = items.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];

  // Scale values to area units.
  const scale = (width * height) / total;
  const scaled = items.map((d) => ({ ...d, area: d.value * scale }));

  const result: TreemapRect[] = [];
  let rect = { x, y, width, height };
  let row: typeof scaled = [];

  const shortestSide = () => Math.min(rect.width, rect.height);

  const worst = (candidate: typeof scaled, side: number): number => {
    if (candidate.length === 0) return Infinity;
    const areas = candidate.map((d) => d.area);
    const sum = areas.reduce((s, a) => s + a, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    const side2 = side * side;
    const sum2 = sum * sum;
    return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
  };

  const layoutRow = (currentRow: typeof scaled) => {
    const sum = currentRow.reduce((s, d) => s + d.area, 0);
    const horizontal = rect.width >= rect.height;
    if (horizontal) {
      const rowWidth = sum / rect.height;
      let oy = rect.y;
      for (const d of currentRow) {
        const h = d.area / rowWidth;
        result.push({
          index: d.index,
          value: d.value,
          x: rect.x,
          y: oy,
          width: rowWidth,
          height: h,
        });
        oy += h;
      }
      rect = { x: rect.x + rowWidth, y: rect.y, width: rect.width - rowWidth, height: rect.height };
    } else {
      const rowHeight = sum / rect.width;
      let ox = rect.x;
      for (const d of currentRow) {
        const w = d.area / rowHeight;
        result.push({
          index: d.index,
          value: d.value,
          x: ox,
          y: rect.y,
          width: w,
          height: rowHeight,
        });
        ox += w;
      }
      rect = {
        x: rect.x,
        y: rect.y + rowHeight,
        width: rect.width,
        height: rect.height - rowHeight,
      };
    }
  };

  for (const item of scaled) {
    const side = shortestSide();
    const withItem = [...row, item];
    if (row.length === 0 || worst(withItem, side) <= worst(row, side)) {
      row = withItem;
    } else {
      layoutRow(row);
      row = [item];
    }
  }
  if (row.length > 0) layoutRow(row);

  return result;
}
