import { spendByVendor } from './aggregate';
import type { AnalyticsTxn } from './types';

export interface VendorShare {
  vendorId: string;
  vendorName: string;
  total: number;
  /** Fraction of in-scope spend, 0–1. */
  share: number;
}

export interface ConcentrationResult {
  scope: string;
  total: number;
  vendorCount: number;
  topVendor: VendorShare | null;
  /** Largest single-vendor share, 0–1 (the headline "concentration" number). */
  topShare: number;
  /** Herfindahl–Hirschman Index, 0–1. >0.25 is highly concentrated. */
  hhi: number;
  top: VendorShare[];
}

/**
 * Vendor concentration within a scope: top-vendor share + HHI. A watchdog
 * signal, NOT a finding — always presented as computed analysis with the
 * underlying transactions linked.
 */
export function vendorConcentration(
  txns: AnalyticsTxn[],
  options: { topN?: number; scope?: string } = {},
): ConcentrationResult {
  const topN = options.topN ?? 5;
  const scope = options.scope ?? 'overall';

  // Shares use positive spend only — refunds shouldn't create negative shares.
  const totals = spendByVendor(txns).filter((d) => d.total > 0);
  const total = totals.reduce((s, d) => s + d.total, 0);

  const nameById = new Map<string, string>();
  for (const t of txns) if (!nameById.has(t.vendorId)) nameById.set(t.vendorId, t.vendorName);

  const shares: VendorShare[] = totals.map((d) => ({
    vendorId: d.key,
    vendorName: nameById.get(d.key) ?? d.key,
    total: d.total,
    share: total > 0 ? d.total / total : 0,
  }));

  const hhi = shares.reduce((s, v) => s + v.share * v.share, 0);

  return {
    scope,
    total,
    vendorCount: shares.length,
    topVendor: shares[0] ?? null,
    topShare: shares[0]?.share ?? 0,
    hhi,
    top: shares.slice(0, topN),
  };
}

/** Concentration computed per department, ranked by top-vendor share. */
export function concentrationByDepartment(
  txns: AnalyticsTxn[],
  options: { topN?: number } = {},
): ConcentrationResult[] {
  const byDept = new Map<string, AnalyticsTxn[]>();
  for (const t of txns) {
    if (!t.department) continue;
    const arr = byDept.get(t.department);
    if (arr) arr.push(t);
    else byDept.set(t.department, [t]);
  }
  return [...byDept]
    .map(([dept, list]) => vendorConcentration(list, { ...options, scope: dept }))
    .sort((a, b) => b.topShare - a.topShare);
}
