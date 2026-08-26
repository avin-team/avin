CREATE TYPE "public"."protection_risk_email_delivery_status" AS ENUM('pending', 'retrying', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_evidence_kind" AS ENUM('PAYMENT_PROOF', 'CONVERSATION', 'SCREENSHOT', 'VIDEO', 'OWNERSHIP_PROOF', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_evidence_scan_status" AS ENUM('PENDING', 'CLEAN', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_identifier_type" AS ENUM('BANK_ACCOUNT', 'WALLET_ACCOUNT', 'PHONE', 'WEBSITE', 'SOCIAL_ACCOUNT', 'PLATFORM_ACCOUNT');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_report_status" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'PUBLISHED', 'CORRECTED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_report_type" AS ENUM('BANK_WALLET_PHONE', 'MALICIOUS_WEBSITE', 'SOCIAL_GAME_ACCOUNT');--> statement-breakpoint
CREATE TABLE "protection_risk_evidence" (
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"file_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"immutable_at" timestamp DEFAULT now() NOT NULL,
	"kind" "protection_risk_evidence_kind" NOT NULL,
	"original_storage_key" text NOT NULL,
	"report_id" uuid NOT NULL,
	"scan_reason" text,
	"scan_status" "protection_risk_evidence_scan_status" DEFAULT 'PENDING' NOT NULL,
	"sha256" text,
	"size_bytes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_risk_evidence_derivative" (
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata_removed" boolean DEFAULT false NOT NULL,
	"sha256" text,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"unrelated_pii_redacted" boolean DEFAULT false NOT NULL,
	"watermark_applied" boolean DEFAULT false NOT NULL,
	CONSTRAINT "protection_risk_evidence_derivative_evidence_id_unique" UNIQUE("evidence_id"),
	CONSTRAINT "protection_risk_evidence_derivative_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "protection_risk_identifier" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"masked_value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"public_value" text,
	"report_id" uuid NOT NULL,
	"type" "protection_risk_identifier_type" NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_risk_report" (
	"claimed_loss" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"narrative" text,
	"public_slug" text,
	"public_summary" text,
	"reporter_email" text NOT NULL,
	"reporter_name" text,
	"reporter_phone" text,
	"reporter_session_id" uuid NOT NULL,
	"reporter_zalo" text,
	"review_reason" text,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" text,
	"status" "protection_risk_report_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp,
	"type" "protection_risk_report_type" NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_risk_report_email_delivery" (
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"first_attempt_at" timestamp,
	"html_body" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_attempt_at" timestamp,
	"last_error" text,
	"next_attempt_at" timestamp NOT NULL,
	"recipient_email" text NOT NULL,
	"report_id" uuid NOT NULL,
	"retry_window_started_at" timestamp NOT NULL,
	"status" "protection_risk_email_delivery_status" DEFAULT 'pending' NOT NULL,
	"subject" text NOT NULL,
	"text_body" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_risk_report_history" (
	"actor_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"reason" text,
	"report_id" uuid NOT NULL,
	"status" "protection_risk_report_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_risk_reporter_session" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text,
	"last_used_at" timestamp,
	"token_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_risk_evidence" ADD CONSTRAINT "protection_risk_evidence_report_id_protection_risk_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_evidence_derivative" ADD CONSTRAINT "protection_risk_evidence_derivative_evidence_id_protection_risk_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."protection_risk_evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_identifier" ADD CONSTRAINT "protection_risk_identifier_report_id_protection_risk_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD CONSTRAINT "protection_risk_report_reporter_session_id_protection_risk_reporter_session_id_fk" FOREIGN KEY ("reporter_session_id") REFERENCES "public"."protection_risk_reporter_session"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD CONSTRAINT "protection_risk_report_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_report_email_delivery" ADD CONSTRAINT "protection_risk_report_email_delivery_report_id_protection_risk_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_report_history" ADD CONSTRAINT "protection_risk_report_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_report_history" ADD CONSTRAINT "protection_risk_report_history_report_id_protection_risk_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_evidence_storage_key_idx" ON "protection_risk_evidence" USING btree ("original_storage_key");--> statement-breakpoint
CREATE INDEX "protection_risk_evidence_report_idx" ON "protection_risk_evidence" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "protection_risk_evidence_derivative_storage_idx" ON "protection_risk_evidence_derivative" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "protection_risk_identifier_report_idx" ON "protection_risk_identifier" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "protection_risk_identifier_lookup_idx" ON "protection_risk_identifier" USING btree ("type","normalized_value");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_report_public_slug_idx" ON "protection_risk_report" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "protection_risk_report_status_idx" ON "protection_risk_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protection_risk_report_submitted_idx" ON "protection_risk_report" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "protection_risk_report_reporter_session_idx" ON "protection_risk_report" USING btree ("reporter_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_email_delivery_event_unique_idx" ON "protection_risk_report_email_delivery" USING btree ("report_id","event_type","recipient_email");--> statement-breakpoint
CREATE INDEX "protection_risk_email_delivery_claim_idx" ON "protection_risk_report_email_delivery" USING btree ("status","next_attempt_at","claimed_at");--> statement-breakpoint
CREATE INDEX "protection_risk_report_history_report_idx" ON "protection_risk_report_history" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_reporter_session_email_hash_idx" ON "protection_risk_reporter_session" USING btree ("email_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_reporter_session_token_hash_idx" ON "protection_risk_reporter_session" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "protection_risk_reporter_session_expires_idx" ON "protection_risk_reporter_session" USING btree ("expires_at");