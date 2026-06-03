/**
 * Typed errors. Adapters and the pipeline throw these so callers (and the
 * ingestion-health monitor) can react precisely — e.g. distinguish a transient
 * network blip from a portal whose schema changed under us.
 */

export type CoreErrorCode =
  | 'config_invalid'
  | 'network'
  | 'timeout'
  | 'rate_limited'
  | 'http_error'
  | 'parse_error'
  | 'mapping_error'
  | 'portal_shape_changed';

export class CoreError extends Error {
  readonly code: CoreErrorCode;
  readonly retriable: boolean;
  override readonly cause?: unknown;
  readonly context?: Record<string, unknown>;

  constructor(
    code: CoreErrorCode,
    message: string,
    options: { retriable?: boolean; cause?: unknown; context?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = 'CoreError';
    this.code = code;
    this.retriable = options.retriable ?? false;
    this.cause = options.cause;
    this.context = options.context;
  }
}

/** Network/transport failure (DNS, reset, fetch threw). Retriable. */
export class NetworkError extends CoreError {
  constructor(
    message: string,
    options: { cause?: unknown; context?: Record<string, unknown> } = {},
  ) {
    super('network', message, { ...options, retriable: true });
    this.name = 'NetworkError';
  }
}

/** Request exceeded the configured timeout. Retriable. */
export class TimeoutError extends CoreError {
  constructor(message: string, options: { context?: Record<string, unknown> } = {}) {
    super('timeout', message, { ...options, retriable: true });
    this.name = 'TimeoutError';
  }
}

/** Server returned 429 / explicit rate-limit. Retriable (with backoff). */
export class RateLimitError extends CoreError {
  readonly retryAfterMs?: number;
  constructor(
    message: string,
    options: { retryAfterMs?: number; context?: Record<string, unknown> } = {},
  ) {
    super('rate_limited', message, { ...options, retriable: true });
    this.name = 'RateLimitError';
    this.retryAfterMs = options.retryAfterMs;
  }
}

/** Non-2xx response. Retriable only for 5xx. */
export class HttpError extends CoreError {
  readonly status: number;
  constructor(
    status: number,
    message: string,
    options: { context?: Record<string, unknown> } = {},
  ) {
    super('http_error', message, { ...options, retriable: status >= 500 });
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Response body could not be parsed (bad JSON/CSV). Not retriable. */
export class ParseError extends CoreError {
  constructor(
    message: string,
    options: { cause?: unknown; context?: Record<string, unknown> } = {},
  ) {
    super('parse_error', message, { ...options, retriable: false });
    this.name = 'ParseError';
  }
}

/** A field mapping could not be applied (missing required column, bad coercion). */
export class MappingError extends CoreError {
  constructor(message: string, options: { context?: Record<string, unknown> } = {}) {
    super('mapping_error', message, { ...options, retriable: false });
    this.name = 'MappingError';
  }
}

/**
 * The portal's response shape no longer matches the dataset config (renamed
 * columns, changed dataset id, SoQL rejected). This is the #1 real-world
 * breakage and is surfaced loudly to the operator by the health monitor.
 */
export class PortalShapeChangedError extends CoreError {
  constructor(
    message: string,
    options: { cause?: unknown; context?: Record<string, unknown> } = {},
  ) {
    super('portal_shape_changed', message, { ...options, retriable: false });
    this.name = 'PortalShapeChangedError';
  }
}
