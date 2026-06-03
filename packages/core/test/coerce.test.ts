import { describe, expect, it } from 'vitest';
import {
  coerceAmount,
  coerceDate,
  coerceInteger,
  computeFiscalYear,
  normalizeProcurementMethod,
} from '../src/mapping/coerce';

describe('coerceAmount', () => {
  it('parses plain and currency-formatted dollars', () => {
    expect(coerceAmount('1234.56')).toBe(1234.56);
    expect(coerceAmount('$1,234.56')).toBe(1234.56);
    expect(coerceAmount('USD 2,000')).toBe(2000);
    expect(coerceAmount('$0.00')).toBe(0);
    expect(coerceAmount(4200)).toBe(4200);
  });

  it('handles all three negative conventions (refunds/reversals)', () => {
    expect(coerceAmount('($1,234.56)')).toBe(-1234.56);
    expect(coerceAmount('1,234.56-')).toBe(-1234.56);
    expect(coerceAmount('-$500')).toBe(-500);
  });

  it('returns null for empty / non-numeric', () => {
    expect(coerceAmount('')).toBeNull();
    expect(coerceAmount('   ')).toBeNull();
    expect(coerceAmount('N/A')).toBeNull();
    expect(coerceAmount(null)).toBeNull();
    expect(coerceAmount(undefined)).toBeNull();
  });
});

describe('coerceDate', () => {
  it('parses ISO, US, and compact formats to YYYY-MM-DD', () => {
    expect(coerceDate('2024-05-30')).toBe('2024-05-30');
    expect(coerceDate('2024-05-30T00:00:00.000')).toBe('2024-05-30');
    expect(coerceDate('05/30/2024')).toBe('2024-05-30');
    expect(coerceDate('5/9/24')).toBe('2024-05-09');
    expect(coerceDate('20240530')).toBe('2024-05-30');
  });

  it('falls back to text dates (month is timezone-stable)', () => {
    expect(coerceDate('May 30, 2024')).toMatch(/^2024-05-/);
  });

  it('returns null for empty / unparseable', () => {
    expect(coerceDate('')).toBeNull();
    expect(coerceDate('not a date')).toBeNull();
    expect(coerceDate('13/40/2024')).toBeNull();
  });
});

describe('computeFiscalYear', () => {
  it('labels a July-start FY by its ending calendar year', () => {
    expect(computeFiscalYear('2024-08-15', 7)).toBe(2025);
    expect(computeFiscalYear('2025-03-10', 7)).toBe(2025);
    expect(computeFiscalYear('2024-06-30', 7)).toBe(2024);
  });

  it('returns the calendar year for a calendar fiscal year', () => {
    expect(computeFiscalYear('2024-12-01', 1)).toBe(2024);
  });

  it('handles an October (federal) start', () => {
    expect(computeFiscalYear('2024-10-01', 10)).toBe(2025);
    expect(computeFiscalYear('2024-09-30', 10)).toBe(2024);
  });
});

describe('coerceInteger', () => {
  it('extracts integers, truncating', () => {
    expect(coerceInteger('2025')).toBe(2025);
    expect(coerceInteger('FY 2025')).toBe(2025);
    expect(coerceInteger(2025.9)).toBe(2025);
    expect(coerceInteger('')).toBeNull();
  });
});

describe('normalizeProcurementMethod', () => {
  it('maps common phrasings to the controlled vocabulary', () => {
    expect(normalizeProcurementMethod('Sole Source').method).toBe('sole-source');
    expect(normalizeProcurementMethod('No Bid').method).toBe('sole-source');
    expect(normalizeProcurementMethod('Competitive Sealed Bid').method).toBe('competitive-bid');
    expect(normalizeProcurementMethod('RFP').method).toBe('competitive-bid');
    expect(normalizeProcurementMethod('Cooperative Purchase').method).toBe('cooperative');
    expect(normalizeProcurementMethod('Emergency').method).toBe('emergency');
  });

  it('is conservative: unknown-but-present is "other", absent is null', () => {
    expect(normalizeProcurementMethod('Miscellaneous').method).toBe('other');
    expect(normalizeProcurementMethod('').method).toBeNull();
    expect(normalizeProcurementMethod(null).raw).toBeNull();
  });
});
