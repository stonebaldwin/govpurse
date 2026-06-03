import { configCurrency, type DatasetConfig, fiscalYearStart } from '../config';
import { MappingError } from '../errors';
import { computeFiscalYear, normalizeProcurementMethod } from '../mapping/coerce';
import {
  extractAmount,
  extractDate,
  extractInteger,
  extractRawString,
  extractString,
  sourceColumns,
} from '../mapping/field-mapping';
import type {
  CanonicalBudget,
  CanonicalContract,
  CanonicalRecord,
  CanonicalTransaction,
  RawRow,
} from '../types';
import { normalizeDepartmentName, normalizeVendorName } from './names';

export interface NormalizeContext {
  /** ISO timestamp stamped onto records; defaults to now. Pass for determinism. */
  retrievedAt?: string;
}

/** Normalize a raw row into the canonical shape for the config's record type. */
export function normalizeRecord(
  raw: RawRow,
  config: DatasetConfig,
  ctx: NormalizeContext = {},
): CanonicalRecord {
  switch (config.recordType) {
    case 'transaction':
      return normalizeTransaction(raw, config, ctx);
    case 'budget':
      return normalizeBudget(raw, config, ctx);
    case 'contract':
      return normalizeContract(raw, config, ctx);
  }
}

function buildSourceUrl(config: DatasetConfig, id: string | null): string | null {
  if (config.sourceUrlTemplate) return config.sourceUrlTemplate.replace('{id}', id ?? '');
  return null;
}

export function normalizeTransaction(
  raw: RawRow,
  config: DatasetConfig,
  ctx: NormalizeContext = {},
): CanonicalTransaction {
  const fm = config.fieldMapping;
  const retrievedAt = ctx.retrievedAt ?? new Date().toISOString();

  const amount = extractAmount(raw, fm, 'amount');
  if (amount === null) {
    throw new MappingError('Transaction has no parseable amount', {
      context: { jurisdictionId: config.jurisdictionId, columns: sourceColumns(fm, 'amount') },
    });
  }

  const vendorRaw = extractRawString(raw, fm, 'vendorName');
  const departmentRaw = extractRawString(raw, fm, 'department');
  const transactionDate = extractDate(raw, fm, 'transactionDate');
  const fiscalYear =
    extractInteger(raw, fm, 'fiscalYear') ??
    computeFiscalYear(transactionDate, fiscalYearStart(config));
  const proc = normalizeProcurementMethod(extractRawString(raw, fm, 'procurementMethod'));
  const sourceRecordId = extractString(raw, fm, 'sourceRecordId');

  return {
    kind: 'transaction',
    jurisdictionId: config.jurisdictionId,
    sourceRecordId,
    vendorNameRaw: vendorRaw ?? '',
    vendorNameNormalized: normalizeVendorName(vendorRaw),
    vendorCity: extractString(raw, fm, 'vendorCity'),
    vendorState: extractString(raw, fm, 'vendorState')?.toUpperCase() ?? null,
    vendorZip: extractString(raw, fm, 'vendorZip')?.match(/\d{5}/)?.[0] ?? null,
    departmentRaw,
    departmentNormalized: normalizeDepartmentName(departmentRaw),
    category: extractString(raw, fm, 'category'),
    fund: extractString(raw, fm, 'fund'),
    account: extractString(raw, fm, 'account'),
    amount,
    currency: configCurrency(config),
    transactionDate,
    fiscalYear,
    paymentMethod: extractString(raw, fm, 'paymentMethod'),
    poNumber: extractString(raw, fm, 'poNumber'),
    procurementMethod: proc.method,
    procurementMethodRaw: proc.raw,
    description: extractString(raw, fm, 'description'),
    sourceUrl: buildSourceUrl(config, sourceRecordId),
    retrievedAt,
    raw,
  };
}

export function normalizeBudget(
  raw: RawRow,
  config: DatasetConfig,
  ctx: NormalizeContext = {},
): CanonicalBudget {
  const fm = config.fieldMapping;
  const retrievedAt = ctx.retrievedAt ?? new Date().toISOString();

  const amountBudgeted = extractAmount(raw, fm, 'amountBudgeted');
  if (amountBudgeted === null) {
    throw new MappingError('Budget row has no parseable budgeted amount', {
      context: {
        jurisdictionId: config.jurisdictionId,
        columns: sourceColumns(fm, 'amountBudgeted'),
      },
    });
  }

  const fiscalYear =
    extractInteger(raw, fm, 'fiscalYear') ??
    computeFiscalYear(extractDate(raw, fm, 'transactionDate'), fiscalYearStart(config));

  return {
    kind: 'budget',
    jurisdictionId: config.jurisdictionId,
    fiscalYear,
    departmentNormalized: normalizeDepartmentName(extractRawString(raw, fm, 'department')),
    category: extractString(raw, fm, 'category'),
    amountBudgeted,
    currency: configCurrency(config),
    sourceUrl: buildSourceUrl(config, extractString(raw, fm, 'sourceRecordId')),
    retrievedAt,
    raw,
  };
}

export function normalizeContract(
  raw: RawRow,
  config: DatasetConfig,
  ctx: NormalizeContext = {},
): CanonicalContract {
  const fm = config.fieldMapping;
  const retrievedAt = ctx.retrievedAt ?? new Date().toISOString();

  const vendorRaw = extractRawString(raw, fm, 'vendorName');
  const proc = normalizeProcurementMethod(extractRawString(raw, fm, 'procurementMethod'));

  return {
    kind: 'contract',
    jurisdictionId: config.jurisdictionId,
    vendorNameRaw: vendorRaw ?? '',
    vendorNameNormalized: normalizeVendorName(vendorRaw),
    amount: extractAmount(raw, fm, 'amount'),
    currency: configCurrency(config),
    termStart: extractDate(raw, fm, 'termStart'),
    termEnd: extractDate(raw, fm, 'termEnd'),
    contractType: extractString(raw, fm, 'contractType'),
    procurementMethod: proc.method,
    procurementMethodRaw: proc.raw,
    description: extractString(raw, fm, 'description'),
    sourceUrl: buildSourceUrl(config, extractString(raw, fm, 'sourceRecordId')),
    retrievedAt,
    raw,
  };
}
