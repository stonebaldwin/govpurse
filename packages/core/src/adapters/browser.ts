import type { DatasetConfig } from '../config';
import { CoreError } from '../errors';
import { normalizeRecord, type NormalizeContext } from '../normalize/normalizer';
import type { CanonicalRecord, RawRow } from '../types';
import type { FetchOptions, SourceAdapter } from './types';

/**
 * Browser adapter — for JS-rendered portals with no API/CSV. The actual scrape
 * runs on a Cloudflare Queue consumer with a Browser Rendering (Puppeteer)
 * binding, wired in Phase 6. Normalization is identical (field mapping), so only
 * `fetchRaw` is deferred. It throws clearly until then.
 */
export class BrowserAdapter implements SourceAdapter {
  readonly id = 'browser';
  readonly platform = 'browser' as const;
  readonly method = 'browser' as const;

  async fetchRaw(config: DatasetConfig, _options: FetchOptions = {}): Promise<RawRow[]> {
    throw new CoreError(
      'config_invalid',
      'Browser adapter requires Browser Rendering (wired in Phase 6)',
      { context: { jurisdictionId: config.jurisdictionId } },
    );
  }

  normalize(raw: RawRow, config: DatasetConfig, ctx?: NormalizeContext): CanonicalRecord {
    return normalizeRecord(raw, config, ctx);
  }
}
