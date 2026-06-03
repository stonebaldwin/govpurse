/**
 * Pure string-similarity primitives for vendor entity resolution. No I/O, no
 * randomness — deterministic and unit-testable. All return a similarity in
 * [0, 1] where 1 is identical.
 */

/** Jaro similarity. */
export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const al = a.length;
  const bl = b.length;
  if (al === 0 || bl === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(al, bl) / 2) - 1);
  const aMatched: boolean[] = new Array(al).fill(false);
  const bMatched: boolean[] = new Array(bl).fill(false);
  let matches = 0;

  for (let i = 0; i < al; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, bl);
    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < al; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / al + matches / bl + (matches - transpositions) / matches) / 3;
}

/** Jaro–Winkler — boosts matches that share a common prefix. */
export function jaroWinkler(a: string, b: string, prefixWeight = 0.1): number {
  const j = jaro(a, b);
  let prefix = 0;
  const max = Math.min(4, a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * prefixWeight * (1 - j);
}

/** Levenshtein edit distance (two-row DP). */
export function levenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = Array.from({ length: bl + 1 }, (_, i) => i);
  let curr = new Array<number>(bl + 1).fill(0);

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl]!;
}

/** Normalized Levenshtein similarity in [0, 1]. */
export function ratio(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** Similarity after sorting whitespace-separated tokens — order-insensitive. */
export function tokenSortRatio(a: string, b: string): number {
  const sort = (s: string) => s.split(' ').filter(Boolean).sort().join(' ');
  return ratio(sort(a), sort(b));
}

/** Jaccard overlap of two token sets. */
export function tokenJaccard(aTokens: string[], bTokens: string[]): number {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
