import type { DatasetConfig } from '../config';
import { ParseError, PortalShapeChangedError } from '../errors';
import { resilientFetch } from '../net/http';
import { normalizeRecord, type NormalizeContext } from '../normalize/normalizer';
import type { CanonicalRecord, RawRow } from '../types';
import type { FetchOptions, SourceAdapter } from './types';

const ENVELOPE_KEYS = ['data', 'results', 'records', 'rows', 'transactions', 'items'] as const;

/** Pull the row array out of a JSON payload, supporting common envelopes. */
export function extractRowArray(json: unknown): RawRow[] | null {
  if (Array.isArray(json)) return json as RawRow[];
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    for (const key of ENVELOPE_KEYS) {
      if (Array.isArray(obj[key])) return obj[key] as RawRow[];
    }
  }
  return null;
}

/**
 * OpenGov adapter — for OpenGov-hosted transparency/budget data exposed as JSON.
 *
 * OpenGov shapes vary; this reads a JSON endpoint (`portalBaseUrl` + optional
 * `datasetId` path) and tolerates either a bare array or a common envelope
 * (`data` / `results` / `records` / …), then normalizes via the field mapping.
 * Where a deployment needs auth or a bespoke shape, extend per-deployment.
 */
export class OpenGovAdapter implements SourceAdapter {
  readonly id = 'opengov';
  readonly platform = 'opengov' as const;
  readonly method = 'api' as const;

  async fetchRaw(config: DatasetConfig, options: FetchOptions = {}): Promise<RawRow[]> {
    const { signal, fetchImpl, sleep, maxRows } = options;
    const base = config.portalBaseUrl.replace(/\/+$/, '');
    const url = config.datasetId ? `${base}/${config.datasetId}` : base;
    const headers = config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : undefined;

    const response = await resilientFetch(url, { headers, fetchImpl, signal, sleep });
    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      throw new ParseError('OpenGov response was not valid JSON', { cause: err, context: { url } });
    }

    const rows = extractRowArray(json);
    if (!rows) {
      throw new PortalShapeChangedError('OpenGov response had no recognizable row array', {
        context: { url },
      });
    }
    return maxRows ? rows.slice(0, maxRows) : rows;
  }

  normalize(raw: RawRow, config: DatasetConfig, ctx?: NormalizeContext): CanonicalRecord {
    return normalizeRecord(raw, config, ctx);
  }
}
