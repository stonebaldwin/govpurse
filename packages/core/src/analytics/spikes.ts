import { type PeriodTotal, spendByPeriod } from './aggregate';
import type { AnalyticsTxn } from './types';

export interface SpikeOptions {
  /** Trailing periods used as the baseline. Default 6. */
  baselineWindow?: number;
  /** Ignore baselines below this (avoids noise on tiny series). Default 1000. */
  minBaseline?: number;
  /** Min z-score over the trailing baseline. Default 2.5. */
  zThreshold?: number;
  /** Min value/baseline ratio. Default 1.5 (≥ 50% above baseline). Default 1.5. */
  ratioThreshold?: number;
}

export type SpikeSeverity = 'low' | 'medium' | 'high';

export interface Spike {
  scope: string;
  period: string;
  value: number;
  baselineMean: number;
  baselineStd: number;
  z: number;
  ratio: number;
  severity: SpikeSeverity;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stddev(xs: number[], mu: number): number {
  if (xs.length === 0) return 0;
  const variance = xs.reduce((s, x) => s + (x - mu) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function severityRank(s: SpikeSeverity): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
}

/**
 * Flag periods whose value is anomalously high vs. a trailing baseline. A spike
 * must clear BOTH a z-score and an absolute-ratio bar, so a noisy small series
 * doesn't fire. Values are finite (no Infinity) so results serialize to JSON.
 */
export function detectSpikesInSeries(
  series: PeriodTotal[],
  scope: string,
  options: SpikeOptions = {},
): Spike[] {
  const window = options.baselineWindow ?? 6;
  const minBaseline = options.minBaseline ?? 1000;
  const zThreshold = options.zThreshold ?? 2.5;
  const ratioThreshold = options.ratioThreshold ?? 1.5;

  const sorted = [...series].sort((a, b) => a.period.localeCompare(b.period));
  const spikes: Spike[] = [];

  for (let i = window; i < sorted.length; i++) {
    const baseline = sorted.slice(i - window, i).map((p) => p.total);
    const mu = mean(baseline);
    if (mu < minBaseline) continue;

    const sigma = stddev(baseline, mu);
    const value = sorted[i]!.total;
    const z = sigma > 0 ? (value - mu) / sigma : value > mu ? 999 : 0;
    const ratio = mu !== 0 ? value / mu : value > 0 ? 999 : 0;

    if (value > mu && ratio >= ratioThreshold && (sigma === 0 || z >= zThreshold)) {
      const severity: SpikeSeverity =
        ratio >= 3 || z >= 5 ? 'high' : ratio >= 2 || z >= 3.5 ? 'medium' : 'low';
      spikes.push({
        scope,
        period: sorted[i]!.period,
        value,
        baselineMean: mu,
        baselineStd: sigma,
        z,
        ratio,
        severity,
      });
    }
  }
  return spikes;
}

/** Spikes in overall monthly spend. */
export function detectSpikes(txns: AnalyticsTxn[], options: SpikeOptions = {}): Spike[] {
  return detectSpikesInSeries(spendByPeriod(txns), 'overall', options);
}

function detectScopedSpikes(
  txns: AnalyticsTxn[],
  keyFn: (t: AnalyticsTxn) => string | null,
  options: SpikeOptions,
): Spike[] {
  const groups = new Map<string, AnalyticsTxn[]>();
  for (const t of txns) {
    const key = keyFn(t);
    if (!key) continue;
    const arr = groups.get(key);
    if (arr) arr.push(t);
    else groups.set(key, [t]);
  }
  const out: Spike[] = [];
  for (const [scope, list] of groups)
    out.push(...detectSpikesInSeries(spendByPeriod(list), scope, options));
  return out.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity) || b.ratio - a.ratio,
  );
}

export const detectCategorySpikes = (txns: AnalyticsTxn[], options: SpikeOptions = {}): Spike[] =>
  detectScopedSpikes(txns, (t) => t.category, options);

export const detectDepartmentSpikes = (txns: AnalyticsTxn[], options: SpikeOptions = {}): Spike[] =>
  detectScopedSpikes(txns, (t) => t.department, options);
