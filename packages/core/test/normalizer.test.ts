import { describe, expect, it } from 'vitest';
import type { DatasetConfig } from '../src/config';
import { MappingError } from '../src/errors';
import { normalizeRecord, normalizeTransaction } from '../src/normalize/normalizer';
import type { CanonicalTransaction } from '../src/types';

const config: DatasetConfig = {
  jurisdictionId: 'test-city',
  platform: 'csv',
  portalBaseUrl: 'https://example.test/checkbook.csv',
  recordType: 'transaction',
  cadence: 'monthly',
  fiscalYearStartMonth: 7,
  sourceUrlTemplate: 'https://example.test/tx/{id}',
  fieldMapping: {
    sourceRecordId: 'id',
    vendorName: { from: ['vendor_name', 'payee'] },
    vendorCity: 'vendor_city',
    vendorState: 'vendor_state',
    vendorZip: 'vendor_zip',
    department: 'dept',
    category: 'fund',
    amount: { from: 'check_amount', type: 'amount' },
    transactionDate: 'check_date',
    paymentMethod: 'method',
    poNumber: 'po',
    procurementMethod: 'procurement',
    description: 'desc',
  },
};

const ctx = { retrievedAt: '2026-06-03T00:00:00.000Z' };

describe('normalizeTransaction', () => {
  it('maps and coerces a messy row into the canonical shape', () => {
    const raw = {
      id: 'TX-1',
      vendor_name: 'A.B.C. Incorporated',
      vendor_city: 'Springfield',
      vendor_state: 'il',
      vendor_zip: '62701-1234',
      dept: 'Public Works Dept.',
      fund: 'Capital',
      check_amount: '$1,234.56',
      check_date: '05/30/2024',
      method: 'Check',
      po: 'PO-9',
      procurement: 'Sole Source',
      desc: 'Paving',
    };
    const txn = normalizeTransaction(raw, config, ctx);

    expect(txn.amount).toBe(1234.56);
    expect(txn.vendorNameRaw).toBe('A.B.C. Incorporated');
    expect(txn.vendorNameNormalized).toBe('ABC INC');
    expect(txn.vendorCity).toBe('Springfield');
    expect(txn.vendorState).toBe('IL');
    expect(txn.vendorZip).toBe('62701');
    expect(txn.departmentNormalized).toBe('PUBLIC WORKS DEPARTMENT');
    expect(txn.category).toBe('Capital');
    expect(txn.transactionDate).toBe('2024-05-30');
    expect(txn.fiscalYear).toBe(2024); // May 2024, July-start FY
    expect(txn.procurementMethod).toBe('sole-source');
    expect(txn.sourceRecordId).toBe('TX-1');
    expect(txn.sourceUrl).toBe('https://example.test/tx/TX-1');
    expect(txn.retrievedAt).toBe(ctx.retrievedAt);
  });

  it('uses the second column when the first is empty (multi-column from)', () => {
    const raw = {
      id: 'TX-2',
      payee: 'Backup Vendor',
      check_amount: '10',
      check_date: '2024-01-02',
    };
    const txn = normalizeTransaction(raw, config, ctx);
    expect(txn.vendorNameRaw).toBe('Backup Vendor');
  });

  it('throws MappingError when the required amount is missing/unparseable', () => {
    const raw = {
      id: 'TX-3',
      vendor_name: 'No Amount Co',
      check_amount: '',
      check_date: '2024-01-02',
    };
    expect(() => normalizeTransaction(raw, config, ctx)).toThrow(MappingError);
  });

  it('dispatches via normalizeRecord on recordType', () => {
    const rec = normalizeRecord({ id: 'x', vendor_name: 'V', check_amount: '5' }, config, ctx);
    expect(rec.kind).toBe('transaction');
    expect((rec as CanonicalTransaction).amount).toBe(5);
  });
});
