import {
  type CanonicalTransaction,
  CoreError,
  type DatasetConfig,
  detectAnomalies,
  detectCategorySpikes,
  getAdapter,
  resolveStatus,
  resolveVendors,
  type SpendEvent,
  spikeEvents,
  type SyncRunResult,
  toAnalyticsTxns,
  transactionMentionId,
  type VendorMention,
} from '@govpurse/core';
import { sendOperatorAlert } from './alerts';
import type { Database } from './db';
import type { Env } from './env';
import {
  insertSyncRun,
  recentRowsSeen,
  refreshAggregates,
  upsertEvents,
  upsertTransactions,
  upsertVendors,
} from './persistence';
import { loadActiveWatches, transactionWatchEvents } from './watches';

/** Ingest one dataset end-to-end against the database. */
export async function ingestDataset(
  db: Database,
  config: DatasetConfig,
  env: Env,
): Promise<SyncRunResult> {
  const startedAt = new Date();
  let rowsSeen = 0;
  let mappingErrors = 0;
  let fatal = false;
  let error: string | null = null;
  let errorCode: string | null = null;
  const txns: CanonicalTransaction[] = [];

  try {
    const adapter = getAdapter(config.platform);
    const rawRows = await adapter.fetchRaw(config, { minIntervalMs: 250 });
    rowsSeen = rawRows.length;
    const ctx = { retrievedAt: startedAt.toISOString() };
    for (const row of rawRows) {
      try {
        const rec = adapter.normalize(row, config, ctx);
        if (rec.kind === 'transaction') txns.push(rec);
      } catch {
        mappingErrors++;
      }
    }
  } catch (err) {
    fatal = true;
    error = err instanceof Error ? err.message : String(err);
    errorCode = err instanceof CoreError ? err.code : null;
  }

  let rowsNew = 0;
  let rowsUpdated = 0;

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
    await upsertVendors(db, resolution.vendors);

    const counts = await upsertTransactions(db, config, txns, (t, i) =>
      resolution.assignment.get(transactionMentionId(t, i)),
    );
    rowsNew = counts.inserted;
    rowsUpdated = counts.updated;

    await refreshAggregates(db, config.jurisdictionId);

    const nameById = new Map(resolution.vendors.map((v) => [v.id, v.canonicalName]));
    const atx = toAnalyticsTxns(txns, {
      assignment: resolution.assignment,
      vendorNameById: nameById,
    });
    const watches = await loadActiveWatches(db);
    const events: SpendEvent[] = [
      ...transactionWatchEvents(atx, watches, config.jurisdictionId),
      ...spikeEvents(detectCategorySpikes(atx), config.jurisdictionId),
    ];
    await upsertEvents(db, events);
  }

  const finishedAt = new Date();
  const status = resolveStatus({ rowsSeen, mappingErrors, fatal });
  const priorRowsSeen = await recentRowsSeen(db, config.jurisdictionId, config.datasetId ?? null);
  const anomalyReasons = detectAnomalies(
    { rowsSeen, mappingErrors, status, error, errorCode },
    { priorRowsSeen },
  );

  const run: SyncRunResult = {
    jurisdictionId: config.jurisdictionId,
    datasetId: config.datasetId ?? null,
    platform: config.platform,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    rowsSeen,
    rowsNew,
    rowsUpdated,
    mappingErrors,
    status,
    anomalous: anomalyReasons.length > 0,
    anomalyReasons,
    error,
    errorCode,
  };

  await insertSyncRun(db, run);
  if (run.status === 'failed' || run.anomalous) await sendOperatorAlert(env, run);
  return run;
}
