import { HttpError, NetworkError, RateLimitError, TimeoutError } from '../errors';

/** Injectable fetch — defaults to the platform `fetch` (Workers, Node ≥18). */
export type FetchImpl = typeof fetch;

export interface ResilientFetchOptions {
  timeoutMs?: number;
  /** Total attempts = retries + 1. */
  retries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  headers?: Record<string, string>;
  fetchImpl?: FetchImpl;
  /** External abort (e.g. a Worker shutting down). */
  signal?: AbortSignal;
  /** Injectable sleep, for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULTS = {
  timeoutMs: 30_000,
  retries: 3,
  baseBackoffMs: 500,
  maxBackoffMs: 15_000,
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full jitter exponential backoff (AWS-style), capped. */
function backoffDelay(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

/**
 * Fetch with timeout, bounded retries (full-jitter exponential backoff), and
 * typed errors. Retries network failures, timeouts, 429s (honoring `Retry-After`),
 * and 5xx. Never retries 4xx (except 429). The returned `Response` is guaranteed
 * 2xx; non-2xx throws `HttpError`/`RateLimitError`.
 */
export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = DEFAULTS.timeoutMs,
    retries = DEFAULTS.retries,
    baseBackoffMs = DEFAULTS.baseBackoffMs,
    maxBackoffMs = DEFAULTS.maxBackoffMs,
    headers,
    fetchImpl = fetch,
    signal,
    sleep = defaultSleep,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new NetworkError('Aborted before request', { context: { url } });

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, { headers, signal: controller.signal });

      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
        lastError = new RateLimitError(`Rate limited (429) for ${url}`, {
          retryAfterMs,
          context: { url },
        });
        if (attempt < retries) {
          await sleep(retryAfterMs ?? backoffDelay(attempt, baseBackoffMs, maxBackoffMs));
          continue;
        }
        throw lastError;
      }

      const httpError = new HttpError(response.status, `HTTP ${response.status} for ${url}`, {
        context: { url, statusText: response.statusText },
      });
      if (httpError.retriable && attempt < retries) {
        lastError = httpError;
        await sleep(backoffDelay(attempt, baseBackoffMs, maxBackoffMs));
        continue;
      }
      throw httpError;
    } catch (err) {
      if (err instanceof HttpError || err instanceof RateLimitError) throw err;

      // Distinguish our timeout abort from an external abort.
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort && signal?.aborted) {
        throw new NetworkError('Request aborted by caller', { cause: err, context: { url } });
      }
      lastError = isAbort
        ? new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`, { context: { url } })
        : new NetworkError(`Network error for ${url}`, { cause: err, context: { url } });

      if (attempt < retries) {
        await sleep(backoffDelay(attempt, baseBackoffMs, maxBackoffMs));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  // Unreachable, but keeps the type checker happy.
  throw lastError ?? new NetworkError(`Failed to fetch ${url}`, { context: { url } });
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/**
 * A minimum-interval rate limiter — politeness for portals that don't want to be
 * hammered. `acquire()` resolves no sooner than `minIntervalMs` after the prior
 * acquire. Serializes callers through a single chain.
 */
export function createRateLimiter(
  minIntervalMs: number,
  sleep: (ms: number) => Promise<void> = defaultSleep,
): () => Promise<void> {
  let last = 0;
  let chain: Promise<void> = Promise.resolve();

  return () => {
    chain = chain.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, last + minIntervalMs - now);
      if (wait > 0) await sleep(wait);
      last = Date.now();
    });
    return chain;
  };
}
