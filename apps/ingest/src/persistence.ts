import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type {
  CanonicalTransaction,
  DatasetConfig,
  ResolvedVendor,
  SpendEvent,
  SyncRunResult,
} from '@govpurse/core';
import { spendAggregates, spendEvents, syncRuns, transactions, vendors } from '@govpurse/db';
import type { Database } from './db';

const SUM = sql<string>`coalesce(sum(${transactions.amount}), 0)`;
const COUNT = sql<string>`count(*)`;
const MONTH = sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** djb2 hash → short stable base-36 token. */
function hashRow(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * Deterministic transaction PK so re-ingestion updates rather than duplicates.
 *
 * The source record id (check / payment number) is shared across the multiple
 * line items of a single payment, so it is NOT unique on its own — keying on it
 * alone collapses a payment's lines into one row (dropping the majority of rows
 * for line-itemized portals). We hash the full raw source row (each line differs
 * in voucher / account / line-no) to keep every line, while staying stable across
 * re-runs (identical raw row → identical id → idempotent upsert).
 */
export function transactionDbId(
  jurisdictionId: string,
  txn: CanonicalTransaction,
  index: number,
): string {
  const raw =
    txn.raw && Object.keys(txn.raw).length > 0
      ? JSON.stringify(txn.raw)
      : `${txn.vendorNameNormalized}|${txn.amount}|${txn.transactionDate ?? ''}|${index}`;
  const prefix = txn.sourceRecordId ? `${txn.sourceRecordId}:` : '';
  return `${jurisdictionId}:${prefix}${hashRow(raw)}`;
}

export async function upsertVendors(db: Database, list: ResolvedVendor[]): Promise<void> {
  for (const group of chunk(list, 500)) {
    await db
      .insert(vendors)
      .values(
        group.map((v) => ({
          id: v.id,
          canonicalName: v.canonicalName,
          normalizedName: v.normalizedName,
          city: v.city,
          state: v.state,
          zip: v.zip,
          matchConfidence: v.matchConfidence,
          variants: v.variants,
          mentionCount: v.mentionIds.length,
        })),
      )
      .onConflictDoUpdate({
        target: vendors.id,
        set: {
          canonicalName: sql`excluded.canonical_name`,
          normalizedName: sql`excluded.normalized_name`,
          city: sql`excluded.city`,
          state: sql`excluded.state`,
          zip: sql`excluded.zip`,
          matchConfidence: sql`excluded.match_confidence`,
          variants: sql`excluded.variants`,
          mentionCount: sql`excluded.mention_count`,
          updatedAt: new Date(),
        },
      });
  }
}

export async function upsertTransactions(
  db: Database,
  config: DatasetConfig,
  txns: CanonicalTransaction[],
  vendorIdFor: (txn: CanonicalTransaction, index: number) => string | undefined,
): Promise<{ inserted: number; updated: number }> {
  const byId = new Map<string, ReturnType<typeof toRow>>();
  txns.forEach((t, i) => {
    const row = toRow(config, t, i, vendorIdFor(t, i) ?? null);
    byId.set(row.id, row);
  });
  const rows = [...byId.values()];
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  const existing = new Set<string>();
  for (const ids of chunk(
    rows.map((r) => r.id),
    1000,
  )) {
    const found = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(inArray(transactions.id, ids));
    for (const f of found) existing.add(f.id);
  }

  for (const group of chunk(rows, 500)) {
    await db
      .insert(transactions)
      .values(group)
      .onConflictDoUpdate({
        target: transactions.id,
        set: {
          vendorId: sql`excluded.vendor_id`,
          datasetId: sql`excluded.dataset_id`,
          vendorNameRaw: sql`excluded.vendor_name_raw`,
          vendorNameNormalized: sql`excluded.vendor_name_normalized`,
          vendorCity: sql`excluded.vendor_city`,
          vendorState: sql`excluded.vendor_state`,
          vendorZip: sql`excluded.vendor_zip`,
          departmentRaw: sql`excluded.department_raw`,
          departmentNormalized: sql`excluded.department_normalized`,
          category: sql`excluded.category`,
          fund: sql`excluded.fund`,
          account: sql`excluded.account`,
          amount: sql`excluded.amount`,
          transactionDate: sql`excluded.transaction_date`,
          fiscalYear: sql`excluded.fiscal_year`,
          paymentMethod: sql`excluded.payment_method`,
          poNumber: sql`excluded.po_number`,
          procurementMethod: sql`excluded.procurement_method`,
          procurementMethodRaw: sql`excluded.procurement_method_raw`,
          description: sql`excluded.description`,
          sourceUrl: sql`excluded.source_url`,
          retrievedAt: sql`excluded.retrieved_at`,
          rawSnapshot: sql`excluded.raw_snapshot`,
        },
      });
  }

  const inserted = rows.filter((r) => !existing.has(r.id)).length;
  return { inserted, updated: rows.length - inserted };
}

function toRow(
  config: DatasetConfig,
  t: CanonicalTransaction,
  index: number,
  vendorId: string | null,
) {
  return {
    id: transactionDbId(config.jurisdictionId, t, index),
    jurisdictionId: config.jurisdictionId,
    datasetId: config.datasetId ?? null,
    vendorId,
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
    rawSnapshot: t.raw,
  };
}

/** Recompute the jurisdiction's pre-aggregated rollups from the transactions table. */
export async function refreshAggregates(db: Database, jurisdictionId: string): Promise<void> {
  const jur = eq(transactions.jurisdictionId, jurisdictionId);

  const overall = await db
    .select({ period: MONTH, total: SUM, count: COUNT })
    .from(transactions)
    .where(and(jur, isNotNull(transactions.transactionDate)))
    .groupBy(MONTH);
  const byDept = await db
    .select({ key: transactions.departmentNormalized, total: SUM, count: COUNT })
    .from(transactions)
    .where(and(jur, isNotNull(transactions.departmentNormalized)))
    .groupBy(transactions.departmentNormalized);
  const byVendor = await db
    .select({ key: transactions.vendorId, total: SUM, count: COUNT })
    .from(transactions)
    .where(and(jur, isNotNull(transactions.vendorId)))
    .groupBy(transactions.vendorId);
  const byCat = await db
    .select({ key: transactions.category, total: SUM, count: COUNT })
    .from(transactions)
    .where(and(jur, isNotNull(transactions.category)))
    .groupBy(transactions.category);

  const rows = [
    ...overall.map((r) => ({
      jurisdictionId,
      dimension: 'overall',
      dimensionKey: null,
      period: r.period,
      total: r.total,
      txnCount: Number(r.count),
    })),
    ...byDept.map((r) => ({
      jurisdictionId,
      dimension: 'department',
      dimensionKey: r.key,
      period: null,
      total: r.total,
      txnCount: Number(r.count),
    })),
    ...byVendor.map((r) => ({
      jurisdictionId,
      dimension: 'vendor',
      dimensionKey: r.key,
      period: null,
      total: r.total,
      txnCount: Number(r.count),
    })),
    ...byCat.map((r) => ({
      jurisdictionId,
      dimension: 'category',
      dimensionKey: r.key,
      period: null,
      total: r.total,
      txnCount: Number(r.count),
    })),
  ];

  await db.delete(spendAggregates).where(eq(spendAggregates.jurisdictionId, jurisdictionId));
  for (const group of chunk(rows, 500)) {
    if (group.length) await db.insert(spendAggregates).values(group);
  }
}

/** Insert events, deduped by dedupeKey. Returns the count newly saved. */
export async function upsertEvents(db: Database, events: SpendEvent[]): Promise<number> {
  if (events.length === 0) return 0;
  let saved = 0;
  for (const group of chunk(events, 500)) {
    const res = await db
      .insert(spendEvents)
      .values(
        group.map((e) => ({
          type: e.type,
          jurisdictionId: e.jurisdictionId,
          vendorId: e.vendorId,
          vendorName: e.vendorName,
          department: e.department,
          category: e.category,
          period: e.period,
          amount: e.amount != null ? String(e.amount) : null,
          value: String(e.value),
          occurredAt: e.occurredAt,
          detail: e.detail,
          dedupeKey: e.dedupeKey,
          watchId: e.watchId,
        })),
      )
      .onConflictDoNothing({ target: spendEvents.dedupeKey })
      .returning({ id: spendEvents.id });
    saved += res.length;
  }
  return saved;
}

export async function insertSyncRun(db: Database, run: SyncRunResult): Promise<void> {
  await db.insert(syncRuns).values({
    jurisdictionId: run.jurisdictionId,
    datasetId: run.datasetId,
    platform: run.platform,
    startedAt: new Date(run.startedAt),
    finishedAt: new Date(run.finishedAt),
    rowsSeen: run.rowsSeen,
    rowsNew: run.rowsNew,
    rowsUpdated: run.rowsUpdated,
    mappingErrors: run.mappingErrors,
    status: run.status,
    anomalous: run.anomalous,
    anomalyReasons: run.anomalyReasons,
    error: run.error,
    errorCode: run.errorCode,
  });
}

export async function recentRowsSeen(
  db: Database,
  jurisdictionId: string,
  datasetId: string | null,
  limit = 5,
): Promise<number[]> {
  const rows = await db
    .select({ rowsSeen: syncRuns.rowsSeen, finishedAt: syncRuns.finishedAt })
    .from(syncRuns)
    .where(
      and(
        eq(syncRuns.jurisdictionId, jurisdictionId),
        datasetId ? eq(syncRuns.datasetId, datasetId) : sql`${syncRuns.datasetId} is null`,
        sql`${syncRuns.status} <> 'failed'`,
      ),
    )
    .orderBy(sql`${syncRuns.finishedAt} desc`)
    .limit(limit);
  return rows.map((r) => r.rowsSeen);
}
