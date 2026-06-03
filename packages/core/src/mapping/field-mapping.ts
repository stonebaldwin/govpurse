import type { CanonicalField, FieldMapping, FieldRule, FieldType } from '../config';
import type { RawRow } from '../types';
import { coerceAmount, coerceDate, coerceInteger, coerceString } from './coerce';

/** Expand the shorthand (`'col'` → `{ from: 'col' }`). */
export function normalizeRule(rule: FieldRule | string | undefined): FieldRule | undefined {
  if (rule === undefined) return undefined;
  return typeof rule === 'string' ? { from: rule } : rule;
}

/** First present, non-empty source column for a rule, else its fallback, else null. */
export function rawValueFor(raw: RawRow, rule: FieldRule): unknown {
  const columns = Array.isArray(rule.from) ? rule.from : [rule.from];
  for (const col of columns) {
    const v = raw[col];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return rule.fallback ?? null;
}

function coerce(value: unknown, type: FieldType): string | number | null {
  switch (type) {
    case 'amount':
      return coerceAmount(value);
    case 'date':
      return coerceDate(value);
    case 'integer':
      return coerceInteger(value);
    case 'string':
      return coerceString(value);
  }
}

/** The source column names a field maps to (for error messages / shape checks). */
export function sourceColumns(mapping: FieldMapping, field: CanonicalField): string[] {
  const rule = normalizeRule(mapping[field]);
  if (!rule) return [];
  return Array.isArray(rule.from) ? rule.from : [rule.from];
}

function extract(
  raw: RawRow,
  mapping: FieldMapping,
  field: CanonicalField,
  defaultType: FieldType,
): string | number | null {
  const rule = normalizeRule(mapping[field]);
  if (!rule) return null;
  return coerce(rawValueFor(raw, rule), rule.type ?? defaultType);
}

export function extractString(
  raw: RawRow,
  mapping: FieldMapping,
  field: CanonicalField,
): string | null {
  const v = extract(raw, mapping, field, 'string');
  return v === null ? null : String(v);
}

export function extractAmount(
  raw: RawRow,
  mapping: FieldMapping,
  field: CanonicalField,
): number | null {
  const v = extract(raw, mapping, field, 'amount');
  return typeof v === 'number' ? v : null;
}

export function extractDate(
  raw: RawRow,
  mapping: FieldMapping,
  field: CanonicalField,
): string | null {
  const v = extract(raw, mapping, field, 'date');
  return typeof v === 'string' ? v : null;
}

export function extractInteger(
  raw: RawRow,
  mapping: FieldMapping,
  field: CanonicalField,
): number | null {
  const v = extract(raw, mapping, field, 'integer');
  return typeof v === 'number' ? v : null;
}

/** Raw (uncoerced) string for a field — used where we want the source text. */
export function extractRawString(
  raw: RawRow,
  mapping: FieldMapping,
  field: CanonicalField,
): string | null {
  const rule = normalizeRule(mapping[field]);
  if (!rule) return null;
  const v = rawValueFor(raw, rule);
  return v === null || v === undefined ? null : String(v).trim();
}
