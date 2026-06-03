import { desc, sql } from 'drizzle-orm';
import { coverageRequests, jurisdictions, syncRuns, transactions, vendors } from '@govpurse/db';
import { num, tryGetDb } from './db';

export interface DatasetHealthRow {
  jurisdictionId: string;
  datasetId: string | null;
  status: string;
  anomalous: boolean;
  anomalyReasons: string[];
  rowsSeen: number;
  mappingErrors: number;
  finishedAt: Date;
}

export async function getDatasetHealth(): Promise<DatasetHealthRow[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db
    .selectDistinctOn([syncRuns.jurisdictionId, syncRuns.datasetId], {
      jurisdictionId: syncRuns.jurisdictionId,
      datasetId: syncRuns.datasetId,
      status: syncRuns.status,
      anomalous: syncRuns.anomalous,
      anomalyReasons: syncRuns.anomalyReasons,
      rowsSeen: syncRuns.rowsSeen,
      mappingErrors: syncRuns.mappingErrors,
      finishedAt: syncRuns.finishedAt,
    })
    .from(syncRuns)
    .orderBy(syncRuns.jurisdictionId, syncRuns.datasetId, desc(syncRuns.finishedAt));
  return rows;
}

export interface ReviewVendor {
  id: string;
  canonicalName: string;
  matchConfidence: number;
  variants: string[];
  state: string | null;
}

export async function getReviewQueue(limit = 50): Promise<ReviewVendor[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: vendors.id,
      canonicalName: vendors.canonicalName,
      matchConfidence: vendors.matchConfidence,
      variants: vendors.variants,
      state: vendors.state,
    })
    .from(vendors)
    .where(sql`${vendors.matchConfidence} < 1`)
    .orderBy(vendors.matchConfidence)
    .limit(limit);
  return rows;
}

export async function getCoverageRequests(limit = 100) {
  const db = tryGetDb();
  if (!db) return [];
  return db.select().from(coverageRequests).orderBy(desc(coverageRequests.createdAt)).limit(limit);
}

export interface VolumeMetrics {
  jurisdictions: number;
  vendors: number;
  transactions: number;
  totalSpend: number;
}

export async function getVolumeMetrics(): Promise<VolumeMetrics> {
  const db = tryGetDb();
  if (!db) return { jurisdictions: 0, vendors: 0, transactions: 0, totalSpend: 0 };
  const [j] = await db.select({ n: sql<string>`count(*)` }).from(jurisdictions);
  const [v] = await db.select({ n: sql<string>`count(*)` }).from(vendors);
  const [t] = await db
    .select({
      n: sql<string>`count(*)`,
      total: sql<string>`coalesce(sum(${transactions.amount}),0)`,
    })
    .from(transactions);
  return {
    jurisdictions: num(j?.n),
    vendors: num(v?.n),
    transactions: num(t?.n),
    totalSpend: num(t?.total),
  };
}
