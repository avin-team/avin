CREATE TYPE "public"."protection_risk_correction_status" AS ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_report_withdrawal_status" AS ENUM('NONE', 'REQUESTED', 'APPROVED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_reporter_relationship" AS ENUM('NO_PROVIDER_RELATIONSHIP', 'SELF_PROVIDER', 'OTHER_PROVIDER');--> statement-breakpoint
CREATE TABLE "protection_provider_ownership_change" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"from_user_id" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_evidence_reference" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"to_user_id" text NOT NULL,
	"transferred_by_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_risk_correction_request" (
	"authority_evidence_reference" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason" text NOT NULL,
	"report_id" uuid NOT NULL,
	"requester_email" text NOT NULL,
	"requester_name" text NOT NULL,
	"requester_relationship" text NOT NULL,
	"requester_user_id" text,
	"review_reason" text,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" text,
	"status" "protection_risk_correction_status" DEFAULT 'REQUESTED' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_risk_reporter_session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "protection_risk_reporter_session" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'BUYER'::text;--> statement-breakpoint
DROP TYPE "public"."account_role";--> statement-breakpoint
CREATE TYPE "public"."account_role" AS ENUM('BUYER', 'SELLER', 'ADMIN');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'BUYER'::"public"."account_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."account_role" USING "role"::"public"."account_role";--> statement-breakpoint
DROP INDEX "protection_risk_report_reporter_session_idx";--> statement-breakpoint
ALTER TABLE "protection_provider_profile" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "possible_duplicate_of_report_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "reporter_relationship" "protection_risk_reporter_relationship";--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "reporter_user_id" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "withdrawal_reason" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "withdrawal_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "withdrawal_status" "protection_risk_report_withdrawal_status" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_ownership_change" ADD CONSTRAINT "protection_provider_ownership_change_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_ownership_change" ADD CONSTRAINT "protection_provider_ownership_change_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_ownership_change" ADD CONSTRAINT "protection_provider_ownership_change_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_ownership_change" ADD CONSTRAINT "protection_provider_ownership_change_transferred_by_user_id_user_id_fk" FOREIGN KEY ("transferred_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_correction_request" ADD CONSTRAINT "protection_risk_correction_request_report_id_protection_risk_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."protection_risk_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_correction_request" ADD CONSTRAINT "protection_risk_correction_request_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_correction_request" ADD CONSTRAINT "protection_risk_correction_request_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_provider_ownership_change_profile_idx" ON "protection_provider_ownership_change" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_ownership_change_target_idx" ON "protection_provider_ownership_change" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_risk_correction_report_idx" ON "protection_risk_correction_request" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_risk_correction_requester_idx" ON "protection_risk_correction_request" USING btree ("requester_user_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_risk_correction_status_idx" ON "protection_risk_correction_request" USING btree ("status");--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD CONSTRAINT "protection_risk_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_risk_report_reporter_user_idx" ON "protection_risk_report" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "protection_risk_report_duplicate_idx" ON "protection_risk_report" USING btree ("possible_duplicate_of_report_id");--> statement-breakpoint
CREATE INDEX "protection_risk_report_withdrawal_idx" ON "protection_risk_report" USING btree ("withdrawal_status","withdrawal_requested_at");--> statement-breakpoint
ALTER TABLE "protection_risk_report" DROP COLUMN "reporter_session_id";
