/** Bindings + secrets available to the ingestion Worker. */
export interface Env {
  DATABASE_URL: string;
  SOCRATA_APP_TOKEN?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  OPERATOR_ALERT_EMAIL?: string;
  APP_URL?: string;
  /** Queue for `browser`-platform adapters (Phase 6 Browser Rendering path). */
  INGEST_QUEUE?: Queue;
  /** Browser Rendering binding (Puppeteer) for the queue consumer. */
  BROWSER?: Fetcher;
}
