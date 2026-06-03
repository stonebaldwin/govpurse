# Adding a jurisdiction

This is the recurring growth task, and it is meant to be **near-pure configuration** —
declaring a `spend_datasets` row, not writing code. One platform adapter unlocks many
jurisdictions through per-dataset config.

## 1. Find a dataset

Follow the data: prioritize governments that already publish clean, transaction-level
checkbook data. Socrata "open checkbook" portals are the easiest (key-less SODA API).

Use Socrata's Discovery API to find live datasets without guessing:

```bash
curl -s "https://api.us.socrata.com/api/catalog/v1?q=vendor+payments+checkbook&only=dataset&limit=12" \
  | python3 -c "import json,sys; [print(r['metadata']['domain'],'|',r['resource']['id'],'|',r['resource']['name']) for r in json.load(sys.stdin)['results']]"
```

Note the **portal domain** and **resource id** (e.g. `data.delaware.gov` / `5s6n-7hpx`).

## 2. Inspect the columns

```bash
curl -s "https://<domain>/resource/<id>.json?\$limit=1" | python3 -m json.tool
```

Write down the column names for vendor, amount, date, department, category, fiscal year, etc.

## 3. Smoke-test the adapter live

```bash
pnpm --filter @govpurse/core smoke:socrata https://<domain> <id>
```

This pulls a bounded sample through the full Core pipeline (normalize → resolve → analytics →
health) and prints a summary. Adjust the field mapping in `scripts/smoke-socrata.ts` until the
top vendors / departments look right.

## 4. Declare the dataset

Insert a `jurisdictions` row and a `spend_datasets` row (via a seed/migration, Drizzle Studio,
or an admin tool). The `field_mapping` maps the portal's columns to canonical fields:

```jsonc
{
  "id": "state-of-delaware:checkbook",
  "jurisdictionId": "state-of-delaware",
  "platform": "socrata",
  "portalBaseUrl": "https://data.delaware.gov",
  "datasetId": "5s6n-7hpx",
  "recordType": "transaction",
  "cadence": "monthly",
  "fiscalYearStartMonth": 7,
  "fieldMapping": {
    "sourceRecordId": "check_number",
    "vendorName": { "from": ["vendor", "payee"] },
    "department": "department",
    "category": "category",
    "fund": "fund_type",
    "amount": { "from": "amount", "type": "amount" },
    "transactionDate": "check_date",
    "fiscalYear": "fiscal_year",
  },
}
```

Field-mapping notes:

- A bare string is shorthand for `{ "from": "<column>" }`.
- `from` may be an array; the first present, non-empty column wins.
- `type` is usually inferred (`amount`, `date`, `integer`, `string`); override when needed.
- Set `dateColumn` to enable incremental (`since`) SODA pulls; `soqlWhere` to pre-filter.

## 5. Activate

Set `is_active = true`. The ingest Worker's cron (daily) will pick it up; the per-dataset
`cadence` gates how often it actually runs, so SODA isn't hammered. Watch the run in the admin
cockpit (`/admin`) — health, mapping-error rate, and any anomalies surface there, and the
operator is emailed if a portal's schema changes.
