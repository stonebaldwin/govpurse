import type { SpendEvent } from '../events/spend-events';
import type { HealthHistory, SyncRunResult } from '../health/sync-run';
import type { ResolvedVendor } from '../resolve/vendor-resolution';
import type { CanonicalRecord } from '../types';

export interface PersistResult {
  inserted: number;
  updated: number;
}

/**
 * The persistence port the ingestion pipeline writes through. Keeping this an
 * interface (not a concrete Drizzle dependency) is what keeps the Core
 * product- and schema-agnostic — Phase 2/6 supply a Drizzle-backed
 * implementation against `@govpurse/db`, and tests use the in-memory one. A
 * sibling product could supply an entirely different store.
 */
export interface IngestStore {
  /** Idempotently upsert canonical records. */
  saveRecords(records: CanonicalRecord[]): Promise<PersistResult>;
  /** Upsert resolved vendor entities (and their variant/assignment data). */
  saveVendors(vendors: ResolvedVendor[]): Promise<void>;
  /** Append spend events, deduped by `dedupeKey`; returns the number newly saved. */
  saveEvents(events: SpendEvent[]): Promise<number>;
  /** Persist one ingestion-health row. */
  saveSyncRun(run: SyncRunResult): Promise<void>;
  /** rowsSeen from recent prior (non-failed) runs, for anomaly detection. */
  recentHistory(
    jurisdictionId: string,
    datasetId: string | null,
    limit?: number,
  ): Promise<HealthHistory>;
}
