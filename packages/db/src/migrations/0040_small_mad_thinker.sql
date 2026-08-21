CREATE TYPE "public"."protection_risk_report_urgency" AS ENUM('NORMAL', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."protection_risk_report_website_violation" AS ENUM('PHISHING', 'MALWARE', 'IMPERSONATION', 'FAKE_STORE', 'PAYMENT_SCAM', 'OTHER');--> statement-breakpoint
ALTER TYPE "public"."protection_risk_report_status" ADD VALUE 'UNDER_VERIFICATION';--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "affected_victim_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "under_verification_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "urgency" "protection_risk_report_urgency" DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "violation_type" "protection_risk_report_website_violation";