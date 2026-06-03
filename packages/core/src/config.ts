import { z } from 'zod';
import { CoreError } from './errors';
import type { Cadence, Platform, RecordType } from './types';

/**
 * The declarative field-mapping system — the crux of cheap coverage.
 *
 * Checkbook schemas vary wildly across portals, so adding a jurisdiction is data
 * entry (a `DatasetConfig` + `FieldMapping`), not code. A mapping says, per
 * canonical field, which source column(s) to read and how to coerce them.
 */

/** Every canonical field a mapping can target, across all record types. */
export type CanonicalField =
  | 'sourceRecordId'
  | 'vendorName'
  | 'vendorCity'
  | 'vendorState'
  | 'vendorZip'
  | 'department'
  | 'category'
  | 'fund'
  | 'account'
  | 'amount'
  | 'transactionDate'
  | 'fiscalYear'
  | 'paymentMethod'
  | 'poNumber'
  | 'procurementMethod'
  | 'description'
  // budget
  | 'amountBudgeted'
  // contract
  | 'termStart'
  | 'termEnd'
  | 'contractType';

export type FieldType = 'string' | 'amount' | 'date' | 'integer';

export interface FieldRule {
  /** Source column(s); the first present, non-empty one wins. */
  from: string | string[];
  /** Coercion type. Sensible defaults are inferred per field if omitted. */
  type?: FieldType;
  /** Value used when every source column is empty/missing. */
  fallback?: string | number;
}

/** Canonical field → rule. Shorthand: a bare string is `{ from: string }`. */
export type FieldMapping = Partial<Record<CanonicalField, FieldRule | string>>;

export interface DatasetConfig {
  jurisdictionId: string;
  platform: Platform;
  /** e.g. https://data.cityofchicago.org */
  portalBaseUrl: string;
  /** Socrata resource id (e.g. "abcd-1234") / dataset identifier. */
  datasetId?: string;
  /** Optional Socrata app token; raises rate limits. Never required. */
  apiToken?: string;
  fieldMapping: FieldMapping;
  recordType: RecordType;
  cadence: Cadence;

  // ── normalization options ────────────────────────────────────────────────
  /** ISO currency; default "USD". */
  currency?: string;
  /** Fiscal-year start month, 1–12. Most US local govs use 7 (July). Default 7. */
  fiscalYearStartMonth?: number;
  /** Template for a per-row source link, with `{id}` substituted. */
  sourceUrlTemplate?: string;

  // ── Socrata (SODA) options ───────────────────────────────────────────────
  /** Extra SoQL `$where` clause (ANDed with incremental filtering). */
  soqlWhere?: string;
  /** Column the portal exposes as a row-stable date, used for `since` filtering. */
  dateColumn?: string;
  /** Page size for SODA `$limit`. Default 50_000 (SODA max). */
  pageSize?: number;
}

const fieldRuleSchema: z.ZodType<FieldRule | string> = z.union([
  z.string().min(1),
  z.object({
    from: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    type: z.enum(['string', 'amount', 'date', 'integer']).optional(),
    fallback: z.union([z.string(), z.number()]).optional(),
  }),
]);

const datasetConfigSchema = z.object({
  jurisdictionId: z.string().min(1),
  platform: z.enum(['socrata', 'opengov', 'csv', 'browser']),
  portalBaseUrl: z.string().url(),
  datasetId: z.string().min(1).optional(),
  apiToken: z.string().min(1).optional(),
  fieldMapping: z.record(z.string(), fieldRuleSchema),
  recordType: z.enum(['transaction', 'budget', 'contract']),
  cadence: z.enum(['daily', 'weekly', 'monthly']),
  currency: z.string().length(3).optional(),
  fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
  sourceUrlTemplate: z.string().optional(),
  soqlWhere: z.string().optional(),
  dateColumn: z.string().optional(),
  pageSize: z.number().int().positive().max(50_000).optional(),
});

/**
 * Validate and normalize raw config (e.g. from a `spend_datasets` row) into a
 * typed `DatasetConfig`. Throws `CoreError('config_invalid')` with the zod
 * issues attached on failure.
 */
export function validateDatasetConfig(input: unknown): DatasetConfig {
  const result = datasetConfigSchema.safeParse(input);
  if (!result.success) {
    throw new CoreError('config_invalid', 'Invalid DatasetConfig', {
      context: { issues: result.error.issues },
    });
  }
  // Socrata/OpenGov require a datasetId; CSV/browser do not.
  const cfg = result.data as DatasetConfig;
  if ((cfg.platform === 'socrata' || cfg.platform === 'opengov') && !cfg.datasetId) {
    throw new CoreError('config_invalid', `${cfg.platform} datasets require a datasetId`, {
      context: { jurisdictionId: cfg.jurisdictionId },
    });
  }
  return cfg;
}

/** The configured fiscal-year start month (1–12), defaulting to July. */
export function fiscalYearStart(config: DatasetConfig): number {
  return config.fiscalYearStartMonth ?? 7;
}

/** The configured currency, defaulting to USD. */
export function configCurrency(config: DatasetConfig): string {
  return config.currency ?? 'USD';
}
