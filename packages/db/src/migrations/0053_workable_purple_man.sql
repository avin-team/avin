CREATE TABLE "protection_external_import_run" (
	"actor_user_id" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"evidence_downloaded_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"full_reconcile" boolean DEFAULT false NOT NULL,
	"hidden_count" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" text NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_risk_evidence" ADD COLUMN "external_evidence_id" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_admin_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_bank_name" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_import_run_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_payload_hash" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_platform_url" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_raw_payload" jsonb;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_source_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_source_id" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_source_status" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_source_url" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_suspect_name" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "external_title" text;--> statement-breakpoint
ALTER TABLE "protection_external_import_run" ADD CONSTRAINT "protection_external_import_run_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_external_import_run_created_idx" ON "protection_external_import_run" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "protection_external_import_run_status_idx" ON "protection_external_import_run" USING btree ("status");--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD CONSTRAINT "protection_risk_report_external_import_run_id_protection_external_import_run_id_fk" FOREIGN KEY ("external_import_run_id") REFERENCES "public"."protection_external_import_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_risk_evidence_external_idx" ON "protection_risk_evidence" USING btree ("report_id","external_evidence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_report_external_source_idx" ON "protection_risk_report" USING btree ("external_source","external_source_id");--> statement-breakpoint
CREATE INDEX "protection_risk_report_external_hidden_idx" ON "protection_risk_report" USING btree ("external_admin_hidden","external_source");