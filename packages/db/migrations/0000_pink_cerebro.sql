CREATE TYPE "public"."alert_channel" AS ENUM('email');--> statement-breakpoint
CREATE TYPE "public"."alert_delivery_status" AS ENUM('sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."alert_frequency" AS ENUM('instant', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('vendor-paid', 'category-spike', 'threshold');--> statement-breakpoint
CREATE TYPE "public"."cadence" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."coverage_status" AS ENUM('requested', 'planned', 'live', 'declined');--> statement-breakpoint
CREATE TYPE "public"."dataset_status" AS ENUM('active', 'paused', 'broken');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'business');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('socrata', 'opengov', 'csv', 'browser');--> statement-breakpoint
CREATE TYPE "public"."record_type" AS ENUM('transaction', 'budget', 'contract');--> statement-breakpoint
CREATE TYPE "public"."spend_event_type" AS ENUM('vendor-payment', 'threshold-exceeded', 'spending-spike', 'sole-source-pattern');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('success', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"saved_view_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "alert_type" NOT NULL,
	"frequency" "alert_frequency" DEFAULT 'instant' NOT NULL,
	"channel" "alert_channel" DEFAULT 'email' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"alert_subscription_id" text,
	"saved_view_id" text,
	"spend_event_id" text,
	"channel" "alert_channel" DEFAULT 'email' NOT NULL,
	"status" "alert_delivery_status" NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"fiscal_year" integer,
	"department_normalized" text,
	"category" text,
	"amount_budgeted" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source_url" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"vendor_id" text,
	"vendor_name_raw" text DEFAULT '' NOT NULL,
	"vendor_name_normalized" text DEFAULT '' NOT NULL,
	"amount" numeric(18, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"term_start" date,
	"term_end" date,
	"contract_type" text,
	"procurement_method" text,
	"description" text,
	"source_url" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coverage_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text,
	"jurisdiction_name" text NOT NULL,
	"state" text,
	"note" text,
	"status" "coverage_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL,
	"type" text DEFAULT 'city' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_alert" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "spend_aggregates" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"dimension" text NOT NULL,
	"dimension_key" text,
	"period" text,
	"fiscal_year" integer,
	"total" numeric(18, 2) NOT NULL,
	"txn_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spend_datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"portal_base_url" text NOT NULL,
	"dataset_id" text,
	"api_token_ref" text,
	"field_mapping" jsonb NOT NULL,
	"record_type" "record_type" NOT NULL,
	"cadence" "cadence" NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"fiscal_year_start_month" integer DEFAULT 7 NOT NULL,
	"soql_where" text,
	"date_column" text,
	"source_url_template" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"status" "dataset_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spend_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "spend_event_type" NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"vendor_id" text,
	"vendor_name" text,
	"department" text,
	"category" text,
	"period" text,
	"amount" numeric(16, 2),
	"value" numeric(18, 2) NOT NULL,
	"occurred_at" date,
	"detail" jsonb,
	"dedupe_key" text NOT NULL,
	"watch_id" text,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"dataset_id" text,
	"platform" "platform" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"rows_seen" integer DEFAULT 0 NOT NULL,
	"rows_new" integer DEFAULT 0 NOT NULL,
	"rows_updated" integer DEFAULT 0 NOT NULL,
	"mapping_errors" integer DEFAULT 0 NOT NULL,
	"status" "sync_status" NOT NULL,
	"anomalous" boolean DEFAULT false NOT NULL,
	"anomaly_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"dataset_id" text,
	"vendor_id" text,
	"department_id" text,
	"source_record_id" text,
	"vendor_name_raw" text DEFAULT '' NOT NULL,
	"vendor_name_normalized" text DEFAULT '' NOT NULL,
	"vendor_city" text,
	"vendor_state" text,
	"vendor_zip" text,
	"department_raw" text,
	"department_normalized" text,
	"category" text,
	"fund" text,
	"account" text,
	"amount" numeric(16, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"transaction_date" date,
	"fiscal_year" integer,
	"payment_method" text,
	"po_number" text,
	"procurement_method" text,
	"procurement_method_raw" text,
	"description" text,
	"source_url" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"raw_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period" text NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"city" text,
	"state" text,
	"zip" text,
	"match_confidence" double precision DEFAULT 1 NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"total_paid" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_saved_view_id_saved_views_id_fk" FOREIGN KEY ("saved_view_id") REFERENCES "public"."saved_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_alert_subscription_id_alert_subscriptions_id_fk" FOREIGN KEY ("alert_subscription_id") REFERENCES "public"."alert_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_saved_view_id_saved_views_id_fk" FOREIGN KEY ("saved_view_id") REFERENCES "public"."saved_views"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_spend_event_id_spend_events_id_fk" FOREIGN KEY ("spend_event_id") REFERENCES "public"."spend_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_aggregates" ADD CONSTRAINT "spend_aggregates_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_datasets" ADD CONSTRAINT "spend_datasets_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_events" ADD CONSTRAINT "spend_events_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_dataset_id_spend_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."spend_datasets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alert_subscriptions_view_idx" ON "alert_subscriptions" USING btree ("saved_view_id");--> statement-breakpoint
CREATE INDEX "alert_subscriptions_active_idx" ON "alert_subscriptions" USING btree ("is_active","type");--> statement-breakpoint
CREATE INDEX "alerts_user_idx" ON "alerts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_dedupe_uq" ON "alerts" USING btree ("user_id","saved_view_id","spend_event_id");--> statement-breakpoint
CREATE INDEX "budgets_jurisdiction_fy_idx" ON "budgets" USING btree ("jurisdiction_id","fiscal_year");--> statement-breakpoint
CREATE INDEX "contracts_jurisdiction_idx" ON "contracts" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "contracts_vendor_idx" ON "contracts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "coverage_requests_status_idx" ON "coverage_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_jurisdiction_norm_uq" ON "departments" USING btree ("jurisdiction_id","normalized_name");--> statement-breakpoint
CREATE INDEX "departments_jurisdiction_idx" ON "departments" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "jurisdictions_state_idx" ON "jurisdictions" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uq" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_user_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_views_user_idx" ON "saved_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spend_aggregates_uq" ON "spend_aggregates" USING btree ("jurisdiction_id","dimension","dimension_key","period","fiscal_year");--> statement-breakpoint
CREATE INDEX "spend_aggregates_lookup_idx" ON "spend_aggregates" USING btree ("jurisdiction_id","dimension");--> statement-breakpoint
CREATE INDEX "spend_datasets_jurisdiction_idx" ON "spend_datasets" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "spend_datasets_active_idx" ON "spend_datasets" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "spend_events_dedupe_uq" ON "spend_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "spend_events_processed_idx" ON "spend_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "spend_events_jurisdiction_idx" ON "spend_events" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_uq" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_subscription_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "sync_runs_dataset_idx" ON "sync_runs" USING btree ("jurisdiction_id","dataset_id");--> statement-breakpoint
CREATE INDEX "sync_runs_status_idx" ON "sync_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_runs_created_idx" ON "sync_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transactions_jurisdiction_date_idx" ON "transactions" USING btree ("jurisdiction_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_vendor_idx" ON "transactions" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "transactions_vendor_date_idx" ON "transactions" USING btree ("vendor_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_department_norm_idx" ON "transactions" USING btree ("department_normalized");--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "transactions_fiscal_year_idx" ON "transactions" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "transactions_amount_idx" ON "transactions" USING btree ("amount");--> statement-breakpoint
CREATE INDEX "transactions_dataset_idx" ON "transactions" USING btree ("dataset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_uq" ON "usage_counters" USING btree ("user_id","period","key");--> statement-breakpoint
CREATE INDEX "vendors_normalized_name_idx" ON "vendors" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "vendors_state_idx" ON "vendors" USING btree ("state");