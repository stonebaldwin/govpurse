import type { CanonicalTransaction, ProcurementMethod } from '../types';

/**
 * A transaction flattened for analytics — resolved vendor id attached, period
 * derived. The analytics functions operate on these (not raw canonical rows) so
 * they're decoupled from ingestion and trivially testable with synthetic data.
 */
export interface AnalyticsTxn {
  id: string;
  vendorId: string;
  vendorName: string;
  department: string | null;
  category: string | null;
  amount: number;
  date: string | null;
  /** `YYYY-MM`, or null if the date was unparseable. */
  period: string | null;
  fiscalYear: number | null;
  procurementMethod: ProcurementMethod;
}

/** `YYYY-MM` month bucket for an ISO date. */
export function periodOf(date: string | null): string | null {
  return date && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : null;
}

/** Stable per-transaction id used both for resolution mentions and analytics. */
export function transactionMentionId(txn: CanonicalTransaction, index: number): string {
  return txn.sourceRecordId ?? `idx:${index}`;
}

export interface ToAnalyticsOptions {
  /** mention id → resolved vendor id (from `resolveVendors`). */
  assignment: Map<string, string>;
  /** resolved vendor id → display name. */
  vendorNameById?: Map<string, string>;
}

/** Project canonical transactions into analytics rows using a resolution result. */
export function toAnalyticsTxns(
  txns: CanonicalTransaction[],
  options: ToAnalyticsOptions,
): AnalyticsTxn[] {
  const { assignment, vendorNameById } = options;
  return txns.map((t, i) => {
    const id = transactionMentionId(t, i);
    const vendorId = assignment.get(id) ?? `unresolved:${t.vendorNameNormalized || id}`;
    return {
      id,
      vendorId,
      vendorName: vendorNameById?.get(vendorId) ?? t.vendorNameRaw,
      department: t.departmentNormalized,
      category: t.category,
      amount: t.amount,
      date: t.transactionDate,
      period: periodOf(t.transactionDate),
      fiscalYear: t.fiscalYear,
      procurementMethod: t.procurementMethod,
    };
  });
}
