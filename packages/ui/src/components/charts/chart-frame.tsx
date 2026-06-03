import type { ReactNode } from 'react';

/**
 * A floating chart tooltip, positioned in the chart's pixel space. Presentational
 * (no hooks) so it can live outside a client boundary; the interactive charts
 * that use it own the hover state.
 */
export function ChartTooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="border-line bg-surface text-ink shadow-card pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs"
      style={{ left: x, top: y - 8 }}
    >
      {children}
    </div>
  );
}
