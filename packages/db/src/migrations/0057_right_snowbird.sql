CREATE TYPE "public"."protection_risk_identifier_role" AS ENUM('ACCUSED_COUNTERPARTY', 'PAYMENT_DESTINATION', 'INTERMEDIARY', 'CONTACT_CHANNEL', 'LISTING_STORE', 'REPORTED_ASSET', 'IMPERSONATED_IDENTITY');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_loss_occurrence" AS ENUM('YES', 'NO', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_reporter_involvement" AS ENUM('BUYER', 'SELLER', 'INTERMEDIARY', 'AUTHORIZED_REPRESENTATIVE', 'DIRECT_OBSERVER');--> statement-breakpoint
ALTER TYPE "public"."protection_risk_evidence_kind" ADD VALUE 'DELIVERY_PROOF' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."protection_risk_evidence_kind" ADD VALUE 'REVERSAL_NOTICE' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."protection_risk_evidence_kind" ADD VALUE 'HANDOVER_PROOF' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."protection_risk_evidence_kind" ADD VALUE 'ACCESS_LOSS_PROOF' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."protection_risk_evidence_kind" ADD VALUE 'GENUINE_REFERENCE' BEFORE 'OTHER';--> statement-breakpoint
CREATE TABLE "protection_risk_report_revision" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"submitted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_risk_transaction" (
	"amount" numeric(36, 12) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency_or_asset" text NOT NULL,
	"destination_identifier_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"payment_method" text NOT NULL,
	"reference" text,
	"report_id" uuid NOT NULL,
	"time_known" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_risk_evidence" ADD COLUMN "explanation" text;--> statement-breakpoint
ALTER TABLE "protection_risk_identifier" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "protection_risk_identifier" ADD COLUMN "holder_name" text;--> statement-breakpoint
ALTER TABLE "protection_risk_identifier" ADD COLUMN "institution_name" text;--> statement-breakpoint
ALTER TABLE "protection_risk_identifier" ADD COLUMN "namespace" text;--> statement-breakpoint
ALTER TABLE "protection_risk_identifier" ADD COLUMN "role" "protection_risk_identifier_role" DEFAULT 'ACCUSED_COUNTERPARTY' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "attestation_version" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "attested_at" timestamp;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "incident_at" timestamp;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "incident_date_approximate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "issues" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "loss_occurred" "protection_risk_loss_occurrence";--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "ongoing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "other_issue_description" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "private_note" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "public_narrative" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "public_packet_previewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "reporter_involvement" "protection_risk_reporter_involvement";--> statement-breakpoint
ALTER TABLE "protection_risk_report_revision" ADD CONSTRAINT "protection_risk_report_revision_report_id_protection_risk_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_transaction" ADD CONSTRAINT "protection_risk_transaction_destination_identifier_id_protection_risk_identifier_id_fk" FOREIGN KEY ("destination_identifier_id") REFERENCES "public"."protection_risk_identifier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_transaction" ADD CONSTRAINT "protection_risk_transaction_report_id_protection_risk_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_report_revision_number_idx" ON "protection_risk_report_revision" USING btree ("report_id","revision_number");--> statement-breakpoint
CREATE INDEX "protection_risk_report_revision_submitted_idx" ON "protection_risk_report_revision" USING btree ("report_id","submitted_at");--> statement-breakpoint
CREATE INDEX "protection_risk_transaction_report_idx" ON "protection_risk_transaction" USING btree ("report_id","occurred_at");--> statement-breakpoint
CREATE INDEX "protection_risk_identifier_role_lookup_idx" ON "protection_risk_identifier" USING btree ("role","type","namespace","normalized_value");