/**
 * One-off bootstrap: ingest REAL local-government spending into the database via
 * the Core pipeline, so the app runs on real data (not the demo seed).
 *
 * Target: City of Kansas City, MO — Socrata "Vendor Payments" (one dataset per
 * calendar year) at data.kcmo.org. Key-less SODA; real vendor names.
 *
 *   pnpm --filter @govpurse/ingest bootstrap:real
 *   INGEST_YEARS=2025 INGEST_MAX_ROWS=300 pnpm --filter @govpurse/ingest bootstrap:real
 *
 * Reuses the production persistence helpers (upsertVendors, refreshAggregates)
 * and the same fetch → normalize → resolve sequence the cron worker runs. Gives
 * each source row a unique PK so multi-line payments are not collapsed, and skips
 * the bulky raw snapshot to keep the table lean at full volume.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { getAdapter, resolveVendors, validateDatasetConfig } from '@govpurse/core';
import type { CanonicalTransaction, DatasetConfig, FieldMapping, VendorMention } from '@govpurse/core';
import {
  getDb,
  jurisdictions,
  spendAggregates,
  spendDatasets,
  syncRuns,
  transactions,
} from '@govpurse/db';
import { refreshAggregates, upsertVendors } from './persistence';

// tsx does not auto-load .env (mirrors seed.ts / drizzle.config.ts).
for (const candidate of ['.env', '../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

const PORTAL = 'https://data.kcmo.org';
const JURISDICTION = {
  id: 'city-of-kansas-city-mo',
  name: 'City of Kansas City',
  state: 'MO',
  type: 'city',
  lat: 39.0997,
  lng: -94.5786,
} as const;

/** KCMO publishes one "Vendor Payments" dataset per calendar year. */
const DATASETS: Record<string, string> = {
  '2024': '39kh-2k2z',
  '2025': 'u8bc-eqh2',
  '2026': 'w3zd-mhbv',
};

const FIELD_MAPPING: FieldMapping = {
  sourceRecordId: 'payment_no',
  vendorName: 'vendor_name',
  department: 'deptid_descr',
  category: 'account_descr',
  fund: 'fund_descr',
  amount: { from: 'payment_amount', type: 'amount' },
  transactionDate: 'payment_date',
  paymentMethod: 'payment_method',
};

const YEARS = (process.env.INGEST_YEARS ?? '2024,2025,2026')
  .split(',')
  .map((y) => y.trim())
  .filter((y) => DATASETS[y]);
const MAX_ROWS = Number(process.env.INGEST_MAX_ROWS ?? '0') || undefined;

const datasetRowId = (year: string): string => `${JURISDICTION.id}:cy${year}`;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface Entry {
  txn: CanonicalTransaction;
  rowId: string;
}

interface YearStat {
  year: string;
  seen: number;
  mapped: number;
  mappingErrors: number;
  startedAt: Date;
  finishedAt: Date;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[bootstrap-real] DATABASE_URL is not set');
    process.exit(1);
  }
  const db = getDb(process.env.DATABASE_URL);
  const adapter = getAdapter('socrata');
  console.log(`[bootstrap-real] ${JURISDICTION.name} (${JURISDICTION.state}) — years: ${YEARS.join(', ')}`);

  // 1. Jurisdiction row.
  await db
    .insert(jurisdictions)
    .values({ ...JURISDICTION })
    .onConflictDoUpdate({
      target: jurisdictions.id,
      set: {
        name: JURISDICTION.name,
        state: JURISDICTION.state,
        type: JURISDICTION.type,
        lat: JURISDICTION.lat,
        lng: JURISDICTION.lng,
      },
    });

  // 2. Fetch + normalize each year (dataset rows inserted first for the FK).
  const entries: Entry[] = [];
  const stats: YearStat[] = [];
  for (const year of YEARS) {
    const dsId = DATASETS[year]!;
    const rowId = datasetRowId(year);
    const config: DatasetConfig = validateDatasetConfig({
      jurisdictionId: JURISDICTION.id,
      platform: 'socrata',
      portalBaseUrl: PORTAL,
      datasetId: dsId,
      apiToken: process.env.SOCRATA_APP_TOKEN || undefined,
      fieldMapping: FIELD_MAPPING,
      recordType: 'transaction',
      cadence: 'monthly',
      currency: 'USD',
      fiscalYearStartMonth: 1, // KCMO publishes per calendar year
      dateColumn: 'payment_date',
    });

    await db
      .insert(spendDatasets)
      .values({
        id: rowId,
        jurisdictionId: JURISDICTION.id,
        platform: 'socrata',
        portalBaseUrl: PORTAL,
        datasetId: dsId,
        fieldMapping: FIELD_MAPPING as Record<string, unknown>,
        recordType: 'transaction',
        cadence: 'monthly',
        currency: 'USD',
        fiscalYearStartMonth: 1,
        dateColumn: 'payment_date',
        sourceUrlTemplate: `${PORTAL}/d/${dsId}`,
        lastSyncedAt: new Date(),
        status: 'active',
      })
      .onConflictDoUpdate({
        target: spendDatasets.id,
        set: {
          datasetId: dsId,
          fieldMapping: FIELD_MAPPING as Record<string, unknown>,
          lastSyncedAt: new Date(),
          status: 'active',
        },
      });

    const startedAt = new Date();
    console.log(`[bootstrap-real] CY${year} (${dsId}) — fetching…`);
    const raw = await adapter.fetchRaw(config, { minIntervalMs: 250, maxRows: MAX_ROWS });
    const retrievedAt = new Date().toISOString();
    let mapped = 0;
    let mappingErrors = 0;
    for (const row of raw) {
      try {
        const rec = adapter.normalize(row, config, { retrievedAt });
        if (rec.kind === 'transaction') {
          rec.sourceUrl = `${PORTAL}/d/${dsId}`;
          rec.raw = {}; // drop bulky snapshot — keeps memory + DB lean at full volume
          entries.push({ txn: rec, rowId });
          mapped++;
        }
      } catch {
        mappingErrors++;
      }
    }
    const finishedAt = new Date();
    stats.push({ year, seen: raw.length, mapped, mappingErrors, startedAt, finishedAt });
    console.log(`[bootstrap-real] CY${year}: ${raw.length} seen, ${mapped} mapped, ${mappingErrors} errors`);
  }
  console.log(`[bootstrap-real] total ${entries.length} transactions across ${YEARS.length} year(s)`);
  if (entries.length === 0) {
    console.error('[bootstrap-real] no transactions — aborting');
    process.exit(1);
  }

  // 3. Resolve vendors over ALL rows (precise per-row mention ids).
  const mentions: VendorMention[] = entries.map((e, i) => ({
    id: String(i),
    nameRaw: e.txn.vendorNameRaw,
    nameNormalized: e.txn.vendorNameNormalized,
    city: e.txn.vendorCity,
    state: e.txn.vendorState,
    zip: e.txn.vendorZip,
  }));
  console.log('[bootstrap-real] resolving vendor entities…');
  const resolution = resolveVendors(mentions);
  console.log(`[bootstrap-real] ${resolution.vendors.length} vendor entities`);
  await upsertVendors(db, resolution.vendors);

  // 4. Replace this jurisdiction's transactions + rollups.
  console.log('[bootstrap-real] clearing prior rows for this jurisdiction…');
  await db.delete(spendAggregates).where(eq(spendAggregates.jurisdictionId, JURISDICTION.id));
  await db.delete(transactions).where(eq(transactions.jurisdictionId, JURISDICTION.id));

  const rows = entries.map((e, i) => {
    const t = e.txn;
    return {
      id: `${e.rowId}#${i}`,
      jurisdictionId: JURISDICTION.id,
      datasetId: e.rowId,
      vendorId: resolution.assignment.get(String(i)) ?? null,
      sourceRecordId: t.sourceRecordId,
      vendorNameRaw: t.vendorNameRaw,
      vendorNameNormalized: t.vendorNameNormalized,
      vendorCity: t.vendorCity,
      vendorState: t.vendorState,
      vendorZip: t.vendorZip,
      departmentRaw: t.departmentRaw,
      departmentNormalized: t.departmentNormalized,
      category: t.category,
      fund: t.fund,
      account: t.account,
      amount: String(t.amount),
      currency: t.currency,
      transactionDate: t.transactionDate,
      fiscalYear: t.fiscalYear,
      paymentMethod: t.paymentMethod,
      poNumber: t.poNumber,
      procurementMethod: t.procurementMethod,
      procurementMethodRaw: t.procurementMethodRaw,
      description: t.description,
      sourceUrl: t.sourceUrl,
      retrievedAt: new Date(t.retrievedAt),
      rawSnapshot: null,
    };
  });

  console.log(`[bootstrap-real] inserting ${rows.length} transactions…`);
  let done = 0;
  const batches = chunk(rows, 1000);
  for (let b = 0; b < batches.length; b++) {
    await db.insert(transactions).values(batches[b]!);
    done += batches[b]!.length;
    if (b % 10 === 0 || b === batches.length - 1) {
      console.log(`[bootstrap-real]   inserted ${done}/${rows.length}`);
    }
  }

  // 5. Recompute rollups (overall monthly + department/vendor/category totals).
  console.log('[bootstrap-real] refreshing aggregates…');
  await refreshAggregates(db, JURISDICTION.id);

  // 6. Sync-run bookkeeping (feeds the admin health cockpit).
  for (const s of stats) {
    await db.insert(syncRuns).values({
      jurisdictionId: JURISDICTION.id,
      datasetId: datasetRowId(s.year),
      platform: 'socrata',
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      rowsSeen: s.seen,
      rowsNew: s.mapped,
      rowsUpdated: 0,
      mappingErrors: s.mappingErrors,
      status: s.mappingErrors > s.seen * 0.5 ? 'partial' : 'success',
    });
  }

  console.log(
    `[bootstrap-real] DONE — ${rows.length} transactions, ${resolution.vendors.length} vendors, ${YEARS.length} year(s).`,
  );
}

main().catch((err: unknown) => {
  console.error('[bootstrap-real] failed:', err);
  process.exit(1);
});
