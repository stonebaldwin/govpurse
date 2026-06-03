import type { SpendEvent } from '../events/spend-events';
import type { HealthHistory, SyncRunResult } from '../health/sync-run';
import type { ResolvedVendor } from '../resolve/vendor-resolution';
import type { CanonicalRecord } from '../types';
import type { IngestStore, PersistResult } from './ports';

function recordKey(r: CanonicalRecord): string {
  if (r.kind === 'transaction') {
    const sig =
      r.sourceRecordId ??
      `${r.vendorNameNormalized}|${r.amount}|${r.transactionDate ?? ''}|${r.account ?? ''}`;
    return `transaction:${r.jurisdictionId}:${sig}`;
  }
  if (r.kind === 'budget') {
    return `budget:${r.jurisdictionId}:${r.fiscalYear}|${r.departmentNormalized ?? ''}|${r.category ?? ''}`;
  }
  return `contract:${r.jurisdictionId}:${r.vendorNameNormalized}|${r.amount}|${r.termStart ?? ''}`;
}

/**
 * In-memory `IngestStore` — backs unit tests and the runnable demo so the full
 * pipeline (fetch → normalize → resolve → persist → events → health) works
 * end-to-end with no database. The Drizzle implementation lands in Phase 2/6.
 */
export class MemoryStore implements IngestStore {
  readonly records = new Map<string, CanonicalRecord>();
  readonly vendors = new Map<string, ResolvedVendor>();
  readonly events = new Map<string, SpendEvent>();
  readonly syncRuns: SyncRunResult[] = [];

  async saveRecords(records: CanonicalRecord[]): Promise<PersistResult> {
    let inserted = 0;
    let updated = 0;
    for (const r of records) {
      const key = recordKey(r);
      if (this.records.has(key)) updated++;
      else inserted++;
      this.records.set(key, r);
    }
    return { inserted, updated };
  }

  async saveVendors(vendors: ResolvedVendor[]): Promise<void> {
    for (const v of vendors) this.vendors.set(v.id, v);
  }

  async saveEvents(events: SpendEvent[]): Promise<number> {
    let saved = 0;
    for (const e of events) {
      if (!this.events.has(e.dedupeKey)) {
        this.events.set(e.dedupeKey, e);
        saved++;
      }
    }
    return saved;
  }

  async saveSyncRun(run: SyncRunResult): Promise<void> {
    this.syncRuns.push(run);
  }

  async recentHistory(
    jurisdictionId: string,
    datasetId: string | null,
    limit = 5,
  ): Promise<HealthHistory> {
    const priorRowsSeen = this.syncRuns
      .filter(
        (r) =>
          r.jurisdictionId === jurisdictionId &&
          (r.datasetId ?? null) === (datasetId ?? null) &&
          r.status !== 'failed',
      )
      .slice(-limit)
      .map((r) => r.rowsSeen);
    return { priorRowsSeen };
  }
}
