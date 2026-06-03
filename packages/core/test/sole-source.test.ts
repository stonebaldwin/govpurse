import { describe, expect, it } from 'vitest';
import { repeatSoleSource } from '../src/analytics/sole-source';
import type { AnalyticsTxn } from '../src/analytics/types';

function atx(
  id: string,
  vendorId: string,
  amount: number,
  procurementMethod: AnalyticsTxn['procurementMethod'],
): AnalyticsTxn {
  return {
    id,
    vendorId,
    vendorName: vendorId,
    department: null,
    category: null,
    amount,
    date: null,
    period: null,
    fiscalYear: null,
    procurementMethod,
  };
}

describe('repeatSoleSource', () => {
  it('surfaces vendors with repeated sole-source payments above the threshold', () => {
    const txns = [
      atx('1', 'A', 100, 'sole-source'),
      atx('2', 'A', 200, 'sole-source'),
      atx('3', 'A', 300, 'sole-source'),
      atx('4', 'A', 400, 'competitive-bid'),
      atx('5', 'B', 100, 'sole-source'),
      atx('6', 'B', 100, 'sole-source'), // only 2 — below minCount
    ];
    const patterns = repeatSoleSource(txns);
    expect(patterns).toHaveLength(1);
    expect(patterns[0]!.vendorId).toBe('A');
    expect(patterns[0]!.soleSourceCount).toBe(3);
    expect(patterns[0]!.soleSourceTotal).toBe(600);
    expect(patterns[0]!.totalAmount).toBe(1000);
    expect(patterns[0]!.share).toBeCloseTo(0.6);
  });
});
