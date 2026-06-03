/**
 * One-off bootstrap: ingest REAL local-government spending into the database via
 * the Core pipeline, so the app runs on real data (not the demo seed).
 *
 * Config-driven across multiple jurisdictions (all key-less Socrata SODA). Run
 * all, or a subset with INGEST_ONLY:
 *
 *   pnpm --filter @govpurse/ingest bootstrap:real
 *   INGEST_ONLY=cincinnati,denver pnpm --filter @govpurse/ingest bootstrap:real
 *   INGEST_ONLY=kansas-city INGEST_MAX_ROWS=300 pnpm --filter @govpurse/ingest bootstrap:real
 *
 * Reuses the production persistence helpers (upsertVendors, refreshAggregates)
 * and the same fetch -> normalize -> resolve sequence the cron worker runs.
 * Each source row gets a unique PK so multi-line payments are not collapsed; the
 * raw snapshot is dropped to keep the table lean; the in-progress month is
 * excluded via a SoQL bound so month-over-month figures compare complete months.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { getAdapter, resolveVendors, validateDatasetConfig } from '@govpurse/core';
import type { CanonicalTransaction, DatasetConfig, FieldMapping, VendorMention } from '@govpurse/core';
import { getDb, jurisdictions, spendAggregates, spendDatasets, syncRuns, transactions } from '@govpurse/db';
import { refreshAggregates, upsertVendors } from './persistence';

for (const candidate of ['.env', '../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

// Complete months only: exclude the in-progress month from every dataset.
const MONTH_BOUND = '2026-06-01';

interface DatasetSpec {
  suffix: string;
  datasetId: string;
  soqlWhere?: string;
}

interface JurisdictionSpec {
  id: string;
  name: string;
  state: string;
  type: string;
  lat: number;
  lng: number;
  portal: string;
  fiscalYearStartMonth: number;
  dateColumn: string;
  fieldMapping: FieldMapping;
  datasets: DatasetSpec[];
}

const JURISDICTIONS: JurisdictionSpec[] = [
  {
    id: 'city-of-kansas-city-mo',
    name: 'City of Kansas City',
    state: 'MO',
    type: 'city',
    lat: 39.0997,
    lng: -94.5786,
    portal: 'https://data.kcmo.org',
    fiscalYearStartMonth: 1,
    dateColumn: 'payment_date',
    fieldMapping: {
      sourceRecordId: 'payment_no',
      vendorName: 'vendor_name',
      department: 'deptid_descr',
      category: 'account_descr',
      fund: 'fund_descr',
      amount: { from: 'payment_amount', type: 'amount' },
      transactionDate: 'payment_date',
      paymentMethod: 'payment_method',
    },
    datasets: [
      { suffix: 'cy2024', datasetId: '39kh-2k2z' },
      { suffix: 'cy2025', datasetId: 'u8bc-eqh2' },
      { suffix: 'cy2026', datasetId: 'w3zd-mhbv', soqlWhere: `payment_date < '${MONTH_BOUND}'` },
    ],
  },
  {
    id: 'city-of-cincinnati-oh',
    name: 'City of Cincinnati',
    state: 'OH',
    type: 'city',
    lat: 39.1031,
    lng: -84.512,
    portal: 'https://data.cincinnati-oh.gov',
    fiscalYearStartMonth: 7, // Cincinnati FY starts in July
    dateColumn: 'record_date',
    fieldMapping: {
      sourceRecordId: 'trans_id',
      vendorName: 'vendor_name',
      department: 'dept_desc',
      category: 'exp_acct_cat_desc',
      fund: 'fund_desc',
      amount: { from: 'amount', type: 'amount' },
      transactionDate: 'record_date',
      fiscalYear: 'fiscal_year',
    },
    datasets: [
      {
        suffix: 'vendor-payments',
        datasetId: 'qrj9-83t8',
        soqlWhere: `record_date >= '2025-01-01' AND record_date < '${MONTH_BOUND}'`,
      },
    ],
  },
  {
    id: 'city-of-denver-co',
    name: 'City and County of Denver',
    state: 'CO',
    type: 'city',
    lat: 39.7392,
    lng: -104.9903,
    portal: 'https://data.colorado.gov',
    fiscalYearStartMonth: 1,
    dateColumn: 'paymentdate',
    fieldMapping: {
      sourceRecordId: 'paymentid',
      vendorName: 'payee',
      vendorCity: 'city',
      vendorState: 'state',
      department: 'department',
      category: 'expensecategory',
      fund: 'fundingsourcedescription',
      amount: { from: 'amount', type: 'amount' },
      transactionDate: 'paymentdate',
    },
    datasets: [
      {
        suffix: 'checkbook',
        datasetId: 'wnau-xrqi',
        soqlWhere: `paymentdate >= '2024-01-01' AND paymentdate < '${MONTH_BOUND}'`,
      },
    ],
  },
];

const ONLY = (process.env.INGEST_ONLY ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const MAX_ROWS = Number(process.env.INGEST_MAX_ROWS ?? '0') || undefined;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface Entry {
  txn: CanonicalTransaction;
  rowId: string;
}

async function ingestJurisdiction(
  db: ReturnType<typeof getDb>,
  spec: JurisdictionSpec,
): Promise<void> {
  const adapter = getAdapter('socrata');
  console.log(`\n[bootstrap-real] === ${spec.name} (${spec.state}) ===`);

  await db
    .insert(jurisdictions)
    .values({
      id: spec.id,
      name: spec.name,
      state: spec.state,
      type: spec.type,
      lat: spec.lat,
      lng: spec.lng,
    })
    .onConflictDoUpdate({
      target: jurisdictions.id,
      set: { name: spec.name, state: spec.state, type: spec.type, lat: spec.lat, lng: spec.lng },
    });

  const entries: Entry[] = [];
  const stats: { rowId: string; seen: number; mapped: number; errors: number; startedAt: Date; finishedAt: Date }[] = [];

  for (const ds of spec.datasets) {
    const rowId = `${spec.id}:${ds.suffix}`;
    const config: DatasetConfig = validateDatasetConfig({
      jurisdictionId: spec.id,
      platform: 'socrata',
      portalBaseUrl: spec.portal,
      datasetId: ds.datasetId,
      apiToken: process.env.SOCRATA_APP_TOKEN || undefined,
      fieldMapping: spec.fieldMapping,
      recordType: 'transaction',
      cadence: 'monthly',
      currency: 'USD',
      fiscalYearStartMonth: spec.fiscalYearStartMonth,
      dateColumn: spec.dateColumn,
      soqlWhere: ds.soqlWhere,
    });

    await db
      .insert(spendDatasets)
      .values({
        id: rowId,
        jurisdictionId: spec.id,
        platform: 'socrata',
        portalBaseUrl: spec.portal,
        datasetId: ds.datasetId,
        fieldMapping: spec.fieldMapping as Record<string, unknown>,
        recordType: 'transaction',
        cadence: 'monthly',
        currency: 'USD',
        fiscalYearStartMonth: spec.fiscalYearStartMonth,
        dateColumn: spec.dateColumn,
        soqlWhere: ds.soqlWhere ?? null,
        sourceUrlTemplate: `${spec.portal}/d/${ds.datasetId}`,
        lastSyncedAt: new Date(),
        status: 'active',
      })
      .onConflictDoUpdate({
        target: spendDatasets.id,
        set: {
          datasetId: ds.datasetId,
          fieldMapping: spec.fieldMapping as Record<string, unknown>,
          soqlWhere: ds.soqlWhere ?? null,
          lastSyncedAt: new Date(),
          status: 'active',
        },
      });

    const startedAt = new Date();
    console.log(`[bootstrap-real] ${rowId} (${ds.datasetId}) — fetching…`);
    const raw = await adapter.fetchRaw(config, { minIntervalMs: 250, maxRows: MAX_ROWS });
    const retrievedAt = new Date().toISOString();
    let mapped = 0;
    let errors = 0;
    for (const row of raw) {
      try {
        const rec = adapter.normalize(row, config, { retrievedAt });
        if (rec.kind === 'transaction') {
          rec.sourceUrl = `${spec.portal}/d/${ds.datasetId}`;
          rec.raw = {};
          entries.push({ txn: rec, rowId });
          mapped++;
        }
      } catch {
        errors++;
      }
    }
    stats.push({ rowId, seen: raw.length, mapped, errors, startedAt, finishedAt: new Date() });
    console.log(`[bootstrap-real] ${rowId}: ${raw.length} seen, ${mapped} mapped, ${errors} errors`);
  }

  if (entries.length === 0) {
    console.warn(`[bootstrap-real] ${spec.id}: no transactions — skipping`);
    return;
  }

  const mentions: VendorMention[] = entries.map((e, i) => ({
    id: String(i),
    nameRaw: e.txn.vendorNameRaw,
    nameNormalized: e.txn.vendorNameNormalized,
    city: e.txn.vendorCity,
    state: e.txn.vendorState,
    zip: e.txn.vendorZip,
  }));
  console.log(`[bootstrap-real] resolving ${mentions.length} mentions…`);
  const resolution = resolveVendors(mentions);
  console.log(`[bootstrap-real] ${resolution.vendors.length} vendor entities`);
  await upsertVendors(db, resolution.vendors);

  console.log('[bootstrap-real] clearing prior rows for this jurisdiction…');
  await db.delete(spendAggregates).where(eq(spendAggregates.jurisdictionId, spec.id));
  await db.delete(transactions).where(eq(transactions.jurisdictionId, spec.id));

  const rows = entries.map((e, i) => {
    const t = e.txn;
    return {
      id: `${e.rowId}#${i}`,
      jurisdictionId: spec.id,
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
  const batches = chunk(rows, 1000);
  let done = 0;
  for (let b = 0; b < batches.length; b++) {
    await db.insert(transactions).values(batches[b]!);
    done += batches[b]!.length;
    if (b % 20 === 0 || b === batches.length - 1) {
      console.log(`[bootstrap-real]   inserted ${done}/${rows.length}`);
    }
  }

  console.log('[bootstrap-real] refreshing aggregates…');
  await refreshAggregates(db, spec.id);

  for (const s of stats) {
    await db.insert(syncRuns).values({
      jurisdictionId: spec.id,
      datasetId: s.rowId,
      platform: 'socrata',
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      rowsSeen: s.seen,
      rowsNew: s.mapped,
      rowsUpdated: 0,
      mappingErrors: s.errors,
      status: s.errors > s.seen * 0.5 ? 'partial' : 'success',
    });
  }
  console.log(`[bootstrap-real] ${spec.name}: done — ${rows.length} txns, ${resolution.vendors.length} vendors.`);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[bootstrap-real] DATABASE_URL is not set');
    process.exit(1);
  }
  const db = getDb(process.env.DATABASE_URL);
  const selected = JURISDICTIONS.filter(
    (j) => ONLY.length === 0 || ONLY.some((o) => j.id.includes(o) || j.name.toLowerCase().includes(o)),
  );
  if (selected.length === 0) {
    console.error(`[bootstrap-real] no jurisdictions matched INGEST_ONLY=${process.env.INGEST_ONLY}`);
    process.exit(1);
  }
  console.log(`[bootstrap-real] ingesting: ${selected.map((s) => s.id).join(', ')}`);
  for (const spec of selected) {
    await ingestJurisdiction(db, spec);
  }
  console.log('\n[bootstrap-real] ALL DONE.');
}

main().catch((err: unknown) => {
  console.error('[bootstrap-real] failed:', err);
  process.exit(1);
});
