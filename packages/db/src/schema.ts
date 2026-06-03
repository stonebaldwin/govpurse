import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Govpurse data model (Phase 2).
 *
 * Sections: (1) domain — the public spending data + ingestion bookkeeping;
 * (2) accounts & billing — Better-Auth-compatible auth tables + Stripe-derived
 * subscriptions; (3) product — saved views, alerts, usage, coverage requests.
 *
 * Money is stored as `numeric` (exact), dates as `date`, timestamps as
 * `timestamptz`. Indexes target the documented read patterns: filtered
 * transaction search, vendor/department/category rollups, and "active alert
 * views to evaluate against new transactions". `casing: 'snake_case'` (drizzle
 * config) maps these camelCase keys to snake_case columns.
 */

// ── Enums ────────────────────────────────────────────────────────────────────
export const platformEnum = pgEnum('platform', ['socrata', 'opengov', 'csv', 'browser']);
export const recordTypeEnum = pgEnum('record_type', ['transaction', 'budget', 'contract']);
export const cadenceEnum = pgEnum('cadence', ['daily', 'weekly', 'monthly']);
export const datasetStatusEnum = pgEnum('dataset_status', ['active', 'paused', 'broken']);
export const syncStatusEnum = pgEnum('sync_status', ['success', 'partial', 'failed']);
export const planEnum = pgEnum('plan', ['free', 'pro', 'business']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'unpaid',
]);
export const spendEventTypeEnum = pgEnum('spend_event_type', [
  'vendor-payment',
  'threshold-exceeded',
  'spending-spike',
  'sole-source-pattern',
]);
export const alertTypeEnum = pgEnum('alert_type', ['vendor-paid', 'category-spike', 'threshold']);
export const alertFrequencyEnum = pgEnum('alert_frequency', ['instant', 'daily', 'weekly']);
export const alertChannelEnum = pgEnum('alert_channel', ['email']);
export const alertDeliveryStatusEnum = pgEnum('alert_delivery_status', [
  'sent',
  'failed',
  'skipped',
]);
export const coverageStatusEnum = pgEnum('coverage_status', [
  'requested',
  'planned',
  'live',
  'declined',
]);

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const uuidPk = () =>
  text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// ── Domain ───────────────────────────────────────────────────────────────────
export const jurisdictions = pgTable(
  'jurisdictions',
  {
    id: text().primaryKey(), // slug, e.g. "state-of-delaware"
    name: text().notNull(),
    state: text().notNull(), // 2-letter
    type: text().notNull().default('city'), // city | county | state | special_district
    lat: doublePrecision(),
    lng: doublePrecision(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index('jurisdictions_state_idx').on(t.state)],
);

export const spendDatasets = pgTable(
  'spend_datasets',
  {
    id: text().primaryKey(), // slug, e.g. "state-of-delaware:checkbook"
    jurisdictionId: text()
      .notNull()
      .references(() => jurisdictions.id, { onDelete: 'cascade' }),
    platform: platformEnum().notNull(),
    portalBaseUrl: text().notNull(),
    datasetId: text(),
    /** Reference/name of a Worker secret for the app token — never the secret itself. */
    apiTokenRef: text(),
    fieldMapping: jsonb().$type<Record<string, unknown>>().notNull(),
    recordType: recordTypeEnum().notNull(),
    cadence: cadenceEnum().notNull(),
    currency: text().notNull().default('USD'),
    fiscalYearStartMonth: integer().notNull().default(7),
    soqlWhere: text(),
    dateColumn: text(),
    sourceUrlTemplate: text(),
    isActive: boolean().notNull().default(true),
    status: datasetStatusEnum().notNull().default('active'),
    lastSyncedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('spend_datasets_jurisdiction_idx').on(t.jurisdictionId),
    index('spend_datasets_active_idx').on(t.isActive),
  ],
);

export const vendors = pgTable(
  'vendors',
  {
    id: text().primaryKey(), // deterministic id from the resolver
    canonicalName: text().notNull(),
    normalizedName: text().notNull(),
    city: text(),
    state: text(),
    zip: text(),
    matchConfidence: doublePrecision().notNull().default(1),
    variants: jsonb().$type<string[]>().notNull().default([]),
    mentionCount: integer().notNull().default(0),
    /** Denormalized rollup; refreshed on ingest for fast vendor pages. */
    totalPaid: numeric({ precision: 18, scale: 2 }).notNull().default('0'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('vendors_normalized_name_idx').on(t.normalizedName),
    index('vendors_state_idx').on(t.state),
  ],
);

export const departments = pgTable(
  'departments',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jurisdictionId: text()
      .notNull()
      .references(() => jurisdictions.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    normalizedName: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('departments_jurisdiction_norm_uq').on(t.jurisdictionId, t.normalizedName),
    index('departments_jurisdiction_idx').on(t.jurisdictionId),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: text().primaryKey(), // `${jurisdictionId}:${sourceRecordId|contentHash}`
    jurisdictionId: text()
      .notNull()
      .references(() => jurisdictions.id, { onDelete: 'cascade' }),
    datasetId: text().references(() => spendDatasets.id, { onDelete: 'set null' }),
    vendorId: text().references(() => vendors.id, { onDelete: 'set null' }),
    departmentId: text().references(() => departments.id, { onDelete: 'set null' }),
    sourceRecordId: text(),
    vendorNameRaw: text().notNull().default(''),
    vendorNameNormalized: text().notNull().default(''),
    vendorCity: text(),
    vendorState: text(),
    vendorZip: text(),
    departmentRaw: text(),
    departmentNormalized: text(),
    category: text(),
    fund: text(),
    account: text(),
    amount: numeric({ precision: 16, scale: 2 }).notNull(),
    currency: text().notNull().default('USD'),
    transactionDate: date(),
    fiscalYear: integer(),
    paymentMethod: text(),
    poNumber: text(),
    procurementMethod: text(),
    procurementMethodRaw: text(),
    description: text(),
    sourceUrl: text(),
    retrievedAt: timestamp({ withTimezone: true }).notNull(),
    rawSnapshot: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('transactions_jurisdiction_date_idx').on(t.jurisdictionId, t.transactionDate),
    index('transactions_vendor_idx').on(t.vendorId),
    index('transactions_vendor_date_idx').on(t.vendorId, t.transactionDate),
    index('transactions_department_norm_idx').on(t.departmentNormalized),
    index('transactions_category_idx').on(t.category),
    index('transactions_fiscal_year_idx').on(t.fiscalYear),
    index('transactions_amount_idx').on(t.amount),
    index('transactions_dataset_idx').on(t.datasetId),
    // Jurisdiction "biggest payments" + search amount-sort within a jurisdiction.
    index('transactions_jurisdiction_amount_idx').on(t.jurisdictionId, t.amount),
    // Operational-vendor aggregation: GROUP BY vendor within a jurisdiction.
    index('transactions_jurisdiction_vendor_idx').on(t.jurisdictionId, t.vendorId),
    // NB: a GIN trigram index on vendor_name_raw (transactions_vendor_raw_trgm_idx)
    // backs the ILIKE '%q%' search; it's applied via
    // packages/db/migrations/manual_performance.sql since gin_trgm_ops cannot be
    // expressed in the Drizzle schema builder.
  ],
);

export const budgets = pgTable(
  'budgets',
  {
    id: uuidPk(),
    jurisdictionId: text()
      .notNull()
      .references(() => jurisdictions.id, { onDelete: 'cascade' }),
    fiscalYear: integer(),
    departmentNormalized: text(),
    category: text(),
    amountBudgeted: numeric({ precision: 18, scale: 2 }).notNull(),
    currency: text().notNull().default('USD'),
    sourceUrl: text(),
    retrievedAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('budgets_jurisdiction_fy_idx').on(t.jurisdictionId, t.fiscalYear)],
);

export const contracts = pgTable(
  'contracts',
  {
    id: text().primaryKey(),
    jurisdictionId: text()
      .notNull()
      .references(() => jurisdictions.id, { onDelete: 'cascade' }),
    vendorId: text().references(() => vendors.id, { onDelete: 'set null' }),
    vendorNameRaw: text().notNull().default(''),
    vendorNameNormalized: text().notNull().default(''),
    amount: numeric({ precision: 18, scale: 2 }),
    currency: text().notNull().default('USD'),
    termStart: date(),
    termEnd: date(),
    contractType: text(),
    procurementMethod: text(),
    description: text(),
    sourceUrl: text(),
    retrievedAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('contracts_jurisdiction_idx').on(t.jurisdictionId),
    index('contracts_vendor_idx').on(t.vendorId),
  ],
);

/** Pre-aggregated rollups for fast charts — refreshed on ingest, never per-request. */
export const spendAggregates = pgTable(
  'spend_aggregates',
  {
    id: uuidPk(),
    jurisdictionId: text()
      .notNull()
      .references(() => jurisdictions.id, { onDelete: 'cascade' }),
    dimension: text().notNull(), // 'overall' | 'department' | 'category' | 'vendor'
    dimensionKey: text(), // dept/category name or vendorId; null for 'overall'
    period: text(), // 'YYYY-MM' or null when fiscalYear is used
    fiscalYear: integer(),
    total: numeric({ precision: 18, scale: 2 }).notNull(),
    txnCount: integer().notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('spend_aggregates_uq').on(
      t.jurisdictionId,
      t.dimension,
      t.dimensionKey,
      t.period,
      t.fiscalYear,
    ),
    index('spend_aggregates_lookup_idx').on(t.jurisdictionId, t.dimension),
  ],
);

export const spendEvents = pgTable(
  'spend_events',
  {
    id: uuidPk(),
    type: spendEventTypeEnum().notNull(),
    jurisdictionId: text()
      .notNull()
      .references(() => jurisdictions.id, { onDelete: 'cascade' }),
    vendorId: text(),
    vendorName: text(),
    department: text(),
    category: text(),
    period: text(),
    amount: numeric({ precision: 16, scale: 2 }),
    value: numeric({ precision: 18, scale: 2 }).notNull(),
    occurredAt: date(),
    detail: jsonb().$type<Record<string, unknown>>(),
    dedupeKey: text().notNull(),
    watchId: text(),
    processed: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('spend_events_dedupe_uq').on(t.dedupeKey),
    index('spend_events_processed_idx').on(t.processed),
    index('spend_events_jurisdiction_idx').on(t.jurisdictionId),
  ],
);

export const syncRuns = pgTable(
  'sync_runs',
  {
    id: uuidPk(),
    jurisdictionId: text().notNull(),
    datasetId: text(),
    platform: platformEnum().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    finishedAt: timestamp({ withTimezone: true }).notNull(),
    rowsSeen: integer().notNull().default(0),
    rowsNew: integer().notNull().default(0),
    rowsUpdated: integer().notNull().default(0),
    mappingErrors: integer().notNull().default(0),
    status: syncStatusEnum().notNull(),
    anomalous: boolean().notNull().default(false),
    anomalyReasons: jsonb().$type<string[]>().notNull().default([]),
    error: text(),
    errorCode: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index('sync_runs_dataset_idx').on(t.jurisdictionId, t.datasetId),
    index('sync_runs_status_idx').on(t.status),
    index('sync_runs_created_idx').on(t.createdAt),
  ],
);

// ── Accounts & billing (Better Auth compatible) ──────────────────────────────
export const users = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  'session',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    activeOrganizationId: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

export const accounts = pgTable(
  'account',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);

export const verifications = pgTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const organizations = pgTable('organization', {
  id: text().primaryKey(),
  name: text().notNull(),
  slug: text().unique(),
  logo: text(),
  metadata: jsonb().$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const members = pgTable(
  'member',
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text().notNull().default('member'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('member_org_user_uq').on(t.organizationId, t.userId),
    index('member_user_idx').on(t.userId),
  ],
);

export const invitations = pgTable('invitation', {
  id: text().primaryKey(),
  organizationId: text()
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text().notNull(),
  role: text(),
  status: text().notNull().default('pending'),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  inviterId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuidPk(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text().references(() => organizations.id, { onDelete: 'cascade' }),
    stripeCustomerId: text(),
    stripeSubscriptionId: text(),
    stripePriceId: text(),
    plan: planEnum().notNull().default('free'),
    status: subscriptionStatusEnum().notNull().default('active'),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    cancelAtPeriodEnd: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('subscriptions_user_uq').on(t.userId),
    index('subscriptions_customer_idx').on(t.stripeCustomerId),
    index('subscriptions_subscription_idx').on(t.stripeSubscriptionId),
  ],
);

// ── Product ──────────────────────────────────────────────────────────────────
export const savedViews = pgTable(
  'saved_views',
  {
    id: uuidPk(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    /** jurisdiction / vendor / department / category / date+amount range. */
    filters: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    isAlert: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('saved_views_user_idx').on(t.userId)],
);

export const alertSubscriptions = pgTable(
  'alert_subscriptions',
  {
    id: uuidPk(),
    savedViewId: text()
      .notNull()
      .references(() => savedViews.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: alertTypeEnum().notNull(),
    frequency: alertFrequencyEnum().notNull().default('instant'),
    channel: alertChannelEnum().notNull().default('email'),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index('alert_subscriptions_view_idx').on(t.savedViewId),
    // Hot path: "active alert views to evaluate against new transactions".
    index('alert_subscriptions_active_idx').on(t.isActive, t.type),
  ],
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuidPk(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    alertSubscriptionId: text().references(() => alertSubscriptions.id, { onDelete: 'set null' }),
    savedViewId: text().references(() => savedViews.id, { onDelete: 'set null' }),
    spendEventId: text().references(() => spendEvents.id, { onDelete: 'set null' }),
    channel: alertChannelEnum().notNull().default('email'),
    status: alertDeliveryStatusEnum().notNull(),
    sentAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('alerts_user_idx').on(t.userId, t.createdAt),
    uniqueIndex('alerts_dedupe_uq').on(t.userId, t.savedViewId, t.spendEventId),
  ],
);

export const usageCounters = pgTable(
  'usage_counters',
  {
    id: uuidPk(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    period: text().notNull(), // 'YYYY-MM'
    key: text().notNull(), // e.g. 'exports'
    count: integer().notNull().default(0),
  },
  (t) => [uniqueIndex('usage_counters_uq').on(t.userId, t.period, t.key)],
);

export const coverageRequests = pgTable(
  'coverage_requests',
  {
    id: uuidPk(),
    userId: text().references(() => users.id, { onDelete: 'set null' }),
    email: text(),
    jurisdictionName: text().notNull(),
    state: text(),
    note: text(),
    status: coverageStatusEnum().notNull().default('requested'),
    createdAt: createdAt(),
  },
  (t) => [index('coverage_requests_status_idx').on(t.status)],
);

// ── Relations ────────────────────────────────────────────────────────────────
export const jurisdictionsRelations = relations(jurisdictions, ({ many }) => ({
  datasets: many(spendDatasets),
  transactions: many(transactions),
  departments: many(departments),
}));

export const spendDatasetsRelations = relations(spendDatasets, ({ one }) => ({
  jurisdiction: one(jurisdictions, {
    fields: [spendDatasets.jurisdictionId],
    references: [jurisdictions.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  jurisdiction: one(jurisdictions, {
    fields: [transactions.jurisdictionId],
    references: [jurisdictions.id],
  }),
  vendor: one(vendors, { fields: [transactions.vendorId], references: [vendors.id] }),
  department: one(departments, {
    fields: [transactions.departmentId],
    references: [departments.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  transactions: many(transactions),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  savedViews: many(savedViews),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  memberships: many(members),
}));

export const savedViewsRelations = relations(savedViews, ({ one, many }) => ({
  user: one(users, { fields: [savedViews.userId], references: [users.id] }),
  alertSubscriptions: many(alertSubscriptions),
}));

export const alertSubscriptionsRelations = relations(alertSubscriptions, ({ one }) => ({
  savedView: one(savedViews, {
    fields: [alertSubscriptions.savedViewId],
    references: [savedViews.id],
  }),
  user: one(users, { fields: [alertSubscriptions.userId], references: [users.id] }),
}));

// Keep `sql` referenced for consumers importing it from the schema module.
export { sql };

// ── Inferred types ───────────────────────────────────────────────────────────
export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type NewJurisdiction = typeof jurisdictions.$inferInsert;
export type SpendDataset = typeof spendDatasets.$inferSelect;
export type NewSpendDataset = typeof spendDatasets.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
export type SpendAggregate = typeof spendAggregates.$inferSelect;
export type NewSpendAggregate = typeof spendAggregates.$inferInsert;
export type SpendEventRow = typeof spendEvents.$inferSelect;
export type NewSpendEventRow = typeof spendEvents.$inferInsert;
export type SyncRunRow = typeof syncRuns.$inferSelect;
export type NewSyncRunRow = typeof syncRuns.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SavedView = typeof savedViews.$inferSelect;
export type NewSavedView = typeof savedViews.$inferInsert;
export type AlertSubscription = typeof alertSubscriptions.$inferSelect;
export type NewAlertSubscription = typeof alertSubscriptions.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type CoverageRequest = typeof coverageRequests.$inferSelect;
export type NewCoverageRequest = typeof coverageRequests.$inferInsert;
