import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { inArray } from 'drizzle-orm';
import { getDb } from './index';
import {
  budgets,
  coverageRequests,
  departments,
  jurisdictions,
  spendAggregates,
  spendDatasets,
  subscriptions,
  syncRuns,
  transactions,
  users,
  vendors,
  type NewTransaction,
} from './schema';

// tsx does not auto-load .env; pull DATABASE_URL from the nearest one (mirrors drizzle.config.ts).
for (const candidate of ['.env', '../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

/**
 * Demo seed — populates a reviewable dataset (a real Delaware jurisdiction record
 * plus a synthetic "City of Example") so the public pages render before live
 * ingestion is configured. Idempotent: it clears the two demo jurisdictions and
 * their demo vendors, then re-inserts. Requires `DATABASE_URL`.
 */

const JURISDICTION_IDS = ['city-of-example', 'state-of-delaware'];

const VENDORS = [
  { id: 'acme-construction-co-demo', name: 'Acme Construction Co.', state: 'IL' },
  { id: 'metro-health-systems-demo', name: 'Metro Health Systems', state: 'IL' },
  { id: 'civic-it-solutions-demo', name: 'Civic IT Solutions', state: 'IL' },
  { id: 'northstar-engineering-demo', name: 'Northstar Engineering', state: 'IL' },
  { id: 'granite-paving-llc-demo', name: 'Granite Paving LLC', state: 'IL' },
  { id: 'blueline-fleet-services-demo', name: 'BlueLine Fleet Services', state: 'IL' },
];

const DEPARTMENTS = ['Police', 'Fire & EMS', 'Public Works', 'Parks & Rec', 'General Services'];
const CATEGORIES = ['Personnel', 'Contracts', 'Capital', 'Supplies', 'Grants'];

function money(n: number): string {
  return n.toFixed(2);
}

async function seed(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log(
      '[seed] DATABASE_URL is not set — nothing to seed. Set it and re-run `pnpm db:seed`.',
    );
    return;
  }
  const db = getDb(process.env.DATABASE_URL);
  console.log('[seed] clearing demo data…');

  await db.delete(jurisdictions).where(inArray(jurisdictions.id, JURISDICTION_IDS));
  await db.delete(vendors).where(
    inArray(
      vendors.id,
      VENDORS.map((v) => v.id),
    ),
  );

  console.log('[seed] inserting jurisdictions, vendors, departments…');
  await db.insert(jurisdictions).values([
    {
      id: 'city-of-example',
      name: 'City of Example',
      state: 'IL',
      type: 'city',
      lat: 39.8,
      lng: -89.6,
    },
    { id: 'state-of-delaware', name: 'State of Delaware', state: 'DE', type: 'state' },
  ]);

  await db.insert(spendDatasets).values({
    id: 'state-of-delaware:checkbook',
    jurisdictionId: 'state-of-delaware',
    platform: 'socrata',
    portalBaseUrl: 'https://data.delaware.gov',
    datasetId: '5s6n-7hpx',
    fieldMapping: {
      sourceRecordId: 'check_number',
      vendorName: 'vendor',
      department: 'department',
      category: 'category',
      fund: 'fund_type',
      amount: { from: 'amount', type: 'amount' },
      transactionDate: 'check_date',
      fiscalYear: 'fiscal_year',
    },
    recordType: 'transaction',
    cadence: 'monthly',
  });

  await db.insert(vendors).values(
    VENDORS.map((v) => ({
      id: v.id,
      canonicalName: v.name,
      normalizedName: v.name
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      state: v.state,
      matchConfidence: 1,
      mentionCount: 0,
    })),
  );

  const deptRows = DEPARTMENTS.map((name) => ({
    id: `city-of-example-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    jurisdictionId: 'city-of-example',
    name,
    normalizedName: name.toUpperCase(),
  }));
  await db.insert(departments).values(deptRows);

  console.log('[seed] generating transactions…');
  const txns: NewTransaction[] = [];
  const months = Array.from({ length: 12 }, (_, i) => i); // Jul 2024 .. Jun 2025
  let n = 0;
  for (const m of months) {
    const date = new Date(Date.UTC(2024, 6 + m, 14)); // 14th of each month
    const iso = date.toISOString().slice(0, 10);
    const fyMonth = date.getUTCMonth() + 1;
    const fy = fyMonth >= 7 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
    for (let v = 0; v < VENDORS.length; v++) {
      const vendor = VENDORS[v]!;
      const dept = DEPARTMENTS[(m + v) % DEPARTMENTS.length]!;
      const category = CATEGORIES[(m + v) % CATEGORIES.length]!;
      // Acme gets a deliberate spike in December for the demo analytics.
      const base = 40_000 + v * 9_000 + ((m * 37) % 11) * 2_500;
      const amount = v === 0 && m === 5 ? base * 6 : base;
      n++;
      txns.push({
        id: `city-of-example:demo-${n}`,
        jurisdictionId: 'city-of-example',
        vendorId: vendor.id,
        departmentId: deptRows[(m + v) % deptRows.length]!.id,
        sourceRecordId: `demo-${n}`,
        vendorNameRaw: vendor.name,
        vendorNameNormalized: vendor.name
          .toUpperCase()
          .replace(/[^A-Z0-9 ]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        vendorState: vendor.state,
        departmentRaw: dept,
        departmentNormalized: dept.toUpperCase(),
        category,
        amount: money(amount),
        transactionDate: iso,
        fiscalYear: fy,
        procurementMethod: v === 0 ? 'sole-source' : 'competitive-bid',
        procurementMethodRaw: v === 0 ? 'Sole Source' : 'Competitive Bid',
        description: `${category} payment to ${vendor.name}`,
        sourceUrl: 'https://data.delaware.gov',
        retrievedAt: new Date(),
      });
    }
  }
  await db.insert(transactions).values(txns);

  console.log('[seed] computing aggregates…');
  const byPeriod = new Map<string, { total: number; count: number }>();
  const byVendor = new Map<string, { total: number; count: number }>();
  const byDept = new Map<string, { total: number; count: number }>();
  for (const t of txns) {
    const amt = Number(t.amount);
    const period = (t.transactionDate as string).slice(0, 7);
    const p = byPeriod.get(period) ?? { total: 0, count: 0 };
    p.total += amt;
    p.count++;
    byPeriod.set(period, p);
    const ve = byVendor.get(t.vendorId!) ?? { total: 0, count: 0 };
    ve.total += amt;
    ve.count++;
    byVendor.set(t.vendorId!, ve);
    const de = byDept.get(t.departmentNormalized!) ?? { total: 0, count: 0 };
    de.total += amt;
    de.count++;
    byDept.set(t.departmentNormalized!, de);
  }

  const aggregates = [
    ...[...byPeriod].map(([period, v]) => ({
      jurisdictionId: 'city-of-example',
      dimension: 'overall',
      dimensionKey: null,
      period,
      total: money(v.total),
      txnCount: v.count,
    })),
    ...[...byVendor].map(([vendorId, v]) => ({
      jurisdictionId: 'city-of-example',
      dimension: 'vendor',
      dimensionKey: vendorId,
      period: null,
      total: money(v.total),
      txnCount: v.count,
    })),
    ...[...byDept].map(([dept, v]) => ({
      jurisdictionId: 'city-of-example',
      dimension: 'department',
      dimensionKey: dept,
      period: null,
      total: money(v.total),
      txnCount: v.count,
    })),
  ];
  await db.insert(spendAggregates).values(aggregates);

  // Update vendor totalPaid rollups.
  console.log('[seed] budgets, sync run, demo user, coverage request…');
  await db.insert(budgets).values(
    DEPARTMENTS.map((d) => ({
      jurisdictionId: 'city-of-example',
      fiscalYear: 2025,
      departmentNormalized: d.toUpperCase(),
      amountBudgeted: money(2_000_000 + DEPARTMENTS.indexOf(d) * 500_000),
      retrievedAt: new Date(),
    })),
  );

  await db.insert(syncRuns).values({
    jurisdictionId: 'state-of-delaware',
    datasetId: 'state-of-delaware:checkbook',
    platform: 'socrata',
    startedAt: new Date(Date.now() - 60_000),
    finishedAt: new Date(),
    rowsSeen: 500,
    rowsNew: 136,
    rowsUpdated: 0,
    mappingErrors: 0,
    status: 'success',
  });

  await db
    .insert(users)
    .values({ id: 'demo-user', name: 'Demo User', email: 'demo@example.com', emailVerified: true })
    .onConflictDoNothing();
  await db
    .insert(subscriptions)
    .values({ userId: 'demo-user', plan: 'free', status: 'active' })
    .onConflictDoNothing();

  await db.insert(coverageRequests).values({
    jurisdictionName: 'City of Springfield',
    state: 'IL',
    note: 'Please add our city checkbook.',
    status: 'requested',
  });

  console.log(`[seed] done — ${txns.length} transactions, ${aggregates.length} aggregates.`);
}

seed().catch((err: unknown) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
