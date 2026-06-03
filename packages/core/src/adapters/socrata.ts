import type { DatasetConfig } from '../config';
import { HttpError, ParseError, PortalShapeChangedError } from '../errors';
import { createRateLimiter, resilientFetch } from '../net/http';
import { normalizeRecord, type NormalizeContext } from '../normalize/normalizer';
import type { CanonicalRecord, RawRow } from '../types';
import type { FetchOptions, SourceAdapter } from './types';

const SODA_MAX_PAGE = 50_000;

/**
 * Socrata SODA adapter — the highest-leverage source.
 *
 * Queries any Socrata "open checkbook" / spending dataset via the public SODA
 * API with SoQL. NO API key is required for public datasets; an optional app
 * token (`config.apiToken`) raises rate limits. Parameterized entirely by
 * `portalBaseUrl` + `datasetId` + `fieldMapping`, so it runs in a plain Workers
 * cron and a new jurisdiction is just a new `DatasetConfig`.
 *
 * Docs: https://dev.socrata.com/
 */
export class SocrataAdapter implements SourceAdapter {
  readonly id = 'socrata';
  readonly platform = 'socrata' as const;
  readonly method = 'api' as const;

  async fetchRaw(config: DatasetConfig, options: FetchOptions = {}): Promise<RawRow[]> {
    if (!config.datasetId) {
      throw new PortalShapeChangedError('Socrata dataset requires a datasetId', {
        context: { jurisdictionId: config.jurisdictionId },
      });
    }

    const { since, signal, fetchImpl, sleep, maxRows } = options;
    const base = config.portalBaseUrl.replace(/\/+$/, '');
    const resource = `${base}/resource/${config.datasetId}.json`;
    const pageSize = Math.min(config.pageSize ?? SODA_MAX_PAGE, SODA_MAX_PAGE);
    const where = buildWhere(config, since);
    const headers = config.apiToken ? { 'X-App-Token': config.apiToken } : undefined;
    const limiter = createRateLimiter(options.minIntervalMs ?? 250, sleep);

    const rows: RawRow[] = [];
    let offset = 0;

    for (;;) {
      if (signal?.aborted) break;
      await limiter();

      // `:id` is a stable, unique system field — safe for offset pagination.
      const params = new URLSearchParams({
        $limit: String(pageSize),
        $offset: String(offset),
        $order: ':id',
      });
      if (where) params.set('$where', where);
      const url = `${resource}?${params.toString()}`;

      let response: Response;
      try {
        response = await resilientFetch(url, { headers, fetchImpl, signal, sleep });
      } catch (err) {
        if (err instanceof HttpError && (err.status === 400 || err.status === 404)) {
          throw new PortalShapeChangedError(
            `Socrata rejected the query (HTTP ${err.status}) — dataset id or a mapped column may have changed`,
            { cause: err, context: { url, datasetId: config.datasetId } },
          );
        }
        throw err;
      }

      let page: unknown;
      try {
        page = await response.json();
      } catch (err) {
        throw new ParseError('Socrata response was not valid JSON', {
          cause: err,
          context: { url },
        });
      }

      if (!Array.isArray(page)) {
        throw new PortalShapeChangedError('Socrata returned a non-array response', {
          context: { url, sample: page },
        });
      }

      for (const row of page) rows.push(row as RawRow);

      if (page.length < pageSize) break;
      offset += pageSize;
      if (maxRows && rows.length >= maxRows) break;
    }

    return maxRows ? rows.slice(0, maxRows) : rows;
  }

  normalize(raw: RawRow, config: DatasetConfig, ctx?: NormalizeContext): CanonicalRecord {
    return normalizeRecord(raw, config, ctx);
  }
}

/** Build the SoQL `$where` from the dataset's static filter + incremental `since`. */
export function buildWhere(config: DatasetConfig, since?: Date): string | undefined {
  const clauses: string[] = [];
  if (config.soqlWhere) clauses.push(`(${config.soqlWhere})`);
  if (since && config.dateColumn) {
    // SODA floating timestamps have no zone; use a naive ISO (no trailing Z).
    const iso = since.toISOString().slice(0, 19);
    clauses.push(`${config.dateColumn} >= '${iso}'`);
  }
  return clauses.length ? clauses.join(' AND ') : undefined;
}
