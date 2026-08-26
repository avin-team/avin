DROP INDEX "protection_risk_email_delivery_event_unique_idx";--> statement-breakpoint
ALTER TABLE "protection_risk_report_email_delivery" ALTER COLUMN "report_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report_email_delivery" ADD COLUMN "source_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_risk_report_email_delivery" ADD COLUMN "source_type" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "protection_risk_email_delivery_event_unique_idx" ON "protection_risk_report_email_delivery" USING btree ("source_type","source_id","event_type","recipient_email");