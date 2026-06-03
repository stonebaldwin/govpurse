import type { ProcurementMethod } from '../types';

/**
 * Type coercion for messy source values. US-dollar / US-date oriented (the data
 * this product ingests). Pure and deterministic — no locale or timezone reads —
 * so server and client agree and tests are stable.
 */

/**
 * Parse a money value to a signed number of whole currency units.
 * Handles `$`, currency codes, thousands separators, and three negative
 * conventions: `($1,234.56)`, `1,234.56-`, and `-$1,234.56`. Empty → null.
 */
export function coerceAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let s = String(value).trim();
  if (s === '') return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/-\s*$/.test(s)) {
    negative = true;
    s = s.replace(/-\s*$/, '');
  }
  if (/^\s*-/.test(s)) {
    negative = true;
    s = s.replace(/^\s*-/, '');
  }

  // Keep digits, dot, comma; commas are US thousands separators.
  s = s.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  if (s === '' || s === '.') return null;

  // Collapse any stray extra dots (keep the first as the decimal point).
  const parts = s.split('.');
  if (parts.length > 2) s = `${parts[0]}.${parts.slice(1).join('')}`;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function toIsoDate(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/**
 * Parse a date to ISO `YYYY-MM-DD`. Handles ISO 8601 (with/without time, treated
 * as UTC), US `M/D/Y` and `M-D-Y` / `M.D.Y`, `YYYYMMDD`, and a best-effort
 * `Date.parse` fallback for things like `May 30, 2023`. Empty / unparseable → null.
 */
export function coerceDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : toIsoDate(value);

  const s = String(value).trim();
  if (s === '') return null;

  // ISO 8601 (date or datetime)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // US M/D/Y with / - or . separators
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[T ].*)?$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    let year = Number(m[3]);
    if (m[3]!.length === 2) year += year < 70 ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  }

  // YYYYMMDD
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }

  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) return toIsoDate(new Date(parsed));
  return null;
}

/**
 * Fiscal year for an ISO date, labeled by the calendar year in which the fiscal
 * year *ends* (the common US local-government convention). For a July start
 * (month 7), Jul 2024–Jun 2025 → FY2025. A calendar fiscal year (start month 1)
 * returns the calendar year.
 */
export function computeFiscalYear(isoDate: string | null, startMonth: number): number | null {
  if (!isoDate) return null;
  const m = isoDate.match(/^(\d{4})-(\d{2})-/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (startMonth <= 1) return year;
  return month >= startMonth ? year + 1 : year;
}

export function coerceInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
  const s = String(value).replace(/[^0-9-]/g, '');
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Trim and collapse internal whitespace; empty → null. */
export function coerceString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

/**
 * Map a free-text procurement/contract-method string to a small controlled
 * vocabulary. Conservative — anything present but unrecognized is `'other'`, not
 * a specific (potentially misleading) category. Returns both the normalized
 * value and whether input was present.
 */
export function normalizeProcurementMethod(value: unknown): {
  method: ProcurementMethod;
  raw: string | null;
} {
  const raw = coerceString(value);
  if (raw === null) return { method: null, raw: null };
  const s = raw.toLowerCase();
  if (/(sole.?source|single.?source|no.?bid|non.?competitive|sole)/.test(s)) {
    return { method: 'sole-source', raw };
  }
  if (
    /(competitive|sealed|\brfp\b|\brfq\b|\bifb\b|\bbid\b|invitation to bid|low(est)? bid)/.test(s)
  ) {
    return { method: 'competitive-bid', raw };
  }
  if (/(cooperative|co-?op|piggy.?back|gpo|state contract|interlocal)/.test(s)) {
    return { method: 'cooperative', raw };
  }
  if (/emergency/.test(s)) return { method: 'emergency', raw };
  return { method: 'other', raw };
}
