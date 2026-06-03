/**
 * Chart theming — references the design tokens as CSS variables so charts stay
 * on-palette and dark-mode aware automatically (SVG fill/stroke accept var()).
 */

export const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
] as const;

/** The restrained categorical color for series `i`, cycling through the palette. */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

export const AXIS_COLOR = {
  grid: 'var(--color-line)',
  axis: 'var(--color-line-strong)',
  tick: 'var(--color-faint)',
  label: 'var(--color-muted)',
} as const;
