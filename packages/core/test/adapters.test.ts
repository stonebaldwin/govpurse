import { describe, expect, it } from 'vitest';
import { CsvAdapter, parseCsv } from '../src/adapters/csv';
import { extractRowArray } from '../src/adapters/opengov';
import { SocrataAdapter } from '../src/adapters/socrata';
import type { DatasetConfig } from '../src/config';
import { PortalShapeChangedError } from '../src/errors';
import type { FetchImpl } from '../src/net/http';

const noopSleep = () => Promise.resolve();

const socrataConfig: DatasetConfig = {
  jurisdictionId: 'la',
  platform: 'socrata',
  portalBaseUrl: 'https://data.example.gov',
  datasetId: 'abcd-1234',
  recordType: 'transaction',
  cadence: 'monthly',
  pageSize: 2,
  fieldMapping: { vendorName: 'vendor', amount: 'amount' },
};

describe('SocrataAdapter', () => {
  it('paginates with $limit/$offset until a short page', async () => {
    const pages: Record<number, unknown[]> = {
      0: [
        { vendor: 'A', amount: '1' },
        { vendor: 'B', amount: '2' },
      ],
      2: [{ vendor: 'C', amount: '3' }],
    };
    const fetchImpl: FetchImpl = async (input) => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get('$offset') ?? '0');
      return new Response(JSON.stringify(pages[offset] ?? []), { status: 200 });
    };
    const rows = await new SocrataAdapter().fetchRaw(socrataConfig, {
      fetchImpl,
      sleep: noopSleep,
      minIntervalMs: 0,
    });
    expect(rows).toHaveLength(3);
  });

  it('maps a 400 (bad SoQL / renamed column) to PortalShapeChangedError', async () => {
    const fetchImpl = async () => new Response('{"error":true}', { status: 400 });
    await expect(
      new SocrataAdapter().fetchRaw(socrataConfig, {
        fetchImpl,
        sleep: noopSleep,
        minIntervalMs: 0,
      }),
    ).rejects.toBeInstanceOf(PortalShapeChangedError);
  });

  it('treats a non-array body as a portal shape change', async () => {
    const fetchImpl = async () => new Response('{"error":true}', { status: 200 });
    await expect(
      new SocrataAdapter().fetchRaw(socrataConfig, {
        fetchImpl,
        sleep: noopSleep,
        minIntervalMs: 0,
      }),
    ).rejects.toBeInstanceOf(PortalShapeChangedError);
  });
});

describe('parseCsv', () => {
  it('handles quoted fields with embedded commas and newlines', () => {
    const text = 'name,amount,note\n"Acme, Inc",100,"line1\nline2"\nBeta,50,ok\n';
    const rows = parseCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Acme, Inc', amount: '100', note: 'line1\nline2' });
    expect(rows[1]).toEqual({ name: 'Beta', amount: '50', note: 'ok' });
  });

  it('handles escaped quotes', () => {
    const rows = parseCsv('a\n"say ""hi"""\n');
    expect(rows[0]).toEqual({ a: 'say "hi"' });
  });
});

describe('CsvAdapter', () => {
  it('fetches and parses a CSV via injected fetch', async () => {
    const config: DatasetConfig = {
      jurisdictionId: 'x',
      platform: 'csv',
      portalBaseUrl: 'https://example.test/data.csv',
      recordType: 'transaction',
      cadence: 'monthly',
      fieldMapping: { vendorName: 'vendor', amount: 'amount' },
    };
    const fetchImpl = async () => new Response('vendor,amount\nAcme,100\n', { status: 200 });
    const rows = await new CsvAdapter().fetchRaw(config, { fetchImpl, sleep: noopSleep });
    expect(rows).toEqual([{ vendor: 'Acme', amount: '100' }]);
  });
});

describe('OpenGov extractRowArray', () => {
  it('accepts a bare array or a common envelope', () => {
    expect(extractRowArray([{ a: 1 }])).toHaveLength(1);
    expect(extractRowArray({ data: [{ a: 1 }] })).toHaveLength(1);
    expect(extractRowArray({ results: [{ a: 1 }, { b: 2 }] })).toHaveLength(2);
    expect(extractRowArray({ nope: 1 })).toBeNull();
  });
});
