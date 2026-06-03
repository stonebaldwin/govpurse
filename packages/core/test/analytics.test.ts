import { describe, expect, it } from 'vitest';
import { largestPayments, spendByPeriod, yoyByFiscalYear } from '../src/analytics/aggregate';
import { vendorConcentration } from '../src/analytics/concentration';
import { detectSpikes } from '../src/analytics/spikes';
import type { AnalyticsTxn } from '../src/analytics/types';

function atx(
  partial: Partial<AnalyticsTxn> & { id: string; vendorId: string; amount: number },
): AnalyticsTxn {
  return {
    vendorName: partial.vendorId,
    department: null,
    category: null,
    date: null,
    period: null,
    fiscalYear: null,
    procurementMethod: null,
    ...partial,
  };
}

describe('vendorConcentration', () => {
  it('computes top share and HHI', () => {
    const c = vendorConcentration([
      atx({ id: '1', vendorId: 'A', amount: 800 }),
      atx({ id: '2', vendorId: 'B', amount: 200 }),
    ]);
    expect(c.total).toBe(1000);
    expect(c.topVendor?.vendorId).toBe('A');
    expect(c.topShare).toBeCloseTo(0.8);
    expect(c.hhi).toBeCloseTo(0.68); // 0.8² + 0.2²
  });
});

describe('detectSpikes', () => {
  const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07'];

  it('flags a clear spike against a flat baseline', () => {
    const series = months.map((period, i) =>
      atx({ id: String(i), vendorId: 'A', amount: i === 6 ? 600_000 : 100_000, period }),
    );
    const spikes = detectSpikes(series);
    expect(spikes).toHaveLength(1);
    expect(spikes[0]!.period).toBe('2025-07');
    expect(spikes[0]!.severity).toBe('high');
    expect(Number.isFinite(spikes[0]!.z)).toBe(true); // no Infinity in output
  });

  it('does not flag a flat series', () => {
    const series = months.map((period, i) =>
      atx({ id: String(i), vendorId: 'A', amount: 100_000, period }),
    );
    expect(detectSpikes(series)).toHaveLength(0);
  });
});

describe('aggregate', () => {
  it('computes year-over-year deltas', () => {
    const yoy = yoyByFiscalYear([
      atx({ id: '1', vendorId: 'A', amount: 1000, fiscalYear: 2024 }),
      atx({ id: '2', vendorId: 'A', amount: 1500, fiscalYear: 2025 }),
    ]);
    expect(yoy).toHaveLength(2);
    expect(yoy[0]!.deltaPct).toBeNull();
    expect(yoy[1]!.deltaPct).toBeCloseTo(0.5);
  });

  it('returns the largest payments first', () => {
    const top = largestPayments(
      [
        atx({ id: '1', vendorId: 'A', amount: 5 }),
        atx({ id: '2', vendorId: 'B', amount: 50 }),
        atx({ id: '3', vendorId: 'C', amount: 20 }),
      ],
      2,
    );
    expect(top.map((t) => t.id)).toEqual(['2', '3']);
  });

  it('buckets spend by month ascending', () => {
    const periods = spendByPeriod([
      atx({ id: '1', vendorId: 'A', amount: 100, period: '2025-02' }),
      atx({ id: '2', vendorId: 'A', amount: 50, period: '2025-01' }),
      atx({ id: '3', vendorId: 'A', amount: 25, period: '2025-02' }),
    ]);
    expect(periods.map((p) => p.period)).toEqual(['2025-01', '2025-02']);
    expect(periods[1]!.total).toBe(125);
  });
});
