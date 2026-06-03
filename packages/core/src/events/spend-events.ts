import type { Spike } from '../analytics/spikes';
import type { AnalyticsTxn } from '../analytics/types';

export type SpendEventType =
  | 'vendor-payment'
  | 'threshold-exceeded'
  | 'spending-spike'
  | 'sole-source-pattern';

/**
 * A typed change/threshold event. The Core emits these on new ingested data; the
 * alert pipeline (Phase 6) persists them and matches them to users. This stays
 * product-agnostic — it knows nothing about email or saved-view tables.
 */
export interface SpendEvent {
  type: SpendEventType;
  jurisdictionId: string;
  vendorId: string | null;
  vendorName: string | null;
  department: string | null;
  category: string | null;
  period: string | null;
  amount: number | null;
  /** Headline figure for the event (payment amount or spike value). */
  value: number;
  occurredAt: string | null;
  detail: Record<string, unknown>;
  /** Stable key so the pipeline can dedupe — a user never gets the same match twice. */
  dedupeKey: string;
  /** The watch that matched, or null for anomaly/operator events. */
  watchId: string | null;
}

/** Generic alert criteria — the alert pipeline maps a saved view to one of these. */
export interface SpendWatch {
  id: string;
  kind: 'vendor-paid' | 'threshold' | 'category-spike';
  jurisdictionId?: string;
  vendorId?: string;
  category?: string | null;
  department?: string | null;
  /** Minimum amount for vendor-paid / threshold watches. */
  minAmount?: number;
}

function scopeMatches(watch: SpendWatch, txn: AnalyticsTxn): boolean {
  if (watch.category != null && watch.category !== txn.category) return false;
  if (watch.department != null && watch.department !== txn.department) return false;
  return true;
}

/**
 * Emit per-transaction events for the watches a batch of new transactions
 * matches: a watched vendor being paid, or a threshold being exceeded.
 */
export function detectTransactionEvents(
  txns: AnalyticsTxn[],
  watches: SpendWatch[],
  jurisdictionId: string,
): SpendEvent[] {
  const events: SpendEvent[] = [];
  for (const txn of txns) {
    for (const watch of watches) {
      if (watch.jurisdictionId && watch.jurisdictionId !== jurisdictionId) continue;

      if (watch.kind === 'vendor-paid') {
        if (!watch.vendorId || watch.vendorId !== txn.vendorId) continue;
        if (watch.minAmount != null && txn.amount < watch.minAmount) continue;
        events.push(buildTxnEvent('vendor-payment', txn, jurisdictionId, watch.id));
      } else if (watch.kind === 'threshold') {
        if (!scopeMatches(watch, txn)) continue;
        if (txn.amount < (watch.minAmount ?? 0)) continue;
        events.push(buildTxnEvent('threshold-exceeded', txn, jurisdictionId, watch.id));
      }
    }
  }
  return events;
}

function buildTxnEvent(
  type: SpendEventType,
  txn: AnalyticsTxn,
  jurisdictionId: string,
  watchId: string,
): SpendEvent {
  return {
    type,
    jurisdictionId,
    vendorId: txn.vendorId,
    vendorName: txn.vendorName,
    department: txn.department,
    category: txn.category,
    period: txn.period,
    amount: txn.amount,
    value: txn.amount,
    occurredAt: txn.date,
    detail: { transactionId: txn.id },
    dedupeKey: `${type}:${jurisdictionId}:${watchId}:${txn.id}`,
    watchId,
  };
}

/**
 * Convert detected spikes into events. If a `category-spike` watch matches the
 * spike's scope it carries that watchId (a user alert); otherwise watchId is
 * null (an operator/anomaly-feed event).
 */
export function spikeEvents(
  spikes: Spike[],
  jurisdictionId: string,
  watches: SpendWatch[] = [],
): SpendEvent[] {
  return spikes.map((spike) => {
    const watch = watches.find(
      (w) =>
        w.kind === 'category-spike' &&
        (!w.jurisdictionId || w.jurisdictionId === jurisdictionId) &&
        (w.category == null || w.category === spike.scope) &&
        (w.department == null || w.department === spike.scope),
    );
    return {
      type: 'spending-spike' as const,
      jurisdictionId,
      vendorId: null,
      vendorName: null,
      department: null,
      category: spike.scope === 'overall' ? null : spike.scope,
      period: spike.period,
      amount: null,
      value: spike.value,
      occurredAt: `${spike.period}-01`,
      detail: {
        baselineMean: spike.baselineMean,
        ratio: spike.ratio,
        z: spike.z,
        severity: spike.severity,
      },
      dedupeKey: `spending-spike:${jurisdictionId}:${spike.scope}:${spike.period}`,
      watchId: watch?.id ?? null,
    };
  });
}
