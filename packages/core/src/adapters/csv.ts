import type { DatasetConfig } from '../config';
import { ParseError } from '../errors';
import { resilientFetch } from '../net/http';
import { normalizeRecord, type NormalizeContext } from '../normalize/normalizer';
import type { CanonicalRecord, RawRow } from '../types';
import type { FetchOptions, SourceAdapter } from './types';

/**
 * Tokenize CSV text into rows of string cells. A correct state machine —
 * handles quoted fields, embedded commas/newlines, and `""` escapes; tolerant of
 * CRLF/CR. (We don't use a regex; CSV is not a regular language.)
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/\r\n?/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse CSV text into objects keyed by the (trimmed) header row. */
export function parseCsv(text: string): RawRow[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim());
  const out: RawRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!;
    if (cells.length === 1 && cells[0] === '') continue; // blank line
    const obj: RawRow = {};
    for (let c = 0; c < header.length; c++) obj[header[c]!] = cells[c] ?? '';
    out.push(obj);
  }
  return out;
}

/**
 * Generic CSV / portal adapter. Many governments publish checkbook CSVs. For the
 * `csv` platform, `config.portalBaseUrl` is the CSV file URL. JS-rendered portals
 * that need a real browser are handled by the `browser` platform (Phase 6).
 */
export class CsvAdapter implements SourceAdapter {
  readonly id = 'csv';
  readonly platform = 'csv' as const;
  readonly method = 'csv' as const;

  async fetchRaw(config: DatasetConfig, options: FetchOptions = {}): Promise<RawRow[]> {
    const { signal, fetchImpl, sleep, maxRows } = options;
    const url = config.portalBaseUrl;
    const response = await resilientFetch(url, { fetchImpl, signal, sleep });
    let text: string;
    try {
      text = await response.text();
    } catch (err) {
      throw new ParseError('Could not read CSV body', { cause: err, context: { url } });
    }
    const rows = parseCsv(text);
    return maxRows ? rows.slice(0, maxRows) : rows;
  }

  normalize(raw: RawRow, config: DatasetConfig, ctx?: NormalizeContext): CanonicalRecord {
    return normalizeRecord(raw, config, ctx);
  }
}
