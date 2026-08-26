ALTER TABLE "protection_provider_deposit_intent" ADD COLUMN "matched_source_event_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_deposit_intent" ADD COLUMN "refund_bank_reference" text;--> statement-breakpoint
ALTER TABLE "protection_provider_deposit_intent" ADD COLUMN "refund_destination" text;--> statement-breakpoint
ALTER TABLE "protection_provider_deposit_intent" ADD COLUMN "refunded_at" timestamp;