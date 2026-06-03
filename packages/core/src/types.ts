/**
 * Canonical domain types — the shapes every adapter normalizes *to*, regardless
 * of how messy the source portal is. These are product-agnostic: a sibling
 * product reuses them unchanged.
 */

/** A raw row as returned by a source (column name → value, pre-coercion). */
export type RawRow = Record<string, unknown>;

export type Platform = 'socrata' | 'opengov' | 'csv' | 'browser';
export type AdapterMethod = 'api' | 'csv' | 'browser';
export type RecordType = 'transaction' | 'budget' | 'contract';
export type Cadence = 'daily' | 'weekly' | 'monthly';

/** Procurement method, normalized to a small controlled vocabulary (+ raw). */
export type ProcurementMethod =
  | 'sole-source'
  | 'competitive-bid'
  | 'cooperative'
  | 'emergency'
  | 'other'
  | null;

/**
 * A single payment/checkbook transaction in canonical form.
 *
 * `amount` is in whole currency units (dollars), signed — refunds/reversals are
 * negative. Dates are ISO `YYYY-MM-DD` (no time/zone ambiguity). `raw` is kept
 * verbatim for audit and re-normalization.
 */
export interface CanonicalTransaction {
  kind: 'transaction';
  jurisdictionId: string;
  sourceRecordId: string | null;

  vendorNameRaw: string;
  vendorNameNormalized: string;
  vendorCity: string | null;
  vendorState: string | null;
  vendorZip: string | null;
  departmentRaw: string | null;
  departmentNormalized: string | null;
  category: string | null;
  fund: string | null;
  account: string | null;

  amount: number;
  currency: string;
  transactionDate: string | null;
  fiscalYear: number | null;

  paymentMethod: string | null;
  poNumber: string | null;
  procurementMethod: ProcurementMethod;
  procurementMethodRaw: string | null;
  description: string | null;

  sourceUrl: string | null;
  retrievedAt: string;
  raw: RawRow;
}

export interface CanonicalBudget {
  kind: 'budget';
  jurisdictionId: string;
  fiscalYear: number | null;
  departmentNormalized: string | null;
  category: string | null;
  amountBudgeted: number;
  currency: string;
  sourceUrl: string | null;
  retrievedAt: string;
  raw: RawRow;
}

export interface CanonicalContract {
  kind: 'contract';
  jurisdictionId: string;
  vendorNameRaw: string;
  vendorNameNormalized: string;
  amount: number | null;
  currency: string;
  termStart: string | null;
  termEnd: string | null;
  contractType: string | null;
  procurementMethod: ProcurementMethod;
  procurementMethodRaw: string | null;
  description: string | null;
  sourceUrl: string | null;
  retrievedAt: string;
  raw: RawRow;
}

/** Discriminated union of everything an adapter can emit. */
export type CanonicalRecord = CanonicalTransaction | CanonicalBudget | CanonicalContract;
