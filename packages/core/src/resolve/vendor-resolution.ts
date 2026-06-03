import { nameTokens } from '../normalize/names';
import { jaroWinkler, tokenSortRatio } from './similarity';

/**
 * Vendor entity-resolution — the standout analytic capability, and the single
 * biggest correctness risk in the product. Resolves messy name variants
 * ("ABC Inc", "A.B.C. Incorporated", "ABC INC.") into canonical vendor entities.
 *
 * Design: (1) exact-key grouping on the normalized name (high precision, free);
 * (2) blocking by first token / name prefix; (3) conservative fuzzy scoring;
 * (4) union-find merges only above a high threshold, with an ambiguous band
 * routed to a human review queue. Tuned to AVOID false merges — a hard conflict
 * on differing states blocks a merge outright, because combining two genuinely
 * different vendors is the mistake that destroys credibility.
 */

export interface VendorMention {
  id: string;
  nameRaw: string;
  nameNormalized: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface ResolvedVendor {
  id: string;
  canonicalName: string;
  normalizedName: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  variants: string[];
  mentionIds: string[];
  /** 1.0 for exact/singleton clusters; the weakest merge edge otherwise. */
  matchConfidence: number;
}

export interface ReviewPair {
  normalizedA: string;
  normalizedB: string;
  score: number;
  reason: string;
}

export interface ResolutionResult {
  vendors: ResolvedVendor[];
  reviewQueue: ReviewPair[];
  /** mention id → resolved vendor id. */
  assignment: Map<string, string>;
}

export interface ResolveOptions {
  /** Auto-merge at/above this combined score. Default 0.93 (conservative). */
  mergeThreshold?: number;
  /** Route to review in [reviewThreshold, mergeThreshold). Default 0.86. */
  reviewThreshold?: number;
  /** Skip pairwise comparison for blocks larger than this (perf guard). */
  maxBlockSize?: number;
}

interface Cluster {
  norm: string;
  tokens: string[];
  rawCounts: Map<string, number>;
  cityCounts: Map<string, number>;
  stateCounts: Map<string, number>;
  zipCounts: Map<string, number>;
  mentionIds: string[];
}

function bump(map: Map<string, number>, key: string | null | undefined): void {
  const k = (key ?? '').trim();
  if (k === '') return;
  map.set(k, (map.get(k) ?? 0) + 1);
}

function modeKey(map: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = -1;
  for (const [k, c] of map) {
    if (c > bestCount || (c === bestCount && best !== null && k < best)) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

function scoreClusters(
  a: Cluster,
  b: Cluster,
): { score: number; conflict: boolean; reason: string } {
  const nameSim = 0.5 * jaroWinkler(a.norm, b.norm) + 0.5 * tokenSortRatio(a.norm, b.norm);

  const aState = modeKey(a.stateCounts);
  const bState = modeKey(b.stateCounts);
  // Hard conflict: both list a state and they differ → different entities.
  if (aState && bState && aState !== bState) {
    return { score: nameSim, conflict: true, reason: `state ${aState}≠${bState}` };
  }

  let boost = 0;
  const aZip = modeKey(a.zipCounts);
  const bZip = modeKey(b.zipCounts);
  const aCity = modeKey(a.cityCounts);
  const bCity = modeKey(b.cityCounts);
  if (aZip && bZip && aZip === bZip) boost += 0.05;
  if (aState && bState && aState === bState) boost += 0.03;
  if (aCity && bCity && aCity === bCity) boost += 0.02;

  return {
    score: Math.min(1, nameSim + boost),
    conflict: false,
    reason: `name ${nameSim.toFixed(3)}`,
  };
}

/** Resolve a flat list of vendor mentions into canonical entities. */
export function resolveVendors(
  mentions: VendorMention[],
  options: ResolveOptions = {},
): ResolutionResult {
  const mergeThreshold = options.mergeThreshold ?? 0.93;
  const reviewThreshold = options.reviewThreshold ?? 0.86;
  const maxBlockSize = options.maxBlockSize ?? 2_500;

  // 1. Exact-key clustering. Empty-name mentions become per-mention singletons.
  const byKey = new Map<string, Cluster>();
  for (const m of mentions) {
    const key = m.nameNormalized !== '' ? `n:${m.nameNormalized}` : `m:${m.id}`;
    let cluster = byKey.get(key);
    if (!cluster) {
      cluster = {
        norm: m.nameNormalized,
        tokens: nameTokens(m.nameNormalized),
        rawCounts: new Map(),
        cityCounts: new Map(),
        stateCounts: new Map(),
        zipCounts: new Map(),
        mentionIds: [],
      };
      byKey.set(key, cluster);
    }
    bump(cluster.rawCounts, m.nameRaw || m.nameNormalized || 'Unknown vendor');
    bump(cluster.cityCounts, m.city);
    bump(cluster.stateCounts, m.state);
    bump(cluster.zipCounts, m.zip);
    cluster.mentionIds.push(m.id);
  }

  const clusters = [...byKey.values()];
  const parent = clusters.map((_, i) => i);
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r]!;
    let cur = x;
    while (parent[cur] !== r) {
      const next = parent[cur]!;
      parent[cur] = r;
      cur = next;
    }
    return r;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  // 2. Blocking by first token and 4-char prefix.
  const blocks = new Map<string, number[]>();
  clusters.forEach((c, idx) => {
    if (c.norm === '') return;
    const keys = new Set<string>();
    if (c.tokens[0]) keys.add(`t:${c.tokens[0]}`);
    keys.add(`p:${c.norm.slice(0, 4)}`);
    for (const key of keys) {
      const arr = blocks.get(key);
      if (arr) arr.push(idx);
      else blocks.set(key, [idx]);
    }
  });

  // 3. Compare candidate pairs; merge or route to review.
  const reviewQueue: ReviewPair[] = [];
  const mergeEdges: Array<{ a: number; b: number; score: number }> = [];
  const seen = new Set<string>();

  for (const idxs of blocks.values()) {
    if (idxs.length > maxBlockSize) continue;
    for (let x = 0; x < idxs.length; x++) {
      for (let y = x + 1; y < idxs.length; y++) {
        const a = Math.min(idxs[x]!, idxs[y]!);
        const b = Math.max(idxs[x]!, idxs[y]!);
        const pairKey = `${a}:${b}`;
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        const { score, conflict, reason } = scoreClusters(clusters[a]!, clusters[b]!);
        if (conflict) continue;
        if (score >= mergeThreshold) {
          union(a, b);
          mergeEdges.push({ a, b, score });
        } else if (score >= reviewThreshold) {
          reviewQueue.push({
            normalizedA: clusters[a]!.norm,
            normalizedB: clusters[b]!.norm,
            score,
            reason,
          });
        }
      }
    }
  }

  // Weakest merge edge per component → matchConfidence.
  const minScoreByRoot = new Map<number, number>();
  for (const edge of mergeEdges) {
    const root = find(edge.a);
    const prev = minScoreByRoot.get(root);
    minScoreByRoot.set(root, prev === undefined ? edge.score : Math.min(prev, edge.score));
  }

  // 4. Assemble components into resolved vendors.
  const components = new Map<number, number[]>();
  clusters.forEach((_, i) => {
    const root = find(i);
    const arr = components.get(root);
    if (arr) arr.push(i);
    else components.set(root, [i]);
  });

  const vendors: ResolvedVendor[] = [];
  const assignment = new Map<string, string>();

  for (const [root, memberIdxs] of components) {
    const raw = new Map<string, number>();
    const city = new Map<string, number>();
    const state = new Map<string, number>();
    const zip = new Map<string, number>();
    const mentionIds: string[] = [];
    const normsByMentions: Array<{ norm: string; mentions: number }> = [];

    for (const idx of memberIdxs) {
      const c = clusters[idx]!;
      for (const [k, n] of c.rawCounts) raw.set(k, (raw.get(k) ?? 0) + n);
      for (const [k, n] of c.cityCounts) city.set(k, (city.get(k) ?? 0) + n);
      for (const [k, n] of c.stateCounts) state.set(k, (state.get(k) ?? 0) + n);
      for (const [k, n] of c.zipCounts) zip.set(k, (zip.get(k) ?? 0) + n);
      mentionIds.push(...c.mentionIds);
      normsByMentions.push({ norm: c.norm, mentions: c.mentionIds.length });
    }

    normsByMentions.sort((p, q) => q.mentions - p.mentions || p.norm.localeCompare(q.norm));
    const normalizedName = normsByMentions[0]?.norm ?? '';
    const canonicalName = modeKey(raw) ?? 'Unknown vendor';
    const memberNorms = memberIdxs.map((i) => clusters[i]!.norm).sort();
    const id = `${slugify(normalizedName)}-${djb2(memberNorms.join('|'))}`;

    for (const m of mentionIds) assignment.set(m, id);

    vendors.push({
      id,
      canonicalName,
      normalizedName,
      city: modeKey(city),
      state: modeKey(state),
      zip: modeKey(zip),
      variants: [...raw.keys()].sort(),
      mentionIds,
      matchConfidence: minScoreByRoot.get(root) ?? 1,
    });
  }

  vendors.sort((a, b) => b.mentionIds.length - a.mentionIds.length || a.id.localeCompare(b.id));
  reviewQueue.sort((a, b) => b.score - a.score);

  return { vendors, reviewQueue, assignment };
}
