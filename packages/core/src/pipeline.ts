import { getAdapter } from './adapters/registry';
import type { FetchOptions } from './adapters/types';
import { detectCategorySpikes } from './analytics/spikes';
import { toAnalyticsTxns, transactionMentionId } from './analytics/types';
import type { DatasetConfig } from './config';
import { CoreError } from './errors';
import {
  detectTransactionEvents,
  type SpendEvent,
  type SpendWatch,
  spikeEvents,
} from './events/spend-events';
import {
  detectAnomalies,
  type OnUnhealthy,
  resolveStatus,
  type SyncRunResult,
} from './health/sync-run';
import { resolveVendors, type VendorMention } from './resolve/vendor-resolution';
import type { IngestStore } from './store/ports';
import type { CanonicalRecord, CanonicalTransaction } from './types';

export interface IngestDeps {
  store: IngestStore;
  /** Active alert criteria to evaluate the new data against (Phase 6 supplies). */
  watches?: SpendWatch[];
  /** Called when a run is failed or anomalous (wired to Resend in Phase 6). */
  onUnhealthy?: OnUnhealthy;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

export type IngestOptions = FetchOptions;

/**
 * Run one dataset end-to-end: fetch → normalize (per-row, isolating mapping
 * failures) → persist → resolve vendors → compute analytics → emit events →
 * record health. Returns the `SyncRunResult`. Never throws for per-row or portal
 * problems — they're captured into the health record and the `onUnhealthy` hook.
 */
export async function runIngest(
  config: DatasetConfig,
  deps: IngestDeps,
  options: IngestOptions = {},
): Promise<SyncRunResult> {
  const clock = deps.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const adapter = getAdapter(config.platform);

  let rowsSeen = 0;
  let mappingErrors = 0;
  let fatal = false;
  let error: string | null = null;
  let errorCode: string | null = null;
  const records: CanonicalRecord[] = [];

  try {
    const rawRows = await adapter.fetchRaw(config, options);
    rowsSeen = rawRows.length;
    const ctx = { retrievedAt: startedAt };
    for (const row of rawRows) {
      try {
        records.push(adapter.normalize(row, config, ctx));
      } catch {
        mappingErrors++; // isolate a bad row; the run continues
      }
    }
  } catch (err) {
    fatal = true;
    error = err instanceof Error ? err.message : String(err);
    errorCode = err instanceof CoreError ? err.code : null;
  }

  const persist = records.length
    ? await deps.store.saveRecords(records)
    : { inserted: 0, updated: 0 };

  const events: SpendEvent[] = [];
  const txns = records.filter((r): r is CanonicalTransaction => r.kind === 'transaction');
  if (txns.length > 0) {
    const mentions: VendorMention[] = txns.map((t, i) => ({
      id: transactionMentionId(t, i),
      nameRaw: t.vendorNameRaw,
      nameNormalized: t.vendorNameNormalized,
      city: t.vendorCity,
      state: t.vendorState,
      zip: t.vendorZip,
    }));
    const resolution = resolveVendors(mentions);
    await deps.store.saveVendors(resolution.vendors);

    const vendorNameById = new Map(resolution.vendors.map((v) => [v.id, v.canonicalName]));
    const analyticsTxns = toAnalyticsTxns(txns, {
      assignment: resolution.assignment,
      vendorNameById,
    });

    if (deps.watches?.length) {
      events.push(...detectTransactionEvents(analyticsTxns, deps.watches, config.jurisdictionId));
    }
    // Spike detection here runs over the ingested window. Phase 6 recomputes over
    // full stored history for production-grade baselines.
    events.push(
      ...spikeEvents(detectCategorySpikes(analyticsTxns), config.jurisdictionId, deps.watches),
    );
  }

  if (events.length > 0) await deps.store.saveEvents(events);

  const finishedAt = clock().toISOString();
  const status = resolveStatus({ rowsSeen, mappingErrors, fatal });
  const history = await deps.store.recentHistory(config.jurisdictionId, config.datasetId ?? null);
  const anomalyReasons = detectAnomalies(
    { rowsSeen, mappingErrors, status, error, errorCode },
    history,
  );

  const run: SyncRunResult = {
    jurisdictionId: config.jurisdictionId,
    datasetId: config.datasetId ?? null,
    platform: config.platform,
    startedAt,
    finishedAt,
    rowsSeen,
    rowsNew: persist.inserted,
    rowsUpdated: persist.updated,
    mappingErrors,
    status,
    anomalous: anomalyReasons.length > 0,
    anomalyReasons,
    error,
    errorCode,
  };

  await deps.store.saveSyncRun(run);
  if (run.status === 'failed' || run.anomalous) await deps.onUnhealthy?.(run);
  return run;
}
