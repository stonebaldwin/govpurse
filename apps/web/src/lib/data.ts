import { and, asc, desc, eq, gte, ilike, isNotNull, lte, sql } from 'drizzle-orm';
import {
  budgets,
  coverageRequests,
  jurisdictions,
  spendAggregates,
  transactions,
  vendors,
} from '@govpurse/db';
import { num, tryGetDb } from './db';

// ── Shared DTOs ──────────────────────────────────────────────────────────────
export interface JurisdictionSummary {
  id: string;
  name: string;
  state: string;
  type: string;
  total: number;
}

export interface PeriodPoint {
  period: string;
  total: number;
  count: number;
}

export interface RankedItem {
  key: string;
  label: string;
  total: number;
  count: number;
  vendorId?: string;
}

export interface TxnRow {
  id: string;
  vendorId: string | null;
  vendor: string;
  department: string | null;
  category: string | null;
  amount: number;
  date: string | null;
  sourceUrl: string | null;
  retrievedAt: Date | null;
}

const SUM_AMOUNT = sql<string>`coalesce(sum(${transactions.amount}), 0)`;
const COUNT = sql<string>`count(*)`;
const MONTH = sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`;

// ── Jurisdictions ────────────────────────────────────────────────────────────
export async function listJurisdictions(): Promise<JurisdictionSummary[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(jurisdictions)
    .where(eq(jurisdictions.isActive, true))
    .orderBy(asc(jurisdictions.name));
  const totals = await db
    .select({
      jid: spendAggregates.jurisdictionId,
      total: sql<string>`coalesce(sum(${spendAggregates.total}), 0)`,
    })
    .from(spendAggregates)
    .where(eq(spendAggregates.dimension, 'overall'))
    .groupBy(spendAggregates.jurisdictionId);
  const totalById = new Map(totals.map((t) => [t.jid, num(t.total)]));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    state: r.state,
    type: r.type,
    total: totalById.get(r.id) ?? 0,
  }));
}

export async function countCoveredJurisdictions(): Promise<number> {
  return (await listJurisdictions()).length;
}

export interface PlatformStats {
  jurisdictions: number;
  totalSpend: number;
  payments: number;
  vendors: number;
  months: number;
  latestPeriod: string | null;
}

/** Site-wide totals for the landing page "by the numbers" strip. */
export async function getPlatformStats(): Promise<PlatformStats> {
  const empty: PlatformStats = {
    jurisdictions: 0,
    totalSpend: 0,
    payments: 0,
    vendors: 0,
    months: 0,
    latestPeriod: null,
  };
  const db = tryGetDb();
  if (!db) return empty;
  const overall = eq(spendAggregates.dimension, 'overall');
  const [[j], [agg], [v], [period]] = await Promise.all([
    db
      .select({ c: COUNT })
      .from(jurisdictions)
      .where(eq(jurisdictions.isActive, true)),
    db
      .select({
        total: sql<string>`coalesce(sum(${spendAggregates.total}), 0)`,
        cnt: sql<string>`coalesce(sum(${spendAggregates.txnCount}), 0)`,
      })
      .from(spendAggregates)
      .where(overall),
    db.select({ c: COUNT }).from(vendors),
    db
      .select({
        months: sql<string>`count(distinct ${spendAggregates.period})`,
        latest: sql<string>`max(${spendAggregates.period})`,
      })
      .from(spendAggregates)
      .where(overall),
  ]);
  return {
    jurisdictions: num(j?.c),
    totalSpend: num(agg?.total),
    payments: num(agg?.cnt),
    vendors: num(v?.c),
    months: num(period?.months),
    latestPeriod: period?.latest ?? null,
  };
}

export interface JurisdictionOverview {
  jurisdiction: { id: string; name: string; state: string; type: string };
  totalSpend: number;
  txnCount: number;
  spendByPeriod: PeriodPoint[];
  topDepartments: RankedItem[];
  topVendors: RankedItem[];
  biggestPayments: TxnRow[];
  budgetByDepartment: { department: string; budgeted: number }[];
}

export async function getJurisdictionOverview(id: string): Promise<JurisdictionOverview | null> {
  const db = tryGetDb();
  if (!db) return null;
  const [j] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1);
  if (!j) return null;

  const periods = await db
    .select({
      period: spendAggregates.period,
      total: spendAggregates.total,
      count: spendAggregates.txnCount,
    })
    .from(spendAggregates)
    .where(and(eq(spendAggregates.jurisdictionId, id), eq(spendAggregates.dimension, 'overall')))
    .orderBy(asc(spendAggregates.period));

  const depts = await db
    .select({
      key: spendAggregates.dimensionKey,
      total: spendAggregates.total,
      count: spendAggregates.txnCount,
    })
    .from(spendAggregates)
    .where(and(eq(spendAggregates.jurisdictionId, id), eq(spendAggregates.dimension, 'department')))
    .orderBy(desc(spendAggregates.total))
    .limit(8);

  const vend = await db
    .select({
      key: spendAggregates.dimensionKey,
      total: spendAggregates.total,
      count: spendAggregates.txnCount,
      name: vendors.canonicalName,
    })
    .from(spendAggregates)
    .leftJoin(vendors, eq(vendors.id, spendAggregates.dimensionKey))
    .where(and(eq(spendAggregates.jurisdictionId, id), eq(spendAggregates.dimension, 'vendor')))
    .orderBy(desc(spendAggregates.total))
    .limit(8);

  const biggest = await db
    .select({
      id: transactions.id,
      vendorId: transactions.vendorId,
      vendor: transactions.vendorNameRaw,
      department: transactions.departmentNormalized,
      category: transactions.category,
      amount: transactions.amount,
      date: transactions.transactionDate,
      sourceUrl: transactions.sourceUrl,
      retrievedAt: transactions.retrievedAt,
    })
    .from(transactions)
    .where(eq(transactions.jurisdictionId, id))
    .orderBy(desc(transactions.amount))
    .limit(10);

  const buds = await db
    .select({ department: budgets.departmentNormalized, budgeted: budgets.amountBudgeted })
    .from(budgets)
    .where(eq(budgets.jurisdictionId, id))
    .orderBy(desc(budgets.amountBudgeted));

  return {
    jurisdiction: { id: j.id, name: j.name, state: j.state, type: j.type },
    totalSpend: periods.reduce((s, p) => s + num(p.total), 0),
    txnCount: periods.reduce((s, p) => s + (p.count ?? 0), 0),
    spendByPeriod: periods
      .filter((p) => p.period)
      .map((p) => ({ period: p.period as string, total: num(p.total), count: p.count ?? 0 })),
    topDepartments: depts.map((d) => ({
      key: d.key ?? '—',
      label: d.key ?? '—',
      total: num(d.total),
      count: d.count ?? 0,
    })),
    topVendors: vend.map((v) => ({
      key: v.key ?? '—',
      label: v.name ?? v.key ?? '—',
      vendorId: v.key ?? undefined,
      total: num(v.total),
      count: v.count ?? 0,
    })),
    biggestPayments: biggest.map((b) => ({
      id: b.id,
      vendorId: b.vendorId,
      vendor: b.vendor || 'Unknown vendor',
      department: b.department,
      category: b.category,
      amount: num(b.amount),
      date: b.date,
      sourceUrl: b.sourceUrl,
      retrievedAt: b.retrievedAt,
    })),
    budgetByDepartment: buds
      .filter((b) => b.department)
      .map((b) => ({ department: b.department as string, budgeted: num(b.budgeted) })),
  };
}

// ── Vendors ──────────────────────────────────────────────────────────────────
export interface VendorProfileData {
  vendor: {
    id: string;
    canonicalName: string;
    city: string | null;
    state: string | null;
    matchConfidence: number;
  };
  totalPaid: number;
  txnCount: number;
  byJurisdiction: { jurisdictionId: string; name: string; total: number; count: number }[];
  spendByPeriod: PeriodPoint[];
  byDepartment: RankedItem[];
  byCategory: RankedItem[];
  recentTransactions: (TxnRow & { jurisdictionId: string })[];
  concentration: { jurisdictionName: string; share: number } | null;
}

export async function getVendorProfile(id: string): Promise<VendorProfileData | null> {
  const db = tryGetDb();
  if (!db) return null;
  const [v] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  if (!v) return null;

  const [totals] = await db
    .select({ total: SUM_AMOUNT, count: COUNT })
    .from(transactions)
    .where(eq(transactions.vendorId, id));

  const byJur = await db
    .select({
      jurisdictionId: transactions.jurisdictionId,
      name: jurisdictions.name,
      total: SUM_AMOUNT,
      count: COUNT,
    })
    .from(transactions)
    .leftJoin(jurisdictions, eq(jurisdictions.id, transactions.jurisdictionId))
    .where(eq(transactions.vendorId, id))
    .groupBy(transactions.jurisdictionId, jurisdictions.name)
    .orderBy(desc(SUM_AMOUNT));

  const periods = await db
    .select({ period: MONTH, total: SUM_AMOUNT, count: COUNT })
    .from(transactions)
    .where(and(eq(transactions.vendorId, id), isNotNull(transactions.transactionDate)))
    .groupBy(MONTH)
    .orderBy(asc(MONTH));

  const byDept = await db
    .select({ key: transactions.departmentNormalized, total: SUM_AMOUNT, count: COUNT })
    .from(transactions)
    .where(and(eq(transactions.vendorId, id), isNotNull(transactions.departmentNormalized)))
    .groupBy(transactions.departmentNormalized)
    .orderBy(desc(SUM_AMOUNT))
    .limit(8);

  const byCat = await db
    .select({ key: transactions.category, total: SUM_AMOUNT, count: COUNT })
    .from(transactions)
    .where(and(eq(transactions.vendorId, id), isNotNull(transactions.category)))
    .groupBy(transactions.category)
    .orderBy(desc(SUM_AMOUNT))
    .limit(8);

  const recent = await db
    .select({
      id: transactions.id,
      jurisdictionId: transactions.jurisdictionId,
      vendorId: transactions.vendorId,
      vendor: transactions.vendorNameRaw,
      department: transactions.departmentNormalized,
      category: transactions.category,
      amount: transactions.amount,
      date: transactions.transactionDate,
      sourceUrl: transactions.sourceUrl,
      retrievedAt: transactions.retrievedAt,
    })
    .from(transactions)
    .where(eq(transactions.vendorId, id))
    .orderBy(desc(transactions.transactionDate))
    .limit(25);

  // Concentration: vendor's share of its primary jurisdiction's total spend.
  let concentration: { jurisdictionName: string; share: number } | null = null;
  const primary = byJur[0];
  if (primary) {
    const [jt] = await db
      .select({ total: sql<string>`coalesce(sum(${spendAggregates.total}), 0)` })
      .from(spendAggregates)
      .where(
        and(
          eq(spendAggregates.jurisdictionId, primary.jurisdictionId),
          eq(spendAggregates.dimension, 'overall'),
        ),
      );
    const jurTotal = num(jt?.total);
    if (jurTotal > 0) {
      concentration = {
        jurisdictionName: primary.name ?? primary.jurisdictionId,
        share: num(primary.total) / jurTotal,
      };
    }
  }

  return {
    vendor: {
      id: v.id,
      canonicalName: v.canonicalName,
      city: v.city,
      state: v.state,
      matchConfidence: v.matchConfidence,
    },
    totalPaid: num(totals?.total),
    txnCount: num(totals?.count),
    byJurisdiction: byJur.map((b) => ({
      jurisdictionId: b.jurisdictionId,
      name: b.name ?? b.jurisdictionId,
      total: num(b.total),
      count: num(b.count),
    })),
    spendByPeriod: periods.map((p) => ({
      period: p.period,
      total: num(p.total),
      count: num(p.count),
    })),
    byDepartment: byDept.map((d) => ({
      key: d.key ?? '—',
      label: d.key ?? '—',
      total: num(d.total),
      count: num(d.count),
    })),
    byCategory: byCat.map((c) => ({
      key: c.key ?? '—',
      label: c.key ?? '—',
      total: num(c.total),
      count: num(c.count),
    })),
    recentTransactions: recent.map((r) => ({
      id: r.id,
      jurisdictionId: r.jurisdictionId,
      vendorId: r.vendorId,
      vendor: r.vendor || 'Unknown vendor',
      department: r.department,
      category: r.category,
      amount: num(r.amount),
      date: r.date,
      sourceUrl: r.sourceUrl,
      retrievedAt: r.retrievedAt,
    })),
    concentration,
  };
}

// ── Search / explorer ────────────────────────────────────────────────────────
export interface SearchParams {
  q?: string;
  jurisdictionId?: string;
  department?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  sort?: 'date' | 'amount' | 'vendor';
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  rows: (TxnRow & { jurisdictionId: string })[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchTransactions(params: SearchParams): Promise<SearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const db = tryGetDb();
  if (!db) return { rows: [], total: 0, page, pageSize };

  const conditions = [];
  if (params.q) conditions.push(ilike(transactions.vendorNameRaw, `%${params.q}%`));
  if (params.jurisdictionId)
    conditions.push(eq(transactions.jurisdictionId, params.jurisdictionId));
  if (params.department) conditions.push(eq(transactions.departmentNormalized, params.department));
  if (params.category) conditions.push(eq(transactions.category, params.category));
  if (params.minAmount != null) conditions.push(gte(transactions.amount, String(params.minAmount)));
  if (params.maxAmount != null) conditions.push(lte(transactions.amount, String(params.maxAmount)));
  if (params.startDate) conditions.push(gte(transactions.transactionDate, params.startDate));
  if (params.endDate) conditions.push(lte(transactions.transactionDate, params.endDate));
  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol =
    params.sort === 'amount'
      ? transactions.amount
      : params.sort === 'vendor'
        ? transactions.vendorNameRaw
        : transactions.transactionDate;
  const orderBy = (params.dir ?? 'desc') === 'asc' ? asc(sortCol) : desc(sortCol);

  const rows = await db
    .select({
      id: transactions.id,
      jurisdictionId: transactions.jurisdictionId,
      vendorId: transactions.vendorId,
      vendor: transactions.vendorNameRaw,
      department: transactions.departmentNormalized,
      category: transactions.category,
      amount: transactions.amount,
      date: transactions.transactionDate,
      sourceUrl: transactions.sourceUrl,
      retrievedAt: transactions.retrievedAt,
    })
    .from(transactions)
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total } = { total: '0' }] = await db
    .select({ total: COUNT })
    .from(transactions)
    .where(where);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      jurisdictionId: r.jurisdictionId,
      vendorId: r.vendorId,
      vendor: r.vendor || 'Unknown vendor',
      department: r.department,
      category: r.category,
      amount: num(r.amount),
      date: r.date,
      sourceUrl: r.sourceUrl,
      retrievedAt: r.retrievedAt,
    })),
    total: num(total),
    page,
    pageSize,
  };
}

export interface Facets {
  jurisdictions: { id: string; name: string }[];
  departments: string[];
  categories: string[];
}

export async function getFacets(): Promise<Facets> {
  const db = tryGetDb();
  if (!db) return { jurisdictions: [], departments: [], categories: [] };
  const js = await db
    .select({ id: jurisdictions.id, name: jurisdictions.name })
    .from(jurisdictions)
    .where(eq(jurisdictions.isActive, true))
    .orderBy(asc(jurisdictions.name));
  const depts = await db
    .selectDistinct({ d: transactions.departmentNormalized })
    .from(transactions)
    .where(isNotNull(transactions.departmentNormalized))
    .orderBy(asc(transactions.departmentNormalized))
    .limit(100);
  const cats = await db
    .selectDistinct({ c: transactions.category })
    .from(transactions)
    .where(isNotNull(transactions.category))
    .orderBy(asc(transactions.category))
    .limit(100);
  return {
    jurisdictions: js,
    departments: depts.map((d) => d.d).filter((d): d is string => d !== null),
    categories: cats.map((c) => c.c).filter((c): c is string => c !== null),
  };
}

export async function createCoverageRequest(input: {
  jurisdictionName: string;
  state?: string;
  email?: string;
  note?: string;
}): Promise<boolean> {
  const db = tryGetDb();
  if (!db) return false;
  await db.insert(coverageRequests).values({
    jurisdictionName: input.jurisdictionName,
    state: input.state ?? null,
    email: input.email ?? null,
    note: input.note ?? null,
    status: 'requested',
  });
  return true;
}
