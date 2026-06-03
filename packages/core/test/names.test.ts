import { describe, expect, it } from 'vitest';
import { normalizeDepartmentName, normalizeVendorName } from '../src/normalize/names';

describe('normalizeVendorName', () => {
  it('unifies punctuation and suffix variants', () => {
    expect(normalizeVendorName('ABC Inc')).toBe('ABC INC');
    expect(normalizeVendorName('ABC INC.')).toBe('ABC INC');
    expect(normalizeVendorName('A.B.C. Incorporated')).toBe('ABC INC');
  });

  it('standardizes corporate suffixes but keeps them (avoids over-merge)', () => {
    expect(normalizeVendorName('Acme Company')).toBe('ACME CO');
    expect(normalizeVendorName('Acme Corporation')).toBe('ACME CORP');
    // INC and LLC remain distinct — they may be different entities.
    expect(normalizeVendorName('Acme Inc')).not.toBe(normalizeVendorName('Acme LLC'));
  });

  it('collapses spaced acronyms without over-collapsing lone letters', () => {
    expect(normalizeVendorName('J P Morgan')).toBe('JP MORGAN');
    expect(normalizeVendorName('H & R Block')).toBe('H AND R BLOCK');
  });

  it('strips a leading "The" and expands &', () => {
    expect(normalizeVendorName('The Acme Co')).toBe('ACME CO');
    expect(normalizeVendorName('Smith & Sons LLC')).toBe('SMITH AND SONS LLC');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeVendorName('')).toBe('');
    expect(normalizeVendorName(null)).toBe('');
  });
});

describe('normalizeDepartmentName', () => {
  it('uppercases, expands Dept, and collapses', () => {
    expect(normalizeDepartmentName('Police Dept.')).toBe('POLICE DEPARTMENT');
    expect(normalizeDepartmentName('Parks & Rec')).toBe('PARKS AND REC');
    expect(normalizeDepartmentName('')).toBeNull();
  });
});
