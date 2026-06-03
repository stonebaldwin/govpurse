import { eq } from 'drizzle-orm';
import { type DatasetConfig, validateDatasetConfig } from '@govpurse/core';
import { type SpendDataset, spendDatasets } from '@govpurse/db';
import { processAlerts } from './alerts';
import { getDb } from './db';
import type { Env } from './env';
import { ingestDataset } from './ingest';

/**
 * Govpurse ingestion Worker (Phase 6).
 *
 * The cron fires often; per-dataset `cadence` (checkbook data updates monthly)
 * gates which datasets actually run, so we never hammer SODA. Socrata/CSV run
 * inline; `browser` datasets are dispatched to a Queue (Browser Rendering). Each
 * run logs a `sync_run`, refreshes `spend_aggregates`, and emits `spend_events`;
 * then the alert processor turns events into emails.
 */

const CADENCE_WINDOW_MS: Record<string, number> = {
  daily: 20 * 3_600_000,
  weekly: 6 * 86_400_000,
  monthly: 27 * 86_400_000,
};

function isDue(ds: SpendDataset, now: Date): boolean {
  if (!ds.lastSyncedAt) return true;
  const elapsed = now.getTime() - new Date(ds.lastSyncedAt).getTime();
  return elapsed >= (CADENCE_WINDOW_MS[ds.cadence] ?? 0);
}

function toConfig(ds: SpendDataset, env: Env): DatasetConfig {
  return validateDatasetConfig({
    jurisdictionId: ds.jurisdictionId,
    platform: ds.platform,
    portalBaseUrl: ds.portalBaseUrl,
    datasetId: ds.datasetId ?? undefined,
    apiToken: ds.platform === 'socrata' ? (env.SOCRATA_APP_TOKEN ?? undefined) : undefined,
    fieldMapping: ds.fieldMapping,
    recordType: ds.recordType,
    cadence: ds.cadence,
    currency: ds.currency,
    fiscalYearStartMonth: ds.fiscalYearStartMonth,
    soqlWhere: ds.soqlWhere ?? undefined,
    dateColumn: ds.dateColumn ?? undefined,
    sourceUrlTemplate: ds.sourceUrlTemplate ?? undefined,
  });
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const db = getDb(env);
    const now = new Date(controller.scheduledTime);
    const datasets = await db.select().from(spendDatasets).where(eq(spendDatasets.isActive, true));
    console.log(`[ingest] cron "${controller.cron}" — ${datasets.length} active dataset(s)`);

    for (const ds of datasets) {
      if (!isDue(ds, now)) continue;
      if (ds.platform === 'browser') {
        if (env.INGEST_QUEUE) await env.INGEST_QUEUE.send({ datasetId: ds.id });
        continue;
      }
      try {
        const run = await ingestDataset(db, toConfig(ds, env), env);
        await db
          .update(spendDatasets)
          .set({ lastSyncedAt: new Date(), status: run.status === 'failed' ? 'broken' : 'active' })
          .where(eq(spendDatasets.id, ds.id));
        console.log(`[ingest] ${ds.id}: ${run.status} (seen ${run.rowsSeen}, new ${run.rowsNew})`);
      } catch (err) {
        console.error(`[ingest] dataset ${ds.id} failed`, err);
      }
    }

    await processAlerts(db, env);
  },

  // Browser Rendering consumer for JS-rendered portals (provision the queue +
  // BROWSER binding to enable; see wrangler.jsonc). Stub until then.
  async queue(
    batch: MessageBatch<{ datasetId: string }>,
    _env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    for (const message of batch.messages) {
      console.log('[ingest/queue] browser-render job for', message.body?.datasetId);
      message.ack();
    }
  },

  async fetch(): Promise<Response> {
    return new Response('Govpurse ingest worker — scheduled + queue handlers.', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
} satisfies ExportedHandler<Env, { datasetId: string }>;
