CREATE TYPE "public"."protection_support_review_public_outcome" AS ENUM('UNDER_VERIFICATION', 'INELIGIBLE', 'HANDLED_BY_PROVIDER', 'HANDLED_BY_PROGRAM', 'VIOLATION_CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."protection_support_review_status" AS ENUM('ELIGIBILITY_REVIEW', 'INELIGIBLE', 'ELIGIBLE', 'PENDING_APPROVAL', 'APPROVED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."protection_support_transaction_channel" AS ENUM('FACEBOOK', 'ZALO', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."protection_support_transaction_scope" AS ENUM('DIRECT', 'IMPERSONATOR', 'INDIRECT', 'GDV', 'WEBSITE_OPERATED', 'AGENT_DEPOSIT', 'LENDING', 'LOWER_PRIORITY_GROUP', 'OUT_OF_SCOPE');--> statement-breakpoint
CREATE TABLE "protection_support_review" (
	"approval_reason" text,
	"approved_at" timestamp,
	"approved_by_user_id" text,
	"approved_service_confirmed" boolean,
	"bond_adjustment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"eligibility_reason" text,
	"evidence_sufficient" boolean,
	"external_action_reference" text,
	"historical_recommended_transaction_limit" integer,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"ineligibility_reason" text,
	"outcome_reason" text,
	"outcome_recorded_at" timestamp,
	"outcome_recorded_by_user_id" text,
	"pre_transaction_video_present" boolean,
	"private_evidence_reference" text,
	"profile_id" uuid NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"provider_identity_confirmed" boolean,
	"provider_user_id" text NOT NULL,
	"public_outcome" "protection_support_review_public_outcome",
	"recommended_support_amount" integer,
	"reconsideration_count" integer DEFAULT 0 NOT NULL,
	"reconsideration_evidence_reference" text,
	"reconsideration_reason" text,
	"reconsidered_at" timestamp,
	"registered_payment_identity_confirmed" boolean,
	"required_process_completed" boolean,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" text,
	"risk_report_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"started_by_user_id" text NOT NULL,
	"status" "protection_support_review_status" DEFAULT 'ELIGIBILITY_REVIEW' NOT NULL,
	"support_amount" integer,
	"transaction_channel" "protection_support_transaction_channel",
	"transaction_lawful_confirmed" boolean,
	"transaction_occurred_at" timestamp,
	"transaction_profile_version_id" uuid,
	"transaction_scope" "protection_support_transaction_scope",
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verified_actual_loss" integer,
	CONSTRAINT "protection_support_review_incident_id_unique" UNIQUE("incident_id")
);
--> statement-breakpoint
CREATE TABLE "protection_support_review_history" (
	"actor_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason" text,
	"status" "protection_support_review_status" NOT NULL,
	"support_review_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_bond_adjustment_id_protection_provider_bond_adjustment_id_fk" FOREIGN KEY ("bond_adjustment_id") REFERENCES "public"."protection_provider_bond_adjustment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_incident_id_protection_provider_risk_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."protection_provider_risk_incident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_outcome_recorded_by_user_id_user_id_fk" FOREIGN KEY ("outcome_recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_profile_version_id_protection_provider_profile_version_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."protection_provider_profile_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_risk_report_id_protection_risk_report_id_fk" FOREIGN KEY ("risk_report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_started_by_user_id_user_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_transaction_profile_version_id_protection_provider_profile_version_id_fk" FOREIGN KEY ("transaction_profile_version_id") REFERENCES "public"."protection_provider_profile_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review_history" ADD CONSTRAINT "protection_support_review_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review_history" ADD CONSTRAINT "protection_support_review_history_support_review_id_protection_support_review_id_fk" FOREIGN KEY ("support_review_id") REFERENCES "public"."protection_support_review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_support_review_profile_status_idx" ON "protection_support_review" USING btree ("profile_id","status","created_at");--> statement-breakpoint
CREATE INDEX "protection_support_review_report_idx" ON "protection_support_review" USING btree ("risk_report_id");--> statement-breakpoint
CREATE INDEX "protection_support_review_status_idx" ON "protection_support_review" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "protection_support_review_provider_status_idx" ON "protection_support_review" USING btree ("provider_user_id","status");--> statement-breakpoint
CREATE INDEX "protection_support_review_history_review_idx" ON "protection_support_review_history" USING btree ("support_review_id","created_at");