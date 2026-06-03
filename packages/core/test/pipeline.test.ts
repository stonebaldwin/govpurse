import { describe, expect, it } from 'vitest';
import type { DatasetConfig } from '../src/config';
import type { SpendWatch } from '../src/events/spend-events';
import type { SyncRunResult } from '../src/health/sync-run';
import { runIngest } from '../src/pipeline';
import { MemoryStore } from '../src/store/memory-store';

const csvConfig: DatasetConfig = {
  jurisdictionId: 'demo-city',
  platform: 'csv',
  portalBaseUrl: 'https://example.test/checkbook.csv',
  recordType: 'transaction',
  cadence: 'monthly',
  fieldMapping: {
    sourceRecordId: 'id',
    vendorName: 'vendor',
    department: 'dept',
    amount: 'amount',
    transactionDate: 'date',
    procurementMethod: 'proc',
  },
};

const CSV = `id,vendor,dept,amount,date,proc
1,Acme Inc,Public Works,1000,2025-01-15,Sole Source
2,ACME INC.,Public Works,2000,2025-02-15,Sole Source
3,Acme Inc,Public Works,3000,2025-03-15,Sole Source
4,Globex LLC,Parks,500,2025-01-20,Competitive Bid`;

const fixedNow = () => new Date('2026-06-03T00:00:00.000Z');
const noopSleep = () => Promise.resolve();
const csvFetch = async () => new Response(CSV, { status: 200 });

describe('runIngest', () => {
  it('runs end-to-end: persists records, resolves vendors, records a healthy run', async () => {
    const store = new MemoryStore();
    const run = await runIngest(
      csvConfig,
      { store, now: fixedNow },
      { fetchImpl: csvFetch, sleep: noopSleep },
    );

    expect(run.status).toBe('success');
    expect(run.rowsSeen).toBe(4);
    expect(run.rowsNew).toBe(4);
    expect(run.anomalous).toBe(false);
    expect(store.records.size).toBe(4);
    // "Acme Inc" + "ACME INC." resolve together → 2 vendors (Acme, Globex).
    expect(store.vendors.size).toBe(2);
    expect(store.syncRuns).toHaveLength(1);
  });

  it('is idempotent on re-ingest (updates, not duplicates)', async () => {
    const store = new MemoryStore();
    await runIngest(csvConfig, { store, now: fixedNow }, { fetchImpl: csvFetch, sleep: noopSleep });
    const second = await runIngest(
      csvConfig,
      { store, now: fixedNow },
      { fetchImpl: csvFetch, sleep: noopSleep },
    );
    expect(second.rowsNew).toBe(0);
    expect(second.rowsUpdated).toBe(4);
    expect(store.records.size).toBe(4);
  });

  it('emits threshold-exceeded events for a matching watch', async () => {
    const store = new MemoryStore();
    const watch: SpendWatch = { id: 'w1', kind: 'threshold', minAmount: 2500 };
    await runIngest(
      csvConfig,
      { store, now: fixedNow, watches: [watch] },
      { fetchImpl: csvFetch, sleep: noopSleep },
    );
    const threshold = [...store.events.values()].filter((e) => e.type === 'threshold-exceeded');
    expect(threshold).toHaveLength(1); // only the $3,000 row clears $2,500
    expect(threshold[0]!.amount).toBe(3000);
  });

  it('records a failed run and calls onUnhealthy when the source errors', async () => {
    const store = new MemoryStore();
    let unhealthy: SyncRunResult | null = null;
    const run = await runIngest(
      csvConfig,
      {
        store,
        now: fixedNow,
        onUnhealthy: (r) => {
          unhealthy = r;
        },
      },
      { fetchImpl: async () => new Response('err', { status: 500 }), sleep: noopSleep },
    );
    expect(run.status).toBe('failed');
    expect(unhealthy).not.toBeNull();
  });

  it('flags a portal-shape change as anomalous', async () => {
    const store = new MemoryStore();
    const socrataConfig: DatasetConfig = {
      jurisdictionId: 'demo',
      platform: 'socrata',
      portalBaseUrl: 'https://data.example.gov',
      datasetId: 'abcd-1234',
      recordType: 'transaction',
      cadence: 'monthly',
      fieldMapping: { vendorName: 'vendor', amount: 'amount' },
    };
    let unhealthy: SyncRunResult | null = null;
    const run = await runIngest(
      socrataConfig,
      {
        store,
        now: fixedNow,
        onUnhealthy: (r) => {
          unhealthy = r;
        },
      },
      {
        fetchImpl: async () => new Response('{"error":true}', { status: 400 }),
        sleep: noopSleep,
        minIntervalMs: 0,
      },
    );
    expect(run.status).toBe('failed');
    expect(run.errorCode).toBe('portal_shape_changed');
    expect(run.anomalous).toBe(true);
    expect(run.anomalyReasons.join(' ')).toMatch(/shape/i);
    expect(unhealthy).not.toBeNull();
  });
});
