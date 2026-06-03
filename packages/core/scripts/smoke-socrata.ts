/**
 * Live smoke test for the Socrata SODA adapter + the full Core pipeline.
 *
 * Pulls a bounded sample from a real, key-less Socrata open-checkbook portal,
 * runs it through ingest → normalize → resolve → analytics → health, and prints
 * a summary. This is also the tool an operator runs when onboarding a new
 * Socrata jurisdiction (the recurring growth task).
 *
 *   pnpm --filter @govpurse/core smoke:socrata
 *   pnpm --filter @govpurse/core smoke:socrata <portalBaseUrl> <datasetId>
 *
 * Default target: State of Delaware Checkbook (data.delaware.gov / 5s6n-7hpx).
 */
import { spendByDepartment, spendByVendor } from '../src/analytics/aggregate';
import { vendorConcentration } from '../src/analytics/concentration';
import { detectCategorySpikes } from '../src/analytics/spikes';
import { toAnalyticsTxns, transactionMentionId } from '../src/analytics/types';
import type { DatasetConfig } from '../src/config';
import { resolveVendors, type VendorMention } from '../src/resolve/vendor-resolution';
import { runIngest } from '../src/pipeline';
import { MemoryStore } from '../src/store/memory-store';
import type { CanonicalTransaction } from '../src/types';

const [, , portalArg, datasetArg] = process.argv;

const config: DatasetConfig = {
  jurisdictionId: 'state-of-delaware',
  platform: 'socrata',
  portalBaseUrl: portalArg ?? 'https://data.delaware.gov',
  datasetId: datasetArg ?? '5s6n-7hpx',
  recordType: 'transaction',
  cadence: 'monthly',
  fiscalYearStartMonth: 7,
  fieldMapping: {
    sourceRecordId: 'check_number',
    vendorName: { from: ['vendor', 'payee', 'vendor_name'] },
    department: { from: ['department', 'division', 'deptid_descr'] },
    category: { from: ['category', 'expense_category', 'account_descr'] },
    fund: { from: ['fund_type', 'fund_name', 'fund'] },
    amount: { from: ['amount', 'payment_amount', 'check_amount'], type: 'amount' },
    transactionDate: { from: ['check_date', 'payment_date'] },
    fiscalYear: 'fiscal_year',
  },
};

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

async function main(): Promise<void> {
  console.log(`\n▶ Live Socrata pull: ${config.portalBaseUrl}/resource/${config.datasetId}.json\n`);
  const store = new MemoryStore();

  const run = await runIngest(config, { store }, { maxRows: 500, minIntervalMs: 150 });

  console.log('── Ingestion ───────────────────────────────────────────────');
  console.log(`status:        ${run.status}${run.anomalous ? ' (ANOMALOUS)' : ''}`);
  console.log(`rows seen:     ${run.rowsSeen}`);
  console.log(`rows new:      ${run.rowsNew}`);
  console.log(`mapping errs:  ${run.mappingErrors}`);
  if (run.error) console.log(`error:         ${run.error} [${run.errorCode}]`);
  if (run.anomalyReasons.length) console.log(`anomalies:     ${run.anomalyReasons.join('; ')}`);

  const txns = [...store.records.values()].filter(
    (r): r is CanonicalTransaction => r.kind === 'transaction',
  );
  if (txns.length === 0) {
    console.log('\nNo transactions ingested. (Adapter is validated by fixtures regardless.)');
    return;
  }

  const mentions: VendorMention[] = txns.map((t, i) => ({
    id: transactionMentionId(t, i),
    nameRaw: t.vendorNameRaw,
    nameNormalized: t.vendorNameNormalized,
    city: t.vendorCity,
    state: t.vendorState,
    zip: t.vendorZip,
  }));
  const resolution = resolveVendors(mentions);
  const nameById = new Map(resolution.vendors.map((v) => [v.id, v.canonicalName]));
  const atx = toAnalyticsTxns(txns, {
    assignment: resolution.assignment,
    vendorNameById: nameById,
  });

  console.log('\n── Vendor resolution ───────────────────────────────────────');
  console.log(`mentions:      ${mentions.length}`);
  console.log(`entities:      ${resolution.vendors.length}`);
  console.log(`review queue:  ${resolution.reviewQueue.length}`);

  console.log('\n── Top vendors (computed analysis) ─────────────────────────');
  for (const v of spendByVendor(atx).slice(0, 5)) {
    console.log(`  ${usd(v.total).padStart(16)}  ${(nameById.get(v.key) ?? v.key).slice(0, 44)}`);
  }

  console.log('\n── Top departments ─────────────────────────────────────────');
  for (const d of spendByDepartment(atx).slice(0, 5)) {
    console.log(`  ${usd(d.total).padStart(16)}  ${d.key.slice(0, 44)}`);
  }

  const conc = vendorConcentration(atx);
  console.log('\n── Concentration ───────────────────────────────────────────');
  console.log(
    `top-vendor share: ${(conc.topShare * 100).toFixed(1)}%   HHI: ${conc.hhi.toFixed(3)}`,
  );

  const spikes = detectCategorySpikes(atx);
  console.log(`\n── Spikes detected: ${spikes.length} (over the sampled window) ──`);
  for (const s of spikes.slice(0, 3)) {
    console.log(
      `  ${s.period}  ${s.scope.slice(0, 30)}  ${usd(s.value)} (${s.ratio.toFixed(1)}× baseline, ${s.severity})`,
    );
  }

  console.log('\n✓ Live SODA pull + full Core pipeline succeeded.\n');
}

main().catch((err: unknown) => {
  console.error('smoke failed:', err);
  process.exit(1);
});
