import { eq } from 'drizzle-orm';
import type { AnalyticsTxn, SpendEvent } from '@govpurse/core';
import { alertSubscriptions, savedViews } from '@govpurse/db';
import type { Database } from './db';

export interface ActiveWatch {
  savedViewId: string;
  userId: string;
  type: 'vendor-paid' | 'category-spike' | 'threshold';
  jurisdictionId: string | null;
  vendorQuery: string | null;
  minAmount: number | null;
  category: string | null;
}

export async function loadActiveWatches(db: Database): Promise<ActiveWatch[]> {
  const rows = await db
    .select({
      savedViewId: alertSubscriptions.savedViewId,
      userId: alertSubscriptions.userId,
      type: alertSubscriptions.type,
      filters: savedViews.filters,
    })
    .from(alertSubscriptions)
    .innerJoin(savedViews, eq(savedViews.id, alertSubscriptions.savedViewId))
    .where(eq(alertSubscriptions.isActive, true));

  return rows.map((r) => {
    const f = (r.filters ?? {}) as Record<string, unknown>;
    return {
      savedViewId: r.savedViewId,
      userId: r.userId,
      type: r.type,
      jurisdictionId: typeof f.jurisdiction === 'string' ? f.jurisdiction : null,
      vendorQuery: typeof f.q === 'string' ? f.q : null,
      minAmount: typeof f.minAmount === 'number' ? f.minAmount : null,
      category: typeof f.category === 'string' ? f.category : null,
    };
  });
}

/**
 * Emit per-transaction events for vendor-paid / threshold watches that match new
 * data. (Spikes are emitted separately and matched in the alert processor.) The
 * dedupeKey includes the transaction id so a watch never fires twice for the same
 * payment.
 */
export function transactionWatchEvents(
  txns: AnalyticsTxn[],
  watches: ActiveWatch[],
  jurisdictionId: string,
): SpendEvent[] {
  const events: SpendEvent[] = [];
  for (const w of watches) {
    if (w.type === 'category-spike') continue;
    if (w.jurisdictionId && w.jurisdictionId !== jurisdictionId) continue;

    for (const t of txns) {
      if (w.type === 'vendor-paid') {
        if (!w.vendorQuery) continue;
        if (!t.vendorName.toLowerCase().includes(w.vendorQuery.toLowerCase())) continue;
        if (w.minAmount != null && t.amount < w.minAmount) continue;
      } else {
        if (w.minAmount != null && t.amount < w.minAmount) continue;
        if (w.category && t.category !== w.category) continue;
      }
      const type = w.type === 'vendor-paid' ? 'vendor-payment' : 'threshold-exceeded';
      events.push({
        type,
        jurisdictionId,
        vendorId: t.vendorId,
        vendorName: t.vendorName,
        department: t.department,
        category: t.category,
        period: t.period,
        amount: t.amount,
        value: t.amount,
        occurredAt: t.date,
        detail: { transactionId: t.id },
        dedupeKey: `${type}:${jurisdictionId}:${w.savedViewId}:${t.id}`,
        watchId: w.savedViewId,
      });
    }
  }
  return events;
}
