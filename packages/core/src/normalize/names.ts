/**
 * Name normalization for vendors and departments. The vendor normalizer
 * produces a stable *matching key* used by entity resolution and for grouping —
 * it standardizes corporate suffixes but deliberately KEEPS them, because
 * "ABC Inc" and "ABC LLC" may be genuinely different entities (dropping the
 * suffix is a classic over-merge bug, the product's #1 correctness risk).
 */

const SUFFIX_CANON: Record<string, string> = {
  INCORPORATED: 'INC',
  INC: 'INC',
  LLC: 'LLC',
  LLP: 'LLP',
  LP: 'LP',
  CORPORATION: 'CORP',
  CORP: 'CORP',
  COMPANY: 'CO',
  CO: 'CO',
  LIMITED: 'LTD',
  LTD: 'LTD',
  PLLC: 'PLLC',
  PC: 'PC',
};

/**
 * Normalize a vendor name to an uppercase, punctuation-free matching key with
 * standardized corporate suffixes. Returns `''` for empty input.
 */
export function normalizeVendorName(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw)
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[.,'"`/\\()\-_]/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (s.startsWith('THE ')) s = s.slice(4);

  const tokens = s.split(' ').filter(Boolean);
  const canon = tokens.map((t) => SUFFIX_CANON[t] ?? t);
  return collapseInitialRuns(canon).join(' ').trim();
}

/**
 * Collapse runs of ≥2 consecutive single-character tokens into one token, so
 * spaced-out acronyms unify: `A B C INC` → `ABC INC`, `J P MORGAN` → `JP MORGAN`.
 * Lone single letters (e.g. the "R" in "H AND R BLOCK") are left untouched, so
 * this never over-merges distinct names.
 */
function collapseInitialRuns(tokens: string[]): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 2) out.push(run.join(''));
    else out.push(...run);
    run = [];
  };
  for (const t of tokens) {
    if (t.length === 1) run.push(t);
    else {
      flush();
      out.push(t);
    }
  }
  flush();
  return out;
}

/** Normalize a department/agency name for grouping (uppercase, collapsed). */
export function normalizeDepartmentName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw)
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[.,'"`/\\()\-_]/g, ' ')
    .replace(/\bDEPT\b/g, 'DEPARTMENT')
    .replace(/\s+/g, ' ')
    .trim();
  return s === '' ? null : s;
}

/** Lightweight, deterministic tokens for blocking/scoring (no suffix changes). */
export function nameTokens(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}
