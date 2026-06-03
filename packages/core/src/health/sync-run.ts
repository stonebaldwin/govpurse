import type { Platform } from '../types';

/**
 * Ingestion health monitoring. Every adapter run produces a `SyncRunResult`;
 * anomaly checks flag the moment a portal changes schema so the operator hears
 * about it before users do. The `onUnhealthy` hook is wired to Resend in the app
 * layer (Phase 6) — the Core only defines and invokes it.
 */

export type SyncStatus = 'success' | 'partial' | 'failed';

export interface SyncRunResult {
  jurisdictionId: string;
  datasetId: string | null;
  platform: Platform;
  startedAt: string;
  finishedAt: string;
  rowsSeen: number;
  rowsNew: number;
  rowsUpdated: number;
  mappingErrors: number;
  status: SyncStatus;
  anomalous: boolean;
  anomalyReasons: string[];
  error: string | null;
  errorCode: string | null;
}

export type OnUnhealthy = (run: SyncRunResult) => void | Promise<void>;

export interface HealthHistory {
  /** rowsSeen from recent prior runs of the same dataset. */
  priorRowsSeen: number[];
}

export interface AnomalyOptions {
  /** Flag when mappingErrors/rowsSeen ≥ this. Default 0.2 (20%). */
  mappingErrorRateThreshold?: number;
  /** Only flag zero-rows when the prior average was ≥ this. Default 1. */
  zeroRowsMinPriorAvg?: number;
}

export function resolveStatus(input: {
  rowsSeen: number;
  mappingErrors: number;
  fatal: boolean;
}): SyncStatus {
  if (input.fatal) return 'failed';
  if (input.mappingErrors > 0) return 'partial';
  return 'success';
}

type SyncRunCore = Pick<
  SyncRunResult,
  'rowsSeen' | 'mappingErrors' | 'status' | 'error' | 'errorCode'
>;

/** Reasons a run looks anomalous (empty array = healthy). */
export function detectAnomalies(
  run: SyncRunCore,
  history: HealthHistory = { priorRowsSeen: [] },
  options: AnomalyOptions = {},
): string[] {
  const reasons: string[] = [];
  const mapThreshold = options.mappingErrorRateThreshold ?? 0.2;
  const zeroMin = options.zeroRowsMinPriorAvg ?? 1;

  if (run.errorCode === 'portal_shape_changed') {
    reasons.push('Portal shape changed — a mapped column or the dataset id likely moved');
  }
  if (run.status === 'failed') {
    reasons.push(`Run failed: ${run.error ?? 'unknown error'}`);
  }

  const prior = history.priorRowsSeen;
  const priorAvg = prior.length ? prior.reduce((s, x) => s + x, 0) / prior.length : 0;
  if (run.rowsSeen === 0 && priorAvg >= zeroMin) {
    reasons.push(`Zero rows this run, but prior runs averaged ~${Math.round(priorAvg)}`);
  }

  const rate = run.rowsSeen > 0 ? run.mappingErrors / run.rowsSeen : run.mappingErrors > 0 ? 1 : 0;
  if (run.mappingErrors > 0 && rate >= mapThreshold) {
    reasons.push(`High mapping-failure rate: ${(rate * 100).toFixed(0)}%`);
  }

  return reasons;
}

export interface DatasetHealth {
  jurisdictionId: string;
  datasetId: string | null;
  lastStatus: SyncStatus | null;
  lastRunAt: string | null;
  anomalous: boolean;
  reasons: string[];
  rowsSeen: number;
}

/** Latest run per dataset, for the admin health cockpit. Unhealthy first. */
export function summarizeHealth(runs: SyncRunResult[]): DatasetHealth[] {
  const latest = new Map<string, SyncRunResult>();
  for (const r of runs) {
    const key = `${r.jurisdictionId}::${r.datasetId ?? ''}`;
    const cur = latest.get(key);
    if (!cur || r.finishedAt > cur.finishedAt) latest.set(key, r);
  }
  return [...latest.values()]
    .map((r) => ({
      jurisdictionId: r.jurisdictionId,
      datasetId: r.datasetId,
      lastStatus: r.status,
      lastRunAt: r.finishedAt,
      anomalous: r.anomalous,
      reasons: r.anomalyReasons,
      rowsSeen: r.rowsSeen,
    }))
    .sort((a, b) => {
      const unhealthy = (h: DatasetHealth) => (h.lastStatus === 'failed' || h.anomalous ? 0 : 1);
      return unhealthy(a) - unhealthy(b) || a.jurisdictionId.localeCompare(b.jurisdictionId);
    });
}
