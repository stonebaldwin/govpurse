import { and, asc, desc, eq, gte, ilike, isNotNull, lte, not, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
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

/**
 * Non-operational money flows — debt service / bond payments, payroll-clearing,
 * pension & retirement transfers, warrants-payable and interfund pass-throughs.
 * These dominate raw "top vendors" (bond trustees, payroll banks) and are
 * low-signal for a watchdog view, so we let pages exclude them. Classification
 * uses the (100%-populated) `category` and `fund` columns. `coalesce` so rows
 * with null tags are treated as operational (we don't assume).
 */
const NON_OPERATIONAL = sql`(
  coalesce(${transactions.category}, '') ~* '\\(ds\\)\\s*$|warrants payable|pension|retirement (plan|system)|debt service|principal retirement|interest expense'
  OR coalesce(${transactions.fund}, '') ~* 'debt|bond|payroll clearing|retirement'
)`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Jurisdictions ────────────────────────────────────────────────────────────
export async function listJurisdictions(): Promise<JurisdictionSummary[]> {
  const db = tryGetDb();
  if (!db) return [];
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(jurisdictions)
      .where(eq(jurisdictions.isActive, true))
      .orderBy(asc(jurisdictions.name)),
    db
      .select({
        jid: spendAggregates.jurisdictionId,
        total: sql<string>`coalesce(sum(${spendAggregates.total}), 0)`,
      })
      .from(spendAggregates)
      .where(eq(spendAggregates.dimension, 'overall'))
      .groupBy(spendAggregates.jurisdictionId),
  ]);
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
    db.select({ c: COUNT }).from(jurisdictions).where(eq(jurisdictions.isActive, true)),
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
  /** Operational vendors — excludes debt service, payroll & pension transfers. */
  topVendors: RankedItem[];
  /** All payees incl. debt service / payroll (raw rollup). */
  topPayeesAll: RankedItem[];
  biggestPayments: TxnRow[];
  budgetByDepartment: { department: string; budgeted: number }[];
}

export async function getJurisdictionOverview(id: string): Promise<JurisdictionOverview | null> {
  const db = tryGetDb();
  if (!db) return null;
  const [j] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1);
  if (!j) return null;

  const jur = eq(spendAggregates.jurisdictionId, id);
  const [periods, depts, payeesAll, opVendors, biggest, buds] = await Promise.all([
    db
      .select({
        period: spendAggregates.period,
        total: spendAggregates.total,
        count: spendAggregates.txnCount,
      })
      .from(spendAggregates)
      .where(and(jur, eq(spendAggregates.dimension, 'overall')))
      .orderBy(asc(spendAggregates.period)),
    db
      .select({
        key: spendAggregates.dimensionKey,
        total: spendAggregates.total,
        count: spendAggregates.txnCount,
      })
      .from(spendAggregates)
      .where(and(jur, eq(spendAggregates.dimension, 'department')))
      .orderBy(desc(spendAggregates.total))
      .limit(8),
    // All payees (raw rollup — includes bond trustees, payroll banks).
    db
      .select({
        key: spendAggregates.dimensionKey,
        total: spendAggregates.total,
        count: spendAggregates.txnCount,
        name: vendors.canonicalName,
      })
      .from(spendAggregates)
      .leftJoin(vendors, eq(vendors.id, spendAggregates.dimensionKey))
      .where(and(jur, eq(spendAggregates.dimension, 'vendor')))
      .orderBy(desc(spendAggregates.total))
      .limit(8),
    // Operational vendors — computed live, excluding non-operational flows.
    db
      .select({
        key: transactions.vendorId,
        total: SUM_AMOUNT,
        count: COUNT,
        name: vendors.canonicalName,
      })
      .from(transactions)
      .leftJoin(vendors, eq(vendors.id, transactions.vendorId))
      .where(
        and(eq(transactions.jurisdictionId, id), isNotNull(transactions.vendorId), not(NON_OPERATIONAL)),
      )
      .groupBy(transactions.vendorId, vendors.canonicalName)
      .orderBy(desc(SUM_AMOUNT))
      .limit(8),
    db
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
      .limit(10),
    db
      .select({ department: budgets.departmentNormalized, budgeted: budgets.amountBudgeted })
      .from(budgets)
      .where(eq(budgets.jurisdictionId, id))
      .orderBy(desc(budgets.amountBudgeted)),
  ]);

  const toRanked = (
    r: { key: string | null; total: string; count: number | string; name?: string | null },
  ): RankedItem => ({
    key: r.key ?? '—',
    label: r.name ?? r.key ?? '—',
    vendorId: r.key ?? undefined,
    total: num(r.total),
    count: num(r.count),
  });

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
    topVendors: opVendors.map(toRanked),
    topPayeesAll: payeesAll.map(toRanked),
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
  recentTransactions: (TxnRow & { jurisdictionId: string; jurisdictionName: string })[];
  concentration: { jurisdictionName: string; share: number } | null;
}

export async function getVendorProfile(id: string): Promise<VendorProfileData | null> {
  const db = tryGetDb();
  if (!db) return null;
  const [v] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  if (!v) return null;

  // All independent of each other — run concurrently (neon-http has no pipelining,
  // so each await was a separate serial round-trip).
  const [byJur, periods, byDept, byCat, recent] = await Promise.all([
    db
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
      .orderBy(desc(SUM_AMOUNT)),
    db
      .select({ period: MONTH, total: SUM_AMOUNT, count: COUNT })
      .from(transactions)
      .where(and(eq(transactions.vendorId, id), isNotNull(transactions.transactionDate)))
      .groupBy(MONTH)
      .orderBy(asc(MONTH)),
    db
      .select({ key: transactions.departmentNormalized, total: SUM_AMOUNT, count: COUNT })
      .from(transactions)
      .where(and(eq(transactions.vendorId, id), isNotNull(transactions.departmentNormalized)))
      .groupBy(transactions.departmentNormalized)
      .orderBy(desc(SUM_AMOUNT))
      .limit(8),
    db
      .select({ key: transactions.category, total: SUM_AMOUNT, count: COUNT })
      .from(transactions)
      .where(and(eq(transactions.vendorId, id), isNotNull(transactions.category)))
      .groupBy(transactions.category)
      .orderBy(desc(SUM_AMOUNT))
      .limit(8),
    db
      .select({
        id: transactions.id,
        jurisdictionId: transactions.jurisdictionId,
        jurisdictionName: jurisdictions.name,
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
      .leftJoin(jurisdictions, eq(jurisdictions.id, transactions.jurisdictionId))
      .where(eq(transactions.vendorId, id))
      .orderBy(desc(transactions.transactionDate))
      .limit(25),
  ]);

  // Totals derived from the per-jurisdiction rollup (avoids a redundant query).
  const totalPaid = byJur.reduce((s, b) => s + num(b.total), 0);
  const txnCount = byJur.reduce((s, b) => s + num(b.count), 0);

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
    totalPaid,
    txnCount,
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
      jurisdictionName: r.jurisdictionName ?? r.jurisdictionId,
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
  const empty: SearchResult = { rows: [], total: 0, page, pageSize };
  const db = tryGetDb();
  if (!db) return empty;

  // Validate/coerce every user-supplied filter so a malformed query string
  // (e.g. ?min=abc or ?start=foo) can't reach the DB and 500 the page.
  const q = params.q?.trim().slice(0, 120) || undefined;
  const minAmount = Number.isFinite(params.minAmount) ? params.minAmount : undefined;
  const maxAmount = Number.isFinite(params.maxAmount) ? params.maxAmount : undefined;
  const startDate = params.startDate && DATE_RE.test(params.startDate) ? params.startDate : undefined;
  const endDate = params.endDate && DATE_RE.test(params.endDate) ? params.endDate : undefined;

  const conditions = [];
  // Require >= 2 chars so the trigram index is usable and we don't scan on noise.
  if (q && q.length >= 2) conditions.push(ilike(transactions.vendorNameRaw, `%${q}%`));
  if (params.jurisdictionId) conditions.push(eq(transactions.jurisdictionId, params.jurisdictionId));
  if (params.department) conditions.push(eq(transactions.departmentNormalized, params.department));
  if (params.category) conditions.push(eq(transactions.category, params.category));
  if (minAmount != null) conditions.push(gte(transactions.amount, String(minAmount)));
  if (maxAmount != null) conditions.push(lte(transactions.amount, String(maxAmount)));
  if (startDate) conditions.push(gte(transactions.transactionDate, startDate));
  if (endDate) conditions.push(lte(transactions.transactionDate, endDate));
  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol =
    params.sort === 'amount'
      ? transactions.amount
      : params.sort === 'vendor'
        ? transactions.vendorNameRaw
        : transactions.transactionDate;
  const dir = (params.dir ?? 'desc') === 'asc' ? asc : desc;
  // Stable tiebreaker on the unique id so OFFSET paging can't drop/duplicate rows.
  const orderBy = [dir(sortCol), desc(transactions.id)];

  try {
    const [rows, countRows] = await Promise.all([
      db
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
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: COUNT }).from(transactions).where(where),
    ]);
    const total = num(countRows[0]?.total);
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
      total,
      page,
      pageSize,
    };
  } catch (err) {
    console.error('[searchTransactions] query failed', err);
    return empty;
  }
}

export interface Facets {
  jurisdictions: { id: string; name: string }[];
  departments: string[];
  categories: string[];
}

// Facets change only on ingest — cache for an hour so the two big GROUP BYs
// don't run on every (dynamic) search request.
export const getFacets = unstable_cache(
  async (): Promise<Facets> => {
    const db = tryGetDb();
    if (!db) return { jurisdictions: [], departments: [], categories: [] };
    const [js, depts, cats] = await Promise.all([
      db
        .select({ id: jurisdictions.id, name: jurisdictions.name })
        .from(jurisdictions)
        .where(eq(jurisdictions.isActive, true))
        .orderBy(asc(jurisdictions.name)),
      // Order by spend so the most meaningful departments surface first
      // (KCMO has 1,000+ capital-project codes that would otherwise dominate).
      db
        .select({ d: transactions.departmentNormalized, total: SUM_AMOUNT })
        .from(transactions)
        .where(isNotNull(transactions.departmentNormalized))
        .groupBy(transactions.departmentNormalized)
        .orderBy(desc(SUM_AMOUNT))
        .limit(150),
      db
        .select({ c: transactions.category, total: SUM_AMOUNT })
        .from(transactions)
        .where(isNotNull(transactions.category))
        .groupBy(transactions.category)
        .orderBy(desc(SUM_AMOUNT))
        .limit(150),
    ]);
    return {
      jurisdictions: js,
      departments: depts.map((d) => d.d).filter((d): d is string => d !== null),
      categories: cats.map((c) => c.c).filter((c): c is string => c !== null),
    };
  },
  ['search-facets-v2'],
  { revalidate: 3600 },
);

// ── Sitemap helpers ────────────────────────────────────────────────────────
export async function countSitemapVendors(): Promise<number> {
  const db = tryGetDb();
  if (!db) return 0;
  const [r] = await db
    .select({ c: COUNT })
    .from(vendors)
    .where(gte(vendors.mentionCount, 1));
  return num(r?.c);
}

export async function listSitemapVendorIds(
  offset: number,
  limit: number,
): Promise<{ id: string; updatedAt: Date }[]> {
  const db = tryGetDb();
  if (!db) return [];
  return db
    .select({ id: vendors.id, updatedAt: vendors.updatedAt })
    .from(vendors)
    .where(gte(vendors.mentionCount, 1))
    .orderBy(asc(vendors.id))
    .limit(limit)
    .offset(offset);
}

/** Highest-volume vendors — prebuilt at deploy time so popular pages are warm. */
export async function listTopVendorIds(limit: number): Promise<string[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db
    .select({ id: vendors.id })
    .from(vendors)
    .orderBy(desc(vendors.mentionCount))
    .limit(limit);
  return rows.map((r) => r.id);
}

export async function createCoverageRequest(input: {
  jurisdictionName: string;
  state?: string;
  email?: string;
  note?: string;
}): Promise<boolean> {
  const db = tryGetDb();
  if (!db) return false;
  const jurisdictionName = input.jurisdictionName?.trim().slice(0, 200);
  if (!jurisdictionName) return false;
  const email = input.email?.trim().slice(0, 200) || null;
  // Light server-side validation to keep the public form from being a junk sink.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  await db.insert(coverageRequests).values({
    jurisdictionName,
    state: input.state?.trim().slice(0, 60) || null,
    email,
    note: input.note?.trim().slice(0, 2000) || null,
    status: 'requested',
  });
  return true;
}
