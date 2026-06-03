import type { DatasetConfig } from '../config';
import type { FetchImpl } from '../net/http';
import type { NormalizeContext } from '../normalize/normalizer';
import type { AdapterMethod, CanonicalRecord, Platform, RawRow } from '../types';

export interface FetchOptions {
  /** Incremental pull: only rows on/after this instant (needs `config.dateColumn`). */
  since?: Date;
  /** External abort (e.g. Worker shutdown). */
  signal?: AbortSignal;
  /** Injectable fetch for tests; defaults to platform `fetch`. */
  fetchImpl?: FetchImpl;
  /** Injectable sleep for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Minimum ms between requests to one portal (politeness). */
  minIntervalMs?: number;
  /** Cap rows fetched (preview / smoke tests). */
  maxRows?: number;
}

/**
 * A platform adapter. One adapter unlocks many jurisdictions through per-dataset
 * `DatasetConfig` — adding coverage is data entry, not code.
 *
 * (The build plan typed `normalize` as returning `CanonicalTransaction`; we
 * generalize to `CanonicalRecord` so the same adapter handles budgets and
 * contracts via the same field-mapping system.)
 */
export interface SourceAdapter {
  readonly id: string;
  readonly platform: Platform;
  readonly method: AdapterMethod;
  fetchRaw(config: DatasetConfig, options?: FetchOptions): Promise<RawRow[]>;
  normalize(raw: RawRow, config: DatasetConfig, ctx?: NormalizeContext): CanonicalRecord;
}
