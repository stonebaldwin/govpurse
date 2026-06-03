import type { AnalyticsTxn } from './types';

export interface PeriodTotal {
  period: string;
  total: number;
  count: number;
}

export interface DimensionTotal {
  key: string;
  total: number;
  count: number;
}

export interface FiscalYearTotal {
  fiscalYear: number;
  total: number;
  count: number;
}

export interface YoyDelta {
  fiscalYear: number;
  total: number;
  prior: number | null;
  /** Fractional change vs. prior FY, e.g. 0.12 = +12%. Null if no prior. */
  deltaPct: number | null;
}

function groupSum<T>(
  items: T[],
  keyFn: (item: T) => string | null,
  amountFn: (item: T) => number = () => 0,
): Map<string, { total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item);
    if (key === null) continue;
    const entry = map.get(key) ?? { total: 0, count: 0 };
    entry.total += amountFn(item);
    entry.count += 1;
    map.set(key, entry);
  }
  return map;
}

/** Net spend per month, ascending by period. */
export function spendByPeriod(txns: AnalyticsTxn[]): PeriodTotal[] {
  const map = groupSum(
    txns,
    (t) => t.period,
    (t) => t.amount,
  );
  return [...map]
    .map(([period, v]) => ({ period, total: v.total, count: v.count }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function dimension(
  txns: AnalyticsTxn[],
  keyFn: (t: AnalyticsTxn) => string | null,
): DimensionTotal[] {
  const map = groupSum(txns, keyFn, (t) => t.amount);
  return [...map]
    .map(([key, v]) => ({ key, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

export const spendByVendor = (txns: AnalyticsTxn[]): DimensionTotal[] =>
  dimension(txns, (t) => t.vendorId);
export const spendByDepartment = (txns: AnalyticsTxn[]): DimensionTotal[] =>
  dimension(txns, (t) => t.department);
export const spendByCategory = (txns: AnalyticsTxn[]): DimensionTotal[] =>
  dimension(txns, (t) => t.category);

/** Net spend per fiscal year, ascending. */
export function spendByFiscalYear(txns: AnalyticsTxn[]): FiscalYearTotal[] {
  const map = groupSum(
    txns,
    (t) => (t.fiscalYear === null ? null : String(t.fiscalYear)),
    (t) => t.amount,
  );
  return [...map]
    .map(([fy, v]) => ({ fiscalYear: Number(fy), total: v.total, count: v.count }))
    .sort((a, b) => a.fiscalYear - b.fiscalYear);
}

/** Year-over-year deltas by fiscal year. */
export function yoyByFiscalYear(txns: AnalyticsTxn[]): YoyDelta[] {
  const years = spendByFiscalYear(txns);
  return years.map((y, i) => {
    const prior = i > 0 ? years[i - 1]!.total : null;
    const deltaPct = prior !== null && prior !== 0 ? (y.total - prior) / Math.abs(prior) : null;
    return { fiscalYear: y.fiscalYear, total: y.total, prior, deltaPct };
  });
}

/** Top N payments by amount (largest positive disbursements first). */
export function largestPayments(txns: AnalyticsTxn[], n = 10): AnalyticsTxn[] {
  return [...txns].sort((a, b) => b.amount - a.amount).slice(0, n);
}
