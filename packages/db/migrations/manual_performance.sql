-- Performance indexes (applied out-of-band; not part of the drizzle-kit journal
-- because gin_trgm_ops is not expressible in the Drizzle schema builder).
-- Safe to re-run: every statement is IF NOT EXISTS.
--
-- Apply with:  psql "$DATABASE_URL" -f packages/db/migrations/manual_performance.sql
-- (or run each statement via the Neon driver).

-- Substring vendor search: ILIKE '%q%' on a 500k+ row table was a full seq-scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS transactions_vendor_raw_trgm_idx
  ON transactions USING gin (vendor_name_raw gin_trgm_ops);

-- "Biggest payments" per jurisdiction + search amount-sort within a jurisdiction.
CREATE INDEX IF NOT EXISTS transactions_jurisdiction_amount_idx
  ON transactions (jurisdiction_id, amount);

-- Operational-vendor aggregation (GROUP BY vendor_id within a jurisdiction).
CREATE INDEX IF NOT EXISTS transactions_jurisdiction_vendor_idx
  ON transactions (jurisdiction_id, vendor_id);
