import { describe, expect, it } from 'vitest';
import { normalizeVendorName } from '../src/normalize/names';
import { resolveVendors, type VendorMention } from '../src/resolve/vendor-resolution';

function mention(id: string, name: string, extra: Partial<VendorMention> = {}): VendorMention {
  return { id, nameRaw: name, nameNormalized: normalizeVendorName(name), ...extra };
}

describe('resolveVendors', () => {
  it('merges punctuation/suffix/acronym variants into one entity (exact, confidence 1)', () => {
    const result = resolveVendors([
      mention('1', 'ABC Inc'),
      mention('2', 'A.B.C. Incorporated'),
      mention('3', 'ABC INC.'),
    ]);
    expect(result.vendors).toHaveLength(1);
    expect(result.vendors[0]!.mentionIds.slice().sort()).toEqual(['1', '2', '3']);
    expect(result.vendors[0]!.matchConfidence).toBe(1);
    expect(result.vendors[0]!.variants.length).toBeGreaterThan(1);
  });

  it('fuzzy-merges a clear typo, with confidence below 1', () => {
    const result = resolveVendors([
      mention('1', 'Acme Construction Co'),
      mention('2', 'Acme Constructon Co'), // missing an "i"
    ]);
    expect(result.vendors).toHaveLength(1);
    expect(result.vendors[0]!.matchConfidence).toBeLessThan(1);
    expect(result.vendors[0]!.matchConfidence).toBeGreaterThanOrEqual(0.93);
  });

  it('does NOT over-merge genuinely different names (the #1 correctness risk)', () => {
    const result = resolveVendors([
      mention('1', 'Acme Construction Co'),
      mention('2', 'Acme Consulting Co'),
    ]);
    expect(result.vendors).toHaveLength(2);
  });

  it('refuses to merge typo-similar names in different states (hard conflict)', () => {
    const result = resolveVendors([
      mention('1', 'Acme Construction Co', { state: 'CA' }),
      mention('2', 'Acme Constructon Co', { state: 'TX' }),
    ]);
    expect(result.vendors).toHaveLength(2);
  });

  it('groups exact normalized names while keeping distinct vendors separate', () => {
    const result = resolveVendors([
      mention('a1', 'Globex LLC'),
      mention('a2', 'GLOBEX, LLC'),
      mention('b1', 'Initech Inc'),
    ]);
    expect(result.vendors).toHaveLength(2);
    expect(result.assignment.get('a1')).toBe(result.assignment.get('a2'));
    expect(result.assignment.get('b1')).not.toBe(result.assignment.get('a1'));
  });

  it('produces stable, deterministic vendor ids', () => {
    const input = [mention('1', 'ABC Inc'), mention('2', 'A.B.C. Incorporated')];
    const a = resolveVendors(input);
    const b = resolveVendors(input);
    expect(a.vendors[0]!.id).toBe(b.vendors[0]!.id);
  });
});
