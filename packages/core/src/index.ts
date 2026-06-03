/**
 * @govpurse/core — "the Core".
 *
 * A platform-agnostic, product-agnostic public-data ingestion engine for
 * financial/spending records. Contains NO Govpurse-specific UI or billing logic,
 * so sibling products reuse it verbatim. Persistence is via the `IngestStore`
 * port (Drizzle implementation lives in the app/db layer).
 */

export const CORE_VERSION = '0.1.0';

// Domain + foundations
export * from './types';
export * from './errors';
export * from './config';
export * from './net/http';

// Mapping + normalization
export * from './mapping/coerce';
export * from './mapping/field-mapping';
export * from './normalize/names';
export * from './normalize/normalizer';

// Adapters
export * from './adapters/types';
export * from './adapters/socrata';
export * from './adapters/csv';
export * from './adapters/opengov';
export * from './adapters/browser';
export { getAdapter } from './adapters/registry';

// Vendor entity resolution
export * from './resolve/similarity';
export * from './resolve/vendor-resolution';

// Spend analytics
export * from './analytics/types';
export * from './analytics/aggregate';
export * from './analytics/concentration';
export * from './analytics/spikes';
export * from './analytics/sole-source';

// Change/threshold events
export * from './events/spend-events';

// Ingestion health
export * from './health/sync-run';

// Persistence ports + in-memory store + pipeline
export * from './store/ports';
export * from './store/memory-store';
export * from './pipeline';
