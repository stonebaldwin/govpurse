import { CoreError } from '../errors';
import type { Platform } from '../types';
import { BrowserAdapter } from './browser';
import { CsvAdapter } from './csv';
import { OpenGovAdapter } from './opengov';
import { SocrataAdapter } from './socrata';
import type { SourceAdapter } from './types';

const ADAPTERS: Record<Platform, SourceAdapter> = {
  socrata: new SocrataAdapter(),
  opengov: new OpenGovAdapter(),
  csv: new CsvAdapter(),
  browser: new BrowserAdapter(),
};

/** The adapter for a platform. Throws on an unknown platform. */
export function getAdapter(platform: Platform): SourceAdapter {
  const adapter = ADAPTERS[platform];
  if (!adapter) {
    throw new CoreError('config_invalid', `No adapter for platform "${platform}"`);
  }
  return adapter;
}
