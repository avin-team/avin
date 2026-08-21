CREATE TYPE "public"."protection_provider_risk_incident_status" AS ENUM('AWAITING_PROVIDER_RESPONSE', 'PROVIDER_RESPONDED', 'RESPONSE_EXPIRED', 'UNDER_REVIEW', 'DISMISSED', 'CONFIRMED_FRAUD');--> statement-breakpoint
CREATE TABLE "protection_provider_risk_incident" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notice_verified_at" timestamp NOT NULL,
	"provider_profile_id" uuid NOT NULL,
	"provider_profile_version_id" uuid NOT NULL,
	"provider_responded_at" timestamp,
	"provider_response" text,
	"provider_user_id" text NOT NULL,
	"response_deadline_at" timestamp NOT NULL,
	"review_reason" text,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" text,
	"risk_report_id" uuid NOT NULL,
	"status" "protection_provider_risk_incident_status" DEFAULT 'AWAITING_PROVIDER_RESPONSE' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_provider_risk_incident_evidence" (
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"file_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"immutable_at" timestamp DEFAULT now() NOT NULL,
	"incident_id" uuid NOT NULL,
	"kind" "protection_risk_evidence_kind" NOT NULL,
	"original_storage_key" text NOT NULL,
	"scan_reason" text,
	"scan_status" "protection_risk_evidence_scan_status" DEFAULT 'PENDING' NOT NULL,
	"sha256" text,
	"size_bytes" integer NOT NULL,
	CONSTRAINT "protection_provider_risk_incident_evidence_original_storage_key_unique" UNIQUE("original_storage_key")
);
--> statement-breakpoint
CREATE TABLE "protection_provider_risk_incident_history" (
	"actor_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"reason" text,
	"status" "protection_provider_risk_incident_status" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident" ADD CONSTRAINT "protection_provider_risk_incident_provider_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("provider_profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident" ADD CONSTRAINT "protection_provider_risk_incident_provider_profile_version_id_protection_provider_profile_version_id_fk" FOREIGN KEY ("provider_profile_version_id") REFERENCES "public"."protection_provider_profile_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident" ADD CONSTRAINT "protection_provider_risk_incident_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident" ADD CONSTRAINT "protection_provider_risk_incident_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident" ADD CONSTRAINT "protection_provider_risk_incident_risk_report_id_protection_risk_report_id_fk" FOREIGN KEY ("risk_report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident_evidence" ADD CONSTRAINT "protection_provider_risk_incident_evidence_incident_id_protection_provider_risk_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."protection_provider_risk_incident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident_history" ADD CONSTRAINT "protection_provider_risk_incident_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident_history" ADD CONSTRAINT "protection_provider_risk_incident_history_incident_id_protection_provider_risk_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."protection_provider_risk_incident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "protection_provider_risk_incident_report_profile_idx" ON "protection_provider_risk_incident" USING btree ("risk_report_id","provider_profile_id");--> statement-breakpoint
CREATE INDEX "protection_provider_risk_incident_provider_status_idx" ON "protection_provider_risk_incident" USING btree ("provider_user_id","status");--> statement-breakpoint
CREATE INDEX "protection_provider_risk_incident_deadline_idx" ON "protection_provider_risk_incident" USING btree ("status","response_deadline_at");--> statement-breakpoint
CREATE INDEX "protection_provider_risk_incident_report_idx" ON "protection_provider_risk_incident" USING btree ("risk_report_id");--> statement-breakpoint
CREATE INDEX "protection_provider_risk_incident_evidence_incident_idx" ON "protection_provider_risk_incident_evidence" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "protection_provider_risk_incident_history_incident_idx" ON "protection_provider_risk_incident_history" USING btree ("incident_id","created_at");