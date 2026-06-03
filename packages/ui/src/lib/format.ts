/**
 * Display formatting for a money product. Pure, SSR-safe (deterministic with a
 * fixed `en-US` locale so server and client render identically).
 *
 * These are *display* helpers only. Canonical amount normalization on ingest
 * (currency symbols, thousands separators, refunds/negatives) lives in
 * `@govpurse/core`, not here.
 */

type Numish = number | string | null | undefined;

function toNumber(value: Numish): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const usdCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('en-US');

/**
 * Deterministic compact magnitude — 1_250_000 → "1.3M", 980_000 → "980K",
 * 0 → "0". Hand-rolled rather than Intl `notation: 'compact'` because ICU's
 * compact output varies across runtimes (Node renders "$0.0", browsers "$0"),
 * which breaks SSR hydration for charts that render on both sides. Pure
 * arithmetic is identical everywhere.
 */
function compactMagnitude(abs: number): string {
  const units: ReadonlyArray<readonly [number, string]> = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [factor, suffix] of units) {
    if (abs >= factor) {
      const scaled = abs / factor;
      const digits = scaled >= 100 ? 0 : 1;
      return scaled.toFixed(digits).replace(/\.0$/, '') + suffix;
    }
  }
  return String(Math.round(abs));
}

/** `$1,250,000` (whole dollars) or `$1,250,000.00` with `cents: true`. */
export function formatCurrency(value: Numish, options: { cents?: boolean } = {}): string {
  const n = toNumber(value);
  if (n === null) return '—';
  return (options.cents ? usdCents : usdWhole).format(n);
}

/** `$1.3M`, `$980K`, `$1.3B` — for axis labels, KPI cards, dense tables. */
export function formatCompactCurrency(value: Numish): string {
  const n = toNumber(value);
  if (n === null) return '—';
  return `${n < 0 ? '-$' : '$'}${compactMagnitude(Math.abs(n))}`;
}

/** `1,250,000`. */
export function formatNumber(value: Numish): string {
  const n = toNumber(value);
  if (n === null) return '—';
  return numberFmt.format(n);
}

/** `1.3M`, `980K`. */
export function formatCompactNumber(value: Numish): string {
  const n = toNumber(value);
  if (n === null) return '—';
  return `${n < 0 ? '-' : ''}${compactMagnitude(Math.abs(n))}`;
}

/**
 * Format a fraction (e.g. `0.124`) as a percent (`12.4%`).
 * With `signed: true`, prefixes `+`/`−` for deltas (`+12.4%`, `−8.0%`).
 */
export function formatPercent(
  fraction: Numish,
  options: { signed?: boolean; maximumFractionDigits?: number } = {},
): string {
  const n = toNumber(fraction);
  if (n === null) return '—';
  const { signed = false, maximumFractionDigits = 1 } = options;
  const pct = (Math.abs(n) * 100).toFixed(maximumFractionDigits);
  if (!signed) return `${(n * 100).toFixed(maximumFractionDigits)}%`;
  if (n > 0) return `+${pct}%`;
  if (n < 0) return `−${pct}%`; // U+2212 minus, not hyphen
  return `0%`;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const monthFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** `May 30, 2026`. */
export function formatDate(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : '—';
}

/** `May 2026` — for month-grained spend series. */
export function formatMonth(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  return d ? monthFmt.format(d) : '—';
}

export type NumberFormat =
  | 'currency'
  | 'compactCurrency'
  | 'number'
  | 'compactNumber'
  | 'percent'
  | 'plain';

/**
 * Resolve a serializable format *name* to a formatter function.
 *
 * Client chart components are often configured from Server Components, and
 * functions cannot cross the RSC boundary — so charts take a `format` string and
 * resolve it to a formatter on the client with this helper.
 */
export function resolveFormat(format: NumberFormat = 'plain'): (value: number) => string {
  switch (format) {
    case 'currency':
      return (value) => formatCurrency(value);
    case 'compactCurrency':
      return (value) => formatCompactCurrency(value);
    case 'number':
      return (value) => formatNumber(value);
    case 'compactNumber':
      return (value) => formatCompactNumber(value);
    case 'percent':
      return (value) => formatPercent(value);
    case 'plain':
      return (value) => String(value);
  }
}
